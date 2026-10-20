import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import {
  describeLlmDocModel,
  nestLlmConfigFromDoc,
  nestLlmConfigFromEnv,
  type LlmDocModelStatus,
  type NestLlmRuntimeConfig,
} from '../executions/llm.client';
import { readLlmConfigDoc } from '../persistence/llm-config-store';
import { PlatformDocsService } from '../persistence/platform-docs.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AI_KNOWLEDGE_SOLUTION_INSTRUCTIONS,
  AiKnowledgeAgentRunner,
} from './ai-knowledge.agent';
import {
  buildRuleSolution,
  canConfirmDemand,
  clarifyDraft,
  createDraft,
  sanitizeLlmSolution,
  updateDraftDemand,
} from './ai-knowledge.domain';
import { AiKnowledgeResourceService } from './ai-knowledge.resources';
import type {
  AiKnowledgeActor,
  AiKnowledgeSolution,
  DemandDraft,
  DemandSummary,
  SolutionResource,
} from './ai-knowledge.types';


type SolutionRow = Prisma.AiKnowledgeSolutionGetPayload<object>;

export function draftToRow(draft: DemandDraft, actor: Pick<AiKnowledgeActor, 'key' | 'userId'>) {
  return {
    id: draft.id,
    ownerKey: actor.key,
    ownerMemberId: actor.userId ?? null,
    scenarioId: draft.scenarioId,
    originalQuestion: draft.originalQuestion,
    demand: draft.demand as unknown as Prisma.InputJsonValue,
    messages: draft.messages as unknown as Prisma.InputJsonValue,
    clarificationCount: draft.clarificationCount,
    createdAt: new Date(draft.createdAt),
    updatedAt: new Date(draft.updatedAt),
  };
}

export function solutionToRow(
  solution: AiKnowledgeSolution,
  actor: Pick<AiKnowledgeActor, 'key' | 'userId'>,
): Prisma.AiKnowledgeSolutionCreateInput {
  const { id, scenarioId, title, domain, maturity, generationSource, model, originalQuestion, createdAt, ...content } = solution;
  return {
    id,
    ownerKey: actor.key,
    ownerMemberId: actor.userId ?? null,
    scenarioId,
    title,
    domain,
    maturity,
    generationSource,
    model: model ?? null,
    originalQuestion,
    content: content as unknown as Prisma.InputJsonValue,
    createdAt: new Date(createdAt),
  };
}

export function draftFromRow(row: Prisma.AiKnowledgeDraftGetPayload<object>): DemandDraft {
  return {
    id: row.id,
    scenarioId: row.scenarioId as DemandDraft['scenarioId'],
    originalQuestion: row.originalQuestion,
    demand: row.demand as unknown as DemandDraft['demand'],
    messages: row.messages as unknown as DemandDraft['messages'],
    clarificationCount: row.clarificationCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** 方案正文（需求、对话、行动、证据等）整体存 content，读出时铺回顶层 */
export function solutionFromRow(row: SolutionRow): AiKnowledgeSolution {
  return {
    ...(row.content as unknown as Omit<AiKnowledgeSolution, 'id'>),
    id: row.id,
    scenarioId: row.scenarioId as AiKnowledgeSolution['scenarioId'],
    title: row.title,
    domain: row.domain,
    maturity: row.maturity as AiKnowledgeSolution['maturity'],
    generationSource: row.generationSource as AiKnowledgeSolution['generationSource'],
    ...(row.model ? { model: row.model } : {}),
    originalQuestion: row.originalQuestion,
    createdAt: row.createdAt.toISOString(),
  };
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AiKnowledgeService {
  private readonly logger = new Logger(AiKnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docs: PlatformDocsService,
    private readonly resourceCatalog: AiKnowledgeResourceService,
    private readonly agentRunner: AiKnowledgeAgentRunner,
  ) {}

  async resolveActor(
    workspaceId: string,
    token: string | undefined,
    visitorId: string | undefined,
    fallbackFingerprint: string,
  ): Promise<AiKnowledgeActor> {
    const session = await this.docs.me(token, workspaceId);
    if (session.ok) {
      const id = String(session.user.id ?? '').trim();
      if (id) return { key: `user:${id}`, type: 'user', userId: id };
    }
    const visitor = (visitorId ?? '').trim().slice(0, 200) || fallbackFingerprint;
    return { key: `guest:${hash(visitor)}`, type: 'guest' };
  }

  async startDraft(workspaceId: string, actor: AiKnowledgeActor, question: string) {
    const draft = await this.refineDemandWithAgent(workspaceId, createDraft(question));
    await this.saveDraft(workspaceId, actor, draft);
    return { draft };
  }

  async getDraft(workspaceId: string, actor: AiKnowledgeActor, draftId: string) {
    return { draft: await this.requireDraft(workspaceId, actor, draftId) };
  }

  async clarify(
    workspaceId: string,
    actor: AiKnowledgeActor,
    draftId: string,
    answer: string,
  ) {
    const current = await this.requireDraft(workspaceId, actor, draftId);
    const draft = await this.refineDemandWithAgent(
      workspaceId,
      clarifyDraft(current, answer),
    );
    await this.saveDraft(workspaceId, actor, draft);
    return { draft };
  }

  async updateDemand(
    workspaceId: string,
    actor: AiKnowledgeActor,
    draftId: string,
    demand: Partial<DemandSummary>,
  ) {
    if (!demand || typeof demand !== 'object') {
      throw new BadRequestException('demand_object_required');
    }
    const current = await this.requireDraft(workspaceId, actor, draftId);
    const draft = updateDraftDemand(current, demand);
    await this.saveDraft(workspaceId, actor, draft);
    return { draft };
  }

  async generate(
    workspaceId: string,
    actor: AiKnowledgeActor,
    draftId: string,
    signal?: AbortSignal,
  ) {
    const draft = await this.requireDraft(workspaceId, actor, draftId);
    if (!canConfirmDemand(draft.demand)) {
      throw new BadRequestException('ai_knowledge_demand_incomplete');
    }
    const resources = await this.resourceCatalog.searchForDraft(workspaceId, draft);
    const base = buildRuleSolution(draft, resources);
    const { config: llmConfig, status: llmStatus } = await this.resolveLlmRuntime(workspaceId);
    let solution = base;
    if (llmConfig) {
      // 帮找读的是组织默认模型，和「模型配置」的测试按钮（测哪一行测哪一行）
      // 以及对话窗口（用当前选中模型）是三个不同来源，出问题时先看这行日志。
      this.logger.log(
        `AI knowledge generating with organization default model "${llmConfig.model}" ` +
          `@ ${this.endpointLabel(llmConfig.baseUrl)} (source=${llmConfig.source})`,
      );
    }

    if (llmConfig) {
      try {
        const generated = await this.generateWithLlm(
          workspaceId,
          draft,
          base,
          resources,
          llmConfig,
          signal,
        );
        if (generated) solution = generated;
        else throw new BadRequestException('ai_knowledge_llm_invalid_solution');
      } catch (error) {
        const upstream = this.upstreamConfigError(error, llmConfig.model);
        if (upstream) {
          this.logger.warn(
            `AI knowledge upstream rejected model "${llmConfig.model}": ` +
              (error instanceof Error ? error.message : String(error)),
          );
          throw upstream;
        }
        this.logger.warn(
          `AI knowledge generation needs repair: ${error instanceof Error ? error.message : String(error)}`,
        );
        try {
          const fallback = await this.generateWithLlm(
            workspaceId,
            draft,
            base,
            resources,
            llmConfig,
            signal,
            true,
          );
          if (!fallback) throw new BadRequestException('ai_knowledge_llm_invalid_solution');
          solution = fallback;
        } catch (fallbackError) {
          this.logger.warn(
            `AI knowledge repair failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          );
          throw this.upstreamConfigError(fallbackError, llmConfig.model) ?? fallbackError;
        }
      }
    } else if (!this.ruleFallbackAllowed()) {
      this.logger.warn(
        `AI knowledge has no usable organization default model: ${llmStatus.reason}` +
          (llmStatus.model ? ` (model=${llmStatus.model})` : ''),
      );
      throw this.llmUnavailableError(llmStatus);
    }

    await this.saveSolution(workspaceId, actor, solution);
    await this.prisma.aiKnowledgeDraft.deleteMany({ where: { id: draft.id, ownerKey: actor.key } });
    return { solution };
  }

  async listSolutions(workspaceId: string, actor: AiKnowledgeActor, limit = 50) {
    const rows = await this.prisma.aiKnowledgeSolution.findMany({
      where: { ownerKey: actor.key },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return { solutions: rows.map(solutionFromRow) };
  }

  async getSolution(workspaceId: string, actor: AiKnowledgeActor, solutionId: string) {
    const row = await this.prisma.aiKnowledgeSolution.findUnique({ where: { id: solutionId } });
    if (!row || row.ownerKey !== actor.key) {
      throw new NotFoundException('ai_knowledge_solution_not_found');
    }
    return { solution: solutionFromRow(row) };
  }

  async deleteSolution(workspaceId: string, actor: AiKnowledgeActor, solutionId: string) {
    await this.getSolution(workspaceId, actor, solutionId);
    await this.prisma.aiKnowledgeSolution.delete({ where: { id: solutionId } });
    return { ok: true };
  }

  /** 草稿 id 由服务端生成；更新前都已经过 requireDraft 校验归属 */
  private async saveDraft(workspaceId: string, actor: AiKnowledgeActor, draft: DemandDraft) {
    const { id, ...data } = draftToRow(draft, actor);
    await this.prisma.aiKnowledgeDraft.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  private async requireDraft(workspaceId: string, actor: AiKnowledgeActor, draftId: string): Promise<DemandDraft> {
    const row = await this.prisma.aiKnowledgeDraft.findUnique({ where: { id: draftId } });
    if (!row || row.ownerKey !== actor.key) {
      throw new NotFoundException('ai_knowledge_draft_not_found');
    }
    return draftFromRow(row);
  }

  private async saveSolution(
    workspaceId: string,
    actor: AiKnowledgeActor,
    solution: AiKnowledgeSolution,
  ) {
    await this.prisma.aiKnowledgeSolution.create({ data: solutionToRow(solution, actor) });
  }

  /**
   * 智库“帮找”只认后台「模型配置」里的组织默认模型，不跟随对话窗口的临时选择，
   * 也不写死任何模型 id：defaultModelId 配了谁就用谁。解析失败时带回具体原因，
   * 让前端能说清是「哪个模型缺什么」，而不是笼统一句「未配置」。
   */
  /** 端点标识，只保留 origin+path：Key 从不出现在 URL 里，这里也不带查询串。 */
  private endpointLabel(baseUrl: string): string {
    try {
      const url = new URL(baseUrl);
      return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
    } catch {
      return '(invalid base url)';
    }
  }

  private async resolveLlmRuntime(workspaceId: string): Promise<{
    config: NestLlmRuntimeConfig | null;
    status: LlmDocModelStatus;
  }> {
    const payload = await readLlmConfigDoc(this.prisma);
    if (!payload) {
      // 工作区还没建过配置文档时才允许退到部署级 LLM_* 环境变量。
      const fromEnv = nestLlmConfigFromEnv();
      return {
        config: fromEnv,
        status: fromEnv
          ? { ok: true, model: fromEnv.model, reason: 'ok' }
          : { ok: false, model: '', reason: 'no_document' },
      };
    }
    const doc = payload;
    const defaultModelId =
      typeof doc?.defaultModelId === 'string' && doc.defaultModelId.trim()
        ? doc.defaultModelId
        : typeof doc?.model === 'string' && doc.model.trim()
          ? doc.model
          : undefined;
    // 配置文档存在但默认模型不可用时保持失败，不能静默换到环境变量模型：
    // 那会让运营以为选中的是 A，实际跑的却是 B。
    return {
      config: nestLlmConfigFromDoc(payload, defaultModelId),
      status: describeLlmDocModel(payload, defaultModelId),
    };
  }

  /** `ai_knowledge_llm_not_configured:<reason>[:<model>]`，前端据此给出可执行提示。 */
  private llmUnavailableError(status: LlmDocModelStatus): BadRequestException {
    const detail = status.model ? `${status.reason}:${status.model}` : status.reason;
    return new BadRequestException(`ai_knowledge_llm_not_configured:${detail}`);
  }

  /** 上游 HTTP 状态码：OpenAI SDK 的 APIError 带 status，裸 fetch 链路只有消息文本。 */
  private upstreamStatus(error: unknown): number | null {
    const status = (error as { status?: unknown } | null)?.status;
    if (typeof status === 'number') return status;
    const message = error instanceof Error ? error.message : String(error ?? '');
    const matched = message.match(/\b(?:LLM HTTP |^)([45]\d{2})\b/);
    return matched ? Number(matched[1]) : null;
  }

  /**
   * 上游网关拒绝的是「配置」而不是「这次的输出」：模型未注册、Key 无效、限流。
   * 这类失败重试和 repair 都救不了，直接带着模型 id 报回去，别再多打两次请求。
   */
  private upstreamConfigError(error: unknown, model: string): BadRequestException | null {
    const status = this.upstreamStatus(error);
    if (status === null) return null;
    const message = error instanceof Error ? error.message : String(error ?? '');
    const code =
      status === 401 || status === 403
        ? 'auth_rejected'
        : status === 404
          ? 'model_not_registered'
          : status === 429
            ? 'rate_limited'
            : status === 400 && /model/i.test(message)
              ? 'model_not_registered'
              : null;
    if (!code) return null;
    return new BadRequestException(`ai_knowledge_llm_upstream:${code}:${model}`);
  }

  private async refineDemandWithAgent(
    workspaceId: string,
    draft: DemandDraft,
  ): Promise<DemandDraft> {
    const { config, status } = await this.resolveLlmRuntime(workspaceId);
    if (!config) {
      this.logger.warn(
        `AI knowledge demand refinement skipped, no usable default model: ${status.reason}` +
          (status.model ? ` (model=${status.model})` : ''),
      );
      return draft;
    }
    try {
      const refined = await this.agentRunner.refineDemand(draft, config);
      const next = updateDraftDemand(draft, refined.demand);
      const messages = [...next.messages];
      let lastAssistantIndex = -1;
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index].role === 'assistant') {
          lastAssistantIndex = index;
          break;
        }
      }
      if (lastAssistantIndex >= 0) {
        const demandComplete = canConfirmDemand(next.demand);
        const shouldStopClarifying = demandComplete && !refined.needsClarification;
        messages[lastAssistantIndex] = {
          ...messages[lastAssistantIndex],
          text: shouldStopClarifying
            ? '需求卡已经整理完整。请检查右侧内容，确认后即可生成诊断方案。'
            : demandComplete || refined.needsClarification
              ? refined.assistantReply
              : '需求摘要还不完整，请继续补充标记为“待确认”的信息。',
        };
      }
      return { ...next, messages };
    } catch (error) {
      const upstream = this.upstreamConfigError(error, config.model);
      this.logger.warn(
        (upstream
          ? `AI knowledge demand refinement rejected by upstream for model "${config.model}": `
          : 'AI knowledge demand refinement failed: ') +
          (error instanceof Error ? error.message : String(error)),
      );
      return draft;
    }
  }

  private async generateWithLlm(
    workspaceId: string,
    draft: DemandDraft,
    base: AiKnowledgeSolution,
    resources: SolutionResource[],
    config: NestLlmRuntimeConfig,
    signal?: AbortSignal,
    repair = false,
  ) {
    const generated = await this.agentRunner.generate(
      workspaceId,
      draft,
      config,
      signal,
      repair,
    );
    const parsedResources = generated.resources.length ? generated.resources : resources;
    const solution = sanitizeLlmSolution(generated.solution, base, parsedResources, config.model);
    if (!solution) {
      throw new BadRequestException('ai_knowledge_llm_invalid_solution');
    }
    return solution;
  }

  private ruleFallbackAllowed(): boolean {
    const configured = process.env.ALLOW_AI_KNOWLEDGE_RULE_FALLBACK?.trim().toLowerCase();
    if (configured === '1' || configured === 'true') return true;
    return false;
  }
}
