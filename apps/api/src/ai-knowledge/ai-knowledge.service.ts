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

const DRAFT_KIND = 'ai-knowledge-draft';
const SOLUTION_KIND = 'ai-knowledge-solution';

type StoredDraft = DemandDraft & { ownerKey: string };
type StoredSolution = AiKnowledgeSolution & { ownerKey: string };

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
          throw fallbackError;
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
    await this.prisma.centerRecord.delete({
      where: { id: this.recordId(DRAFT_KIND, workspaceId, actor, draft.id) },
    }).catch(() => undefined);
    return { solution };
  }

  async listSolutions(workspaceId: string, actor: AiKnowledgeActor, limit = 50) {
    const rows = await this.prisma.centerRecord.findMany({
      where: { workspaceId, kind: SOLUTION_KIND },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Math.max(limit, 1) * 4, 400),
    });
    const solutions = rows
      .map((row) => row.payload as unknown as StoredSolution)
      .filter((item) => item.ownerKey === actor.key)
      .slice(0, Math.min(Math.max(limit, 1), 100))
      .map(({ ownerKey: _ownerKey, ...solution }) => solution);
    return { solutions };
  }

  async getSolution(workspaceId: string, actor: AiKnowledgeActor, solutionId: string) {
    const row = await this.prisma.centerRecord.findUnique({
      where: { id: this.recordId(SOLUTION_KIND, workspaceId, actor, solutionId) },
    });
    const payload = row?.payload as unknown as StoredSolution | undefined;
    if (!row || row.workspaceId !== workspaceId || payload?.ownerKey !== actor.key) {
      throw new NotFoundException('ai_knowledge_solution_not_found');
    }
    const { ownerKey: _ownerKey, ...solution } = payload;
    return { solution };
  }

  async deleteSolution(workspaceId: string, actor: AiKnowledgeActor, solutionId: string) {
    await this.getSolution(workspaceId, actor, solutionId);
    await this.prisma.centerRecord.delete({
      where: { id: this.recordId(SOLUTION_KIND, workspaceId, actor, solutionId) },
    });
    return { ok: true };
  }

  private recordId(kind: string, workspaceId: string, actor: AiKnowledgeActor, id: string): string {
    return `${kind}:${hash(workspaceId).slice(0, 12)}:${hash(actor.key).slice(0, 20)}:${id}`;
  }

  private async saveDraft(workspaceId: string, actor: AiKnowledgeActor, draft: DemandDraft) {
    const payload: StoredDraft = { ...draft, ownerKey: actor.key };
    await this.prisma.centerRecord.upsert({
      where: { id: this.recordId(DRAFT_KIND, workspaceId, actor, draft.id) },
      create: {
        id: this.recordId(DRAFT_KIND, workspaceId, actor, draft.id),
        workspaceId,
        kind: DRAFT_KIND,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      update: { payload: payload as unknown as Prisma.InputJsonValue },
    });
  }

  private async requireDraft(workspaceId: string, actor: AiKnowledgeActor, draftId: string) {
    const row = await this.prisma.centerRecord.findUnique({
      where: { id: this.recordId(DRAFT_KIND, workspaceId, actor, draftId) },
    });
    const payload = row?.payload as unknown as StoredDraft | undefined;
    if (!row || row.workspaceId !== workspaceId || payload?.ownerKey !== actor.key) {
      throw new NotFoundException('ai_knowledge_draft_not_found');
    }
    const { ownerKey: _ownerKey, ...draft } = payload;
    return draft;
  }

  private async saveSolution(
    workspaceId: string,
    actor: AiKnowledgeActor,
    solution: AiKnowledgeSolution,
  ) {
    const payload: StoredSolution = { ...solution, ownerKey: actor.key };
    await this.prisma.centerRecord.create({
      data: {
        id: this.recordId(SOLUTION_KIND, workspaceId, actor, solution.id),
        workspaceId,
        kind: SOLUTION_KIND,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * 智库“帮找”只认后台「模型配置」里的组织默认模型，不跟随对话窗口的临时选择，
   * 也不写死任何模型 id：defaultModelId 配了谁就用谁。解析失败时带回具体原因，
   * 让前端能说清是「哪个模型缺什么」，而不是笼统一句「未配置」。
   */
  private async resolveLlmRuntime(workspaceId: string): Promise<{
    config: NestLlmRuntimeConfig | null;
    status: LlmDocModelStatus;
  }> {
    const row = await this.prisma.centerRecord.findUnique({
      where: { id: `doc-llm-config-${workspaceId}` },
    });
    if (!row) {
      // 工作区还没建过配置文档时才允许退到部署级 LLM_* 环境变量。
      const fromEnv = nestLlmConfigFromEnv();
      return {
        config: fromEnv,
        status: fromEnv
          ? { ok: true, model: fromEnv.model, reason: 'ok' }
          : { ok: false, model: '', reason: 'no_document' },
      };
    }
    const payload = row.payload;
    const doc =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : undefined;
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
      this.logger.warn(
        `AI knowledge demand refinement failed: ${error instanceof Error ? error.message : String(error)}`,
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
