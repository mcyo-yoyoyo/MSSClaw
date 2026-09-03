import { Injectable } from '@nestjs/common';
import {
  Agent,
  OpenAIProvider,
  Runner,
  setTracingDisabled,
  tool,
} from '@openai/agents';
import { z } from 'zod';
import type { NestLlmRuntimeConfig } from '../executions/llm.client';
import type { DemandDraft, DemandSummary, SolutionResource } from './ai-knowledge.types';
import { AiKnowledgeResourceService } from './ai-knowledge.resources';

type AgentGeneration = {
  raw: string;
  resources: SolutionResource[];
};

type DemandRefinement = {
  demand: Omit<DemandSummary, 'pendingKeys'>;
  assistantReply: string;
  needsClarification: boolean;
};

export const AI_KNOWLEDGE_SOLUTION_INSTRUCTIONS =
  '你是 MSS AI 智库的业务诊断与工具方案编排器。你的任务不是套用模板，而是根据已确认需求生成一份可执行的个性化方案。' +
  '事实边界：只能引用本轮检索返回的工具、Skill、Agent和案例；resourceId必须逐字复制候选资源的id，不得改写、缩写或虚构。' +
  '先理解需求中的业务对象、现有材料、目标产出和限制条件，再判断需要哪些AI能力。诊断必须解释当前任务真正卡在哪里，不能复述需求字段。' +
  '工具选择必须比较核心能力、适用场景、输入输出、使用说明和匹配理由。若候选中存在relevanceScore不低于40，且命中核心能力、适用场景、输入输出或使用说明的工具/Skill/Agent，tools至少选择1项。' +
  '每项工具推荐都必须由你针对本次需求重新编写：problemSolved说明它解决哪个具体环节；howToUse用2至3步串起用户已有材料、在工具中的具体操作和本次目标产出；output写最终交付物；expectedEffect只写有依据的改善，不得编造数字。' +
  '例如用户处理产品录屏时，步骤必须明确写录屏素材、剪辑/配音/动效动作和成片，不得写成通用的“准备输入、执行处理、检查结果”。' +
  '优先用一个主工具覆盖核心流程，仅在确有必要时增加补充工具。不要重复工具介绍，不要推荐只命中普通简介或分类词的候选。' +
  '案例必须同时匹配业务问题、目标产物、实际做法和所用工具。用户要生成视频时，只有案例原文实际实施过视频生成或视频制作才算匹配；产品上市文案、合规检查、软件的视频功能测试都不算。' +
  '每个案例的approach只提取与当前需求最相似的真实动作，写清谁用什么工具、处理什么输入、得到什么产物；toolsUsed必须逐字复制案例候选的toolsUsed，候选未提供时填写“案例原文未明确说明”。' +
  'lessons必须结合本次用户已有输入和期望输出，给出最多两条能直接采用的动作，不能写“建立治理机制”“从具体痛点切入”等脱离当前任务的通用建议；弱相关案例宁可不选。' +
  'tools最多3项，cases最多2项，每个文字字段限制1至2句，howToUse最多3步，lessons最多2点。案例未披露量化结果时明确说明，不得编造。';

const searchParameters = z.object({
  query: z.string().min(2).max(300),
  limit: z.number().int().min(1).max(6),
});

const solutionParameters = z.object({
  title: z.string().min(2).max(120),
  diagnosis: z.object({
    need: z.string().min(2).max(500),
    currentSituation: z.string().min(2).max(700),
    keyProblems: z.array(z.string().min(2).max(300)).min(1).max(4),
    solutionDirection: z.string().min(2).max(700),
  }),
  tools: z.array(z.object({
    resourceId: z.string().min(1),
    problemSolved: z.string().min(2).max(500),
    introduction: z.string().min(2).max(500),
    howToUse: z.array(z.string().min(2).max(300)).min(2).max(3),
    output: z.string().min(2).max(500),
    expectedEffect: z.string().min(2).max(500),
  })).max(3),
  cases: z.array(z.object({
    resourceId: z.string().min(1),
    similarProblem: z.string().min(2).max(500),
    approach: z.string().min(2).max(700),
    toolsUsed: z.array(z.string().min(1).max(120)).min(1).max(4),
    result: z.string().min(2).max(500),
    lessons: z.array(z.string().min(2).max(300)).min(1).max(2),
    applicability: z.string().min(2).max(500),
  })).max(2),
});

const demandParameters = z.object({
  title: z.string().min(2).max(120),
  domain: z.string().min(2).max(80),
  problem: z.string().min(2).max(500),
  goal: z.string().min(2).max(300),
  currentMethod: z.string().min(2).max(300),
  inputs: z.string().min(2).max(300),
  aiRole: z.string().min(2).max(300),
  humanCheckpoint: z.string().min(2).max(300),
  needsClarification: z.boolean(),
  assistantReply: z.string().min(2).max(300),
});

function uniqueResources(resources: SolutionResource[]): SolutionResource[] {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    const label = resource.label.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    const key = `${resource.kind}:${label || resource.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

@Injectable()
export class AiKnowledgeAgentRunner {
  constructor(private readonly resources: AiKnowledgeResourceService) {
    setTracingDisabled(true);
  }

  async refineDemand(
    draft: DemandDraft,
    config: NestLlmRuntimeConfig,
    signal?: AbortSignal,
  ): Promise<DemandRefinement> {
    const submitDemand = tool({
      name: 'submit_demand_summary',
      description: '提交根据当前对话整理后的需求摘要，以及下一句对用户的回应。',
      parameters: demandParameters,
      execute: async (value) => JSON.stringify(value),
    });
    const provider = new OpenAIProvider({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      useResponses: false,
    });
    const runner = new Runner({ modelProvider: provider, tracingDisabled: true });
    const agent = new Agent({
      name: 'MSS AI 智库需求分析 Agent',
      model: config.model,
      instructions:
        '根据用户原始问题和对话历史，把需求整理成一条完整但不过度细化的用户故事。' +
        '只判断四项信息是否明确：1）使用AI的人的业务角色；2）希望达成的业务目标；3）可以交给AI的现有输入；4）希望AI产出的结果。' +
        '字段映射必须固定：humanCheckpoint填写使用者角色，goal填写业务目标，inputs填写现有输入，aiRole填写期望输出。problem概括任务，currentMethod统一填写“计划使用AI完成该任务”。' +
        '信息达到类别级别即可，例如“产品录屏和卖点材料”“社交媒体宣传视频”已经足够。不要追问素材数量、时长、格式、预算、历史工作方式、审核人、国家明细或工具偏好。' +
        '优先从用户已经说过的话中提取，不得重复追问。缺少角色或目标时先合并追问这两项；缺少输入或输出时再合并追问这两项；每轮最多问一组。' +
        '未知项填写“待确认”，任何四项仍待确认时needsClarification必须为true。四项全部明确后立即停止追问，needsClarification为false，assistantReply只说明用户故事已形成、可以确认生成方案。' +
        '目标用户故事示例：作为欧洲区域营销经理，我希望将产品图片、功能演示素材、核心卖点和品牌规范提交给AI，由AI自动生成适合社交媒体投放的产品宣传视频，从而缩短视频制作周期、降低沟通与制作成本，并提升新品推广效率。' +
        '必须调用submit_demand_summary完成本轮，不要直接输出普通文本。',
      tools: [submitDemand],
      toolUseBehavior: { stopAtToolNames: ['submit_demand_summary'] },
      modelSettings: {
        toolChoice: 'required',
        maxTokens: 900,
        providerData: { thinking: { type: 'disabled' } },
      },
    });
    try {
      const result = await runner.run(
        agent,
        JSON.stringify({
          originalQuestion: draft.originalQuestion,
          currentDemand: draft.demand,
          clarificationCount: draft.clarificationCount,
          conversation: draft.messages.map(({ role, text }) => ({ role, text })),
        }),
        { maxTurns: 2, signal },
      );
      const raw = typeof result.finalOutput === 'string'
        ? result.finalOutput
        : JSON.stringify(result.finalOutput ?? '');
      const parsed: unknown = JSON.parse(raw);
      const value = demandParameters.parse(parsed);
      const { assistantReply, needsClarification, ...demand } = value;
      return { demand, assistantReply, needsClarification };
    } finally {
      await provider.close();
    }
  }

  async generate(
    workspaceId: string,
    draft: DemandDraft,
    config: NestLlmRuntimeConfig,
    signal?: AbortSignal,
  ): Promise<AgentGeneration> {
    const collected: SolutionResource[] = [];
    const completedSearches = new Set<'cases' | 'tools' | 'capabilities'>();
    const remember = (items: SolutionResource[]) => {
      collected.push(...items);
      return JSON.stringify(items);
    };
    const searchCases = tool({
      name: 'search_cases',
      description: '查询本地海外 AI 落地案例库。query必须包含用户业务问题、目标、期望做法和所需工具类型，用于匹配案例做法、使用工具、结果和借鉴意义。',
      parameters: searchParameters,
      execute: async ({ query, limit }) => {
        completedSearches.add('cases');
        return remember(await this.resources.searchCases(workspaceId, query, limit));
      },
    });
    const searchTools = tool({
      name: 'search_tools',
      description: '查询 MSS 平台数据库中的国内外 AI 工具主数据。query应包含任务、输入、预期输出和所需核心能力，不要只重复用户原话。',
      parameters: searchParameters,
      execute: async ({ query, limit }) => {
        completedSearches.add('tools');
        return remember(await this.resources.searchTools(workspaceId, query, limit));
      },
    });
    const searchCapabilities = tool({
      name: 'search_capabilities',
      description: '查询当前工作区数据库中已登记的 Skill 和 Agent。query应包含业务场景、任务和所需核心能力。',
      parameters: searchParameters,
      execute: async ({ query, limit }) => {
        completedSearches.add('capabilities');
        return remember(await this.resources.searchCapabilities(workspaceId, query, limit));
      },
    });
    const submitSolution = tool({
      name: 'submit_solution',
      description: '完成资料检索后，提交最终的结构化行动方案。这是完成任务的唯一方式。',
      parameters: solutionParameters,
      isEnabled: () => completedSearches.size === 3,
      execute: async (solution) => JSON.stringify(solution),
    });

    const provider = new OpenAIProvider({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      useResponses: false,
    });
    const runner = new Runner({
      modelProvider: provider,
      tracingDisabled: true,
    });
    const agent = new Agent({
      name: 'MSS AI 智库检索 Agent',
      model: config.model,
      instructions:
        AI_KNOWLEDGE_SOLUTION_INSTRUCTIONS +
        '你负责基于本地可信资料为业务问题生成一份三层诊断方案。' +
        '先把需求归纳为任务、输入、预期输出、所需核心能力和限制条件，然后分别查询案例库、工具目录和内部 Skill/Agent 三类资料。' +
        '如果结果不足，可以调整关键词再次查询，但最多保持必要的调用次数。' +
        '只能引用工具返回的资源，不得虚构案例、工具、Skill 或 Agent。' +
        '检索结果包含核心能力、适用场景、相关度和命中字段。你必须逐项比较候选是否直接支持所需能力，不能只因名称或简介出现相同词就推荐。' +
        'toolsUsed优先使用案例资料的toolsUsed字段；原文未明确工具时填写“案例原文未明确说明”，不得猜测。' +
        '没有相关案例时允许cases为空，不能用弱相关案例凑数。' +
        '案例没有披露量化结果时必须明确写“案例未披露量化结果”，不得编造数字。' +
        '完成检索后必须调用submit_solution提交结果，不要直接输出普通文本。' +
        'tools和cases中的resourceId只能填写对应检索结果中真实存在的id。',
      tools: [searchCases, searchTools, searchCapabilities, submitSolution],
      toolUseBehavior: { stopAtToolNames: ['submit_solution'] },
      modelSettings: {
        toolChoice: 'auto',
        parallelToolCalls: false,
        maxTokens: Math.max(config.maxTokens, 1_600),
        providerData: { thinking: { type: 'disabled' } },
      },
    });
    try {
      const result = await runner.run(
        agent,
        JSON.stringify({
          task: '检索可信资料并生成简洁、可执行的业务行动方案',
          question: draft.originalQuestion,
          demand: draft.demand,
        }),
        { maxTurns: 6, signal },
      );
      return {
        raw: typeof result.finalOutput === 'string'
          ? result.finalOutput
          : JSON.stringify(result.finalOutput ?? ''),
        resources: uniqueResources(collected).slice(0, 12),
      };
    } finally {
      await provider.close();
    }
  }
}
