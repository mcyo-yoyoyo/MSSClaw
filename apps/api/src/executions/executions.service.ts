import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AgentType,
  ExecutionAssetType,
  ExecutionSource,
  ExecutionStep,
  ExecutionUsage,
  StreamEvent,
  StreamExecutionRequest,
} from './dto/stream-execution.dto';
import {
  nestLlmConfigFromCandidate,
  nestLlmConfigFromDoc,
  nestLlmConfigFromEnv,
  nestLlmExecutionStream,
  type NestLlmRuntimeConfig,
} from './llm.client';
import { portalAnalyticsDateKey } from '../persistence/portal-analytics-time';

const MARKETING_STEPS: ExecutionStep[] = [
  { skill: 'Intent_Parser', time: '120ms', label: '多模态意图识别', detail: '解析群聊上下文，提取实体与 Action。' },
  { skill: 'SQL_Generator', time: '850ms', label: '自动路由与取数', detail: '通过 OData 并发拉取 SAP 与 Salesforce 明细。' },
  { skill: 'Data_Sanitizer', time: '45ms', label: '隐私合规脱敏', detail: '触发 GDPR 数据护栏，屏蔽 PII。' },
  { skill: 'Python_Sandbox', time: '2.1s', label: '执行归因算法容器', detail: 'SHAPAnalyzer 输出特征权重。' },
  { skill: 'Report_Renderer', time: '350ms', label: '大屏与策略生成', detail: '渲染看板并生成 NBA 策略。' },
];

const KNOWLEDGE_STEPS: ExecutionStep[] = [
  { skill: 'Query_Rewriter', time: '180ms', label: '提问重写与对齐', detail: '映射口语到 3C 规范术语。' },
  { skill: 'Vector_Search', time: '420ms', label: 'Milvus 高维检索', detail: 'Top-K 召回 15 个文档块。' },
  { skill: 'Cross_Encoder', time: '360ms', label: 'Rerank 语义重排', detail: '保留 Top-3 核心参考源。' },
  { skill: 'Knowledge_Synthesizer', time: '820ms', label: '抗幻觉摘要生成', detail: '注入溯源锚点并生成回答。' },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeLlmTestError(message: string): string {
  const status = message.match(/^LLM stream HTTP (\d{3})/i)?.[1];
  if (status) return `模型接口返回 HTTP ${status}。`;
  if (/abort|timeout|timed out/i.test(message)) return '模型流式测试超时或被中断。';
  return '服务端模型流式请求失败，请检查 Base URL、网络和 API Key。';
}

function resolveAgentType(chatId: string, message: string): AgentType {
  const marketingChats = new Set(['marketing', 'group_q3', 'campaign_ops', 'insight_agent']);
  if (marketingChats.has(chatId)) return 'marketing';
  if (message.includes('@知识') || message.includes('合规') || message.includes('RAG')) return 'knowledge';
  return chatId === 'knowledge' || chatId === 'rd_rag' ? 'knowledge' : 'marketing';
}

function buildReplyTokens(agentType: AgentType, query: string) {
  const previewHint =
    agentType === 'marketing'
      ? '点击查看右侧沙盒生成的交互看板及 NBA 策略'
      : '阅读右侧结构化解答及文献溯源卡片';
  const colorClass = agentType === 'marketing' ? 'text-indigo-600' : 'text-emerald-600';
  const snippet = query.length > 15 ? `${query.slice(0, 15)}...` : query;
  const plain = `✅ **任务完成。** 针对需求 *"${snippet}"*，Agent 已完成处理。\n\n👉 ${previewHint}。`;
  return plain.replace(previewHint, `<span class="${colorClass} font-bold">${previewHint}</span>`);
}

function getAgentName(chatId: string, agentType: AgentType) {
  const byChat: Record<string, string> = {
    marketing: '营销 Agent',
    knowledge: '知识 Agent',
    insight_agent: '洞察 Agent',
    rd_rag: '研发 RAG Agent',
  };
  return byChat[chatId] ?? (agentType === 'marketing' ? '营销 Agent' : '知识 Agent');
}

function planStepsToExecutionSteps(steps: string[]): ExecutionStep[] {
  return steps.map((label, i) => ({
    skill: `PlanStep_${i + 1}`,
    time: `${120 + i * 90}ms`,
    label,
    detail: label,
  }));
}

type ExecutionRecord = {
  id: string;
  workspaceId: string;
  chatId: string;
  message: string;
  agentType: AgentType;
  agentName: string;
  status: 'running' | 'done' | 'error' | 'aborted';
  source?: ExecutionSource;
  startedAt: string;
  finishedAt?: string;
  totalTime?: string;
  steps?: ExecutionStep[];
  error?: string;
  assetId: string;
  assetType: ExecutionAssetType;
  usage?: ExecutionUsage;
  /** Controller-resolved only; stripped before the record is exposed via list(). */
  userId?: string;
};

function normalizeAssetType(value: unknown): ExecutionAssetType {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'tool' || normalized === 'skill' || normalized === 'agent'
    ? normalized
    : 'unknown';
}

function normalizeAssetId(value: unknown): string {
  const id = String(value ?? '').trim();
  if (!id || id.length > 200 || /[\u0000-\u001f\u007f]/.test(id)) return '';
  return id;
}

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, limit = 50) {
    const rows = await this.prisma.centerRecord.findMany({
      where: { workspaceId, kind: 'execution' },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return {
      executions: rows.map((r) => r.payload as unknown as ExecutionRecord),
    };
  }

  async *createStream(params: StreamExecutionRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    if (signal?.aborted) return;

    const workspaceId = params.workspaceId || 'ws-mss-ai';
    const agentType = params.actionType ?? resolveAgentType(params.chatId, params.message);
    const agentName =
      params.agentName?.trim() || getAgentName(params.chatId, agentType);
    const assetId = normalizeAssetId(params.assetId) || `chat:${normalizeAssetId(params.chatId) || 'unknown'}`;
    const assetType = normalizeAssetType(params.assetType);
    const userId = normalizeAssetId(params.userId) || undefined;
    const planSteps = (params.planSteps ?? []).map((s) => s.trim()).filter(Boolean);
    const executionId = `exec_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const startedAt = new Date().toISOString();
    const llmConfig = await this.resolveLlmConfig(workspaceId, params.model);
    const allowScripted =
      process.env.ALLOW_SCRIPTED_EXECUTION === '1' ||
      process.env.ALLOW_SCRIPTED_EXECUTION === 'true';

    if (!llmConfig && !allowScripted) {
      const failed: ExecutionRecord = {
        id: executionId,
        workspaceId,
        chatId: params.chatId,
        message: params.message.slice(0, 2000),
        agentType,
        agentName,
        status: 'error',
        source: 'llm',
        startedAt,
        finishedAt: new Date().toISOString(),
        error: 'llm_not_configured',
        assetId,
        assetType,
        userId,
      };
      await this.saveRecord(failed);
      yield {
        type: 'error',
        message:
          '未配置模型：请设置服务端 LLM_BASE_URL + LLM_API_KEY，或在前端「模型与 API」保存工作区共享配置。已禁止无模型脚本假完成。',
      };
      return;
    }

    const useLlm = llmConfig != null;
    const source: ExecutionSource = useLlm ? 'llm' : 'scripted';

    const base: ExecutionRecord = {
      id: executionId,
      workspaceId,
      chatId: params.chatId,
      message: params.message.slice(0, 2000),
      agentType,
      agentName,
      status: 'running',
      source,
      startedAt,
      assetId,
      assetType,
      userId,
    };
    await this.saveRecord(base);

    if (useLlm && llmConfig) {
      yield* this.runLlmStream(base, params, agentType, agentName, planSteps, llmConfig, signal);
      return;
    }

    yield* this.runScriptedStream(base, params, agentType, agentName, planSteps, signal);
  }

  /** 工作区模型凭证优先；未指定模型且工作区无凭证时才回退部署环境。 */
  private async resolveLlmConfig(
    workspaceId: string,
    requestedModel?: string,
  ): Promise<NestLlmRuntimeConfig | null> {
    const row = await this.prisma.centerRecord.findUnique({
      where: { id: `doc-llm-config-${workspaceId}` },
    });
    const fromDoc = nestLlmConfigFromDoc(row?.payload, requestedModel);
    if (fromDoc) return fromDoc;
    // A seeded/empty document should not disable deployment fallback. Once a
    // workspace has stored any key, however, a missing selected-model key is a
    // real configuration error rather than permission to mix credentials.
    // An explicit model is an assertion from the model page/chat selector;
    // never hide a missing per-model key behind the deployment fallback.
    const hasRequestedModel =
      typeof requestedModel === 'string' && requestedModel.trim().length > 0;
    if (hasRequestedModel || this.hasWorkspaceLlmCredential(row?.payload)) return null;
    return nestLlmConfigFromEnv();
  }

  /** 只判断是否存在任一工作区凭证，不读取或记录其内容。 */
  private hasWorkspaceLlmCredential(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    const p = payload as Record<string, unknown>;
    if (typeof p.apiKey === 'string' && p.apiKey.trim()) return true;
    for (const list of [p.platformModels, p.customModels]) {
      if (!Array.isArray(list)) continue;
      if (list.some((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const key = (item as Record<string, unknown>).apiKey;
        return typeof key === 'string' && key.trim().length > 0;
      })) return true;
    }
    return false;
  }

  async testLlmConnection(
    workspaceId: string,
    requestedModel?: string,
    candidate?: { model?: unknown; baseUrl?: unknown; apiKey?: unknown },
  ): Promise<{
    ok: true;
    model: string;
    source: NestLlmRuntimeConfig['source'];
    message: string;
  } | {
    ok: false;
    errorCode: string;
    message: string;
  }> {
    const hasCandidate = candidate != null;
    const candidateConfig = hasCandidate ? nestLlmConfigFromCandidate(candidate) : null;
    if (hasCandidate && !candidateConfig) {
      return {
        ok: false,
        errorCode: 'llm_test_config_invalid',
        message: '测试配置不完整，请填写模型、Base URL 和 API Key。',
      };
    }
    const config = candidateConfig ?? await this.resolveLlmConfig(workspaceId, requestedModel);
    if (!config) {
      return {
        ok: false,
        errorCode: 'llm_not_configured',
        message: '当前工作区没有可用的模型凭证，请先保存并启用模型。',
      };
    }

    const controller = new AbortController();
    const timeoutMs = Math.max(1_000, Number(process.env.LLM_TEST_TIMEOUT_MS) || 15_000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let completed = false;
    let receivedToken = false;
    try {
      for await (const event of nestLlmExecutionStream({
        message: '连接测试：只需回复 OK。',
        actionType: 'knowledge',
        agentName: '模型连接测试',
        planSteps: ['连接模型服务'],
        signal: controller.signal,
        // Keep the probe cheap while exercising the exact stream transport.
        config: { ...config, maxTokens: 8 },
      })) {
        if (event.type === 'done') {
          completed = true;
          continue;
        }
        if (event.type === 'token' && event.content.trim()) {
          receivedToken = true;
          continue;
        }
        if (event.type === 'error') {
          return {
            ok: false,
            errorCode: 'llm_test_failed',
            message: safeLlmTestError(event.message),
          };
        }
      }
      if (!completed) {
        return {
          ok: false,
          errorCode: 'llm_test_timeout',
          message: '模型流式测试超时或被中断。',
        };
      }
      if (!receivedToken) {
        return {
          ok: false,
          errorCode: 'llm_test_empty_stream',
          message: '模型接口已连接，但没有返回可展示的流式内容。',
        };
      }
      return {
        ok: true,
        model: config.model,
        source: config.source,
        message: '服务端模型连接成功，流式执行可用。',
      };
    } catch {
      return {
        ok: false,
        errorCode: 'llm_test_failed',
        message: '服务端无法连接模型接口，请检查 Base URL、网络和 API Key。',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async *runLlmStream(
    base: ExecutionRecord,
    params: StreamExecutionRequest,
    agentType: AgentType,
    agentName: string,
    planSteps: string[],
    llmConfig: NestLlmRuntimeConfig,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    let terminal = false;
    try {
      for await (const event of nestLlmExecutionStream({
        message: params.message,
        actionType: agentType,
        agentName,
        systemPrompt: params.systemPrompt,
        planSteps: planSteps.length ? planSteps : undefined,
        kbContext: params.kbContext,
        signal,
        config: llmConfig,
      })) {
        if (signal?.aborted) {
          await this.saveRecord({
            ...base,
            status: 'aborted',
            finishedAt: new Date().toISOString(),
          });
          return;
        }

        if (event.type === 'execution_start') {
          yield { ...event, executionId: base.id, source: 'llm' };
          continue;
        }

        yield event;

        if (event.type === 'done') {
          terminal = true;
          await this.saveRecord({
            ...base,
            status: 'done',
            source: 'llm',
            finishedAt: new Date().toISOString(),
            totalTime: event.totalTime,
            steps: event.steps,
            usage: event.usage,
          });
        }
        if (event.type === 'error') {
          terminal = true;
          await this.saveRecord({
            ...base,
            status: 'error',
            source: 'llm',
            finishedAt: new Date().toISOString(),
            error: event.message,
            usage: event.usage,
          });
        }
      }
      if (!terminal && signal?.aborted) {
        await this.saveRecord({
          ...base,
          status: 'aborted',
          source: 'llm',
          finishedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'execution_failed';
      await this.saveRecord({
        ...base,
        status: 'error',
        source: 'llm',
        finishedAt: new Date().toISOString(),
        error: message,
      });
      yield { type: 'error', message };
    }
  }

  private async *runScriptedStream(
    base: ExecutionRecord,
    params: StreamExecutionRequest,
    agentType: AgentType,
    agentName: string,
    planSteps: string[],
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    const steps =
      planSteps.length > 0
        ? planStepsToExecutionSteps(planSteps)
        : agentType === 'marketing'
          ? MARKETING_STEPS
          : KNOWLEDGE_STEPS;

    yield { type: 'execution_start', executionId: base.id, source: 'scripted' };

    try {
      for (const step of steps) {
        if (signal?.aborted) {
          await this.saveRecord({
            ...base,
            status: 'aborted',
            finishedAt: new Date().toISOString(),
          });
          return;
        }
        yield { type: 'skill_start', skill: step.skill, label: step.label };
        await sleep(step.skill === 'Python_Sandbox' ? 480 : 220);
        if (signal?.aborted) {
          await this.saveRecord({
            ...base,
            status: 'aborted',
            finishedAt: new Date().toISOString(),
          });
          return;
        }
        yield { type: 'skill_end', skill: step.skill, latency: step.time };
      }

      const html = buildReplyTokens(agentType, params.message);
      const tokens = html.match(/(\*\*[^*]+\*\*|\*[^*]+\*|<span[^>]*>.*?<\/span>|[^\s]+|\s+)/g) ?? [html];
      for (const token of tokens) {
        if (signal?.aborted) {
          await this.saveRecord({
            ...base,
            status: 'aborted',
            finishedAt: new Date().toISOString(),
          });
          return;
        }
        yield { type: 'token', content: token };
        await sleep(28 + Math.floor(Math.random() * 22));
      }

      const totalTime = agentType === 'marketing' ? '4.28s' : '1.84s';
      yield { type: 'artifact', agentType };
      yield {
        type: 'done',
        totalTime,
        steps,
        agentName,
        source: 'scripted',
        followUp:
          params.chatId === 'group_q3'
            ? {
                role: 'other',
                name: 'Jacky (拉美地总)',
                avatar: 'bg-pink-500',
                text: '看到了，友商A降价影响这么大。产品这边确认下沙盒里生成的NBA补贴券策略可行吗？可行我们下午拉会定。',
              }
            : undefined,
      };

      await this.saveRecord({
        ...base,
        status: 'done',
        source: 'scripted',
        finishedAt: new Date().toISOString(),
        totalTime,
        steps,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'execution_failed';
      await this.saveRecord({
        ...base,
        status: 'error',
        source: 'scripted',
        finishedAt: new Date().toISOString(),
        error: message,
      });
      yield { type: 'error', message };
    }
  }

  private async saveRecord(record: ExecutionRecord) {
    const { userId: _userId, ...publicRecord } = record;
    await this.prisma.centerRecord.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        workspaceId: record.workspaceId,
        kind: 'execution',
        payload: publicRecord as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: publicRecord as unknown as Prisma.InputJsonValue,
      },
    });
    // Terminal records become one idempotent call fact for the analytics dashboard.
    if (record.status !== 'running') {
      await this.saveCallFact(record).catch(() => undefined);
    }
  }

  private async saveCallFact(record: ExecutionRecord): Promise<void> {
    const finishedAt = record.finishedAt ? new Date(record.finishedAt) : new Date();
    const startedAt = new Date(record.startedAt);
    // Scripted mode is a UI fallback and must not masquerade as provider latency.
    const durationMs = record.source === 'llm' && Number.isFinite(startedAt.getTime())
      ? Math.max(0, Math.round(finishedAt.getTime() - startedAt.getTime()))
      : null;
    const contentId = normalizeAssetId(record.assetId) || `chat:${record.chatId}`;
    if (!contentId) return;
    const eventId = `execution:${record.id}`;
    const visitorHash = record.userId ? this.accountVisitorHash(record.workspaceId, record.userId) : null;
    const visitorType = record.userId ? 'user' : 'guest';
    await this.prisma.$executeRaw`
      INSERT OR IGNORE INTO "MarketEngagementEvent"
        ("id", "workspaceId", "eventId", "contentId", "assetType", "action", "dateKey", "visitorHash", "visitorType", "success", "durationMs", "inputTokens", "outputTokens", "errorCode", "occurredAt")
      VALUES
        (${randomUUID()}, ${record.workspaceId}, ${eventId}, ${contentId}, ${record.assetType}, ${'call'}, ${portalAnalyticsDateKey(finishedAt)}, ${visitorHash}, ${visitorType}, ${record.status === 'done'}, ${durationMs}, ${record.usage?.inputTokens ?? null}, ${record.usage?.outputTokens ?? null}, ${record.error?.slice(0, 200) ?? null}, ${finishedAt})
    `;
  }

  private accountVisitorHash(workspaceId: string, userId: string): string {
    // Keep call UVs joinable with page-view/login UVs without storing raw account IDs.
    return createHash('sha256')
      .update(`mss-claw:portal-uv:v1:${workspaceId}:account:${userId}`)
      .digest('hex');
  }
}
