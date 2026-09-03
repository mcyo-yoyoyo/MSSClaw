import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import {
  nestLlmChatCompletion,
  nestLlmConfigFromDoc,
  nestLlmConfigFromEnv,
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
  buildDemandUserStory,
  canConfirmDemand,
  clarifyDraft,
  createDraft,
  sanitizeLlmSolution,
  strongToolCandidates,
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

function extractJson(raw: string): unknown {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const direct: unknown = JSON.parse(clean);
    if (typeof direct === 'string' && direct !== clean) return extractJson(direct);
    return direct;
  } catch {
    // Some OpenAI-compatible providers prepend prose before the JSON payload.
  }
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(clean.slice(start, end + 1));
    return typeof parsed === 'string' && parsed !== clean ? extractJson(parsed) : parsed;
  } catch {
    return null;
  }
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
    let resources = await this.resourceCatalog.searchForDraft(workspaceId, draft);
    let base = buildRuleSolution(draft, resources);
    const llmConfig = await this.resolveLlmConfig(workspaceId);
    let solution = base;

    if (llmConfig) {
      try {
        const generated = await this.generateWithLlm(
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
      throw new BadRequestException('ai_knowledge_llm_not_configured');
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

  private async resolveLlmConfig(workspaceId: string): Promise<NestLlmRuntimeConfig | null> {
    const row = await this.prisma.centerRecord.findUnique({
      where: { id: `doc-llm-config-${workspaceId}` },
    });
    const fromDoc = nestLlmConfigFromDoc(row?.payload);
    if (fromDoc) return fromDoc;
    return nestLlmConfigFromEnv();
  }

  private async refineDemandWithAgent(
    workspaceId: string,
    draft: DemandDraft,
  ): Promise<DemandDraft> {
    const config = await this.resolveLlmConfig(workspaceId);
    if (!config) return draft;
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
    draft: DemandDraft,
    base: AiKnowledgeSolution,
    resources: SolutionResource[],
    config: NestLlmRuntimeConfig,
    signal?: AbortSignal,
    repair = false,
  ) {
    const requiredToolIds = strongToolCandidates(resources).map((resource) => resource.id);
    const raw = await nestLlmChatCompletion({
      config,
      signal,
      maxTokens: Math.max(config.maxTokens, 2_200),
      temperature: repair ? 0 : 0.15,
      jsonMode: true,
      disableThinking: true,
      messages: [
        {
          role: 'system',
          content:
            AI_KNOWLEDGE_SOLUTION_INSTRUCTIONS +
            (repair
              ? '这是一次结构修复生成。必须严格满足字段和资源ID约束，不要省略高相关工具。'
              : '') +
            '只返回JSON对象，不要输出解释、Markdown或代码围栏。对象字段为title、diagnosis、tools、cases。' +
            'diagnosis字段：need、currentSituation、keyProblems、solutionDirection。' +
            'tools每项字段：resourceId、problemSolved、introduction、howToUse、output、expectedEffect。' +
            'cases每项字段：resourceId、similarProblem、approach、toolsUsed、result、lessons、applicability。' +
            '数组没有合格内容时返回空数组，不要省略字段。' +
            'requiredToolResourceIds非空时，tools不得为空，且tools第一项的resourceId必须从该列表逐字复制。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            mode: repair ? 'repair_invalid_solution' : 'generate_solution',
            question: draft.originalQuestion,
            demand: draft.demand,
            userStory: buildDemandUserStory(draft.demand),
            requiredToolResourceIds: requiredToolIds,
            candidateResources: resources,
          }),
        },
      ],
    });
    return sanitizeLlmSolution(extractJson(raw), base, resources, config.model);
  }

  private ruleFallbackAllowed(): boolean {
    const configured = process.env.ALLOW_AI_KNOWLEDGE_RULE_FALLBACK?.trim().toLowerCase();
    if (configured === '1' || configured === 'true') return true;
    return false;
  }
}
