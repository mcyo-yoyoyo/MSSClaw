import type { ExecutionStep } from '@/domain/chat';
import type { StreamEvent } from '@/domain/stream';
import { parseSSEStream } from '@/domain/stream';
import { apiUrl, isApiEnabled } from '@/api/client';
import { isLlmConfigured, llmExecutionStream } from '@/api/llmClient';
import { resolveAgentType } from '@/lib/utils';

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

function shouldUseRemoteStream() {
  return isApiEnabled();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildReplyTokens(agentType: 'marketing' | 'knowledge', query: string) {
  const previewHint =
    agentType === 'marketing'
      ? '点击查看右侧沙盒生成的交互看板及 NBA 策略'
      : '阅读右侧结构化解答及文献溯源卡片';
  const colorClass = agentType === 'marketing' ? 'text-indigo-600' : 'text-emerald-600';
  const snippet = query.length > 15 ? `${query.slice(0, 15)}...` : query;

  const plain = `✅ **任务完成。** 针对需求 *"${snippet}"*，Agent 已完成处理。\n\n👉 ${previewHint}。`;
  const html = plain.replace(
    previewHint,
    `<span class="${colorClass} font-bold">${previewHint}</span>`,
  );

  return html.match(/(\*\*[^*]+\*\*|\*[^*]+\*|<span[^>]*>.*?<\/span>|[^\s]+|\s+)/g) ?? [html];
}

function getAgentName(chatId: string, agentType: 'marketing' | 'knowledge') {
  const byChat: Record<string, string> = {
    marketing: '营销 Agent',
    knowledge: '知识 Agent',
    insight_agent: '洞察 Agent',
    rd_rag: '研发 RAG Agent',
  };
  return byChat[chatId] ?? (agentType === 'marketing' ? '营销 Agent' : '知识 Agent');
}

function getFollowUp(_chatId: string) {
  return undefined;
}

/** Mock SSE generator — mirrors future POST /api/v1/executions/stream */
export async function* mockExecutionStream(params: {
  chatId: string;
  message: string;
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const { signal } = params;
  if (signal?.aborted) return;

  const agentType = resolveAgentType(params.chatId, params.message);
  const steps = agentType === 'marketing' ? MARKETING_STEPS : KNOWLEDGE_STEPS;
  const executionId = `exec_${Date.now()}`;

  yield { type: 'execution_start', executionId };

  for (const step of steps) {
    if (signal?.aborted) return;
    yield { type: 'skill_start', skill: step.skill, label: step.label };
    await sleep(step.skill === 'Python_Sandbox' ? 480 : 220);
    if (signal?.aborted) return;
    yield { type: 'skill_end', skill: step.skill, latency: step.time };
  }

  const tokens = buildReplyTokens(agentType, params.message);
  for (const token of tokens) {
    if (signal?.aborted) return;
    yield { type: 'token', content: token };
    await sleep(28 + Math.floor(Math.random() * 22));
  }

  yield { type: 'artifact', agentType };
  yield {
    type: 'done',
    totalTime: agentType === 'marketing' ? '4.28s' : '1.84s',
    steps,
    agentName: getAgentName(params.chatId, agentType),
    followUp: getFollowUp(params.chatId),
  };
}

/** Unified entry — LLM client stream when configured, else remote SSE or mock */
export async function* streamExecution(params: {
  chatId: string;
  message: string;
  workspaceId?: string;
  signal?: AbortSignal;
  planSteps?: string[];
  agentId?: string;
  agentName?: string;
  systemPrompt?: string;
  actionType?: 'marketing' | 'knowledge';
  kbContext?: string;
}): AsyncGenerator<StreamEvent> {
  if (isLlmConfigured() && params.planSteps?.length) {
    yield* llmExecutionStream({
      message: params.message,
      actionType: params.actionType ?? resolveAgentType(params.chatId, params.message),
      agentName: params.agentName ?? 'Agent',
      systemPrompt: params.systemPrompt,
      planSteps: params.planSteps,
      kbContext: params.kbContext,
      signal: params.signal,
    });
    return;
  }

  if (!shouldUseRemoteStream()) {
    yield* mockExecutionStream(params);
    return;
  }

  try {
    const response = await fetch(apiUrl('/api/v1/executions/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        chatId: params.chatId,
        message: params.message,
        workspaceId: params.workspaceId,
      }),
      signal: params.signal,
    });

    if (!response.ok || !response.body) {
      yield* mockExecutionStream(params);
      return;
    }

    yield* parseSSEStream(response.body);
  } catch (error) {
    if (params.signal?.aborted) return;
    yield* mockExecutionStream(params);
  }
}

export function exportExecutionSnapshot(params: {
  workspace: string;
  chatTitle: string;
  query: string;
  agentType: 'marketing' | 'knowledge';
}) {
  return {
    exportedAt: new Date().toISOString(),
    workspace: params.workspace,
    chatTitle: params.chatTitle,
    query: params.query,
    agentType: params.agentType,
    artifact: params.agentType === 'marketing' ? 'marketing-board-v1' : 'knowledge-card-v1',
  };
}

export async function pushArtifactToGroup(params: {
  chatTitle: string;
  targetGroup: string;
  artifactType?: 'marketing' | 'knowledge';
  query?: string;
  webhookUrl?: string;
}): Promise<{ ok: boolean; message: string }> {
  const webhookUrl = params.webhookUrl?.trim();

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'artifact.push',
          chatTitle: params.chatTitle,
          targetGroup: params.targetGroup,
          artifactType: params.artifactType ?? 'marketing',
          query: params.query ?? '',
          pushedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        return { ok: false, message: `Webhook 推送失败 · HTTP ${res.status}` };
      }

      return { ok: true, message: `已通过 Webhook 推送到「${params.targetGroup}」` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误';
      return { ok: false, message: `Webhook 推送失败：${msg}` };
    }
  }

  await sleep(600);
  return {
    ok: true,
    message: `已将 Artifact 推送到「${params.targetGroup}」`,
  };
}
