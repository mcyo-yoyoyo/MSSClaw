import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { nestLlmStreamedText, type NestLlmRuntimeConfig } from '../executions/llm.client';
import type { DemandDraft, DemandSummary, SolutionResource } from './ai-knowledge.types';
import { AiKnowledgeResourceService } from './ai-knowledge.resources';

type AgentGeneration = {
  solution: unknown;
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

/** 输出契约写进提示词：不再依赖 function calling，网关只要能做普通补全就行。 */
const DEMAND_OUTPUT_CONTRACT =
  '只输出一个 JSON 对象，不要 Markdown 代码块、解释或多余文字。字段：' +
  'title(字符串)、domain(字符串)、problem(字符串)、goal(字符串)、currentMethod(字符串)、' +
  'inputs(字符串)、aiRole(字符串)、humanCheckpoint(字符串)、needsClarification(布尔)、assistantReply(字符串)。';

const SOLUTION_OUTPUT_CONTRACT =
  '只输出一个 JSON 对象，不要 Markdown 代码块、解释或多余文字。结构：' +
  '{"title":字符串,"diagnosis":{"need":字符串,"currentSituation":字符串,"keyProblems":[字符串],"solutionDirection":字符串},' +
  '"tools":[{"resourceId":字符串,"problemSolved":字符串,"introduction":字符串,"howToUse":[2至3条字符串],"output":字符串,"expectedEffect":字符串}],' +
  '"cases":[{"resourceId":字符串,"similarProblem":字符串,"approach":字符串,"toolsUsed":[字符串],"result":字符串,"lessons":[1至2条字符串],"applicability":字符串}]}。' +
  'resourceId 必须逐字复制候选资源的 id。';

function tryParseJson(raw: string): unknown {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(clean);
  } catch {
    // 有些模型会在 JSON 前后带一句话，取最外层的花括号再试一次。
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1));
      } catch {
        return raw;
      }
    }
    return raw;
  }
}

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
  constructor(private readonly resources: AiKnowledgeResourceService) {}

  async refineDemand(
    draft: DemandDraft,
    config: NestLlmRuntimeConfig,
    signal?: AbortSignal,
  ): Promise<DemandRefinement> {
    const text = await nestLlmStreamedText({
      config,
      signal,
      // 中文 + 完整需求卡在 900 token 下会被截断，给一个下限。
      // 推理模型的思维链与正文共用预算，给足下限，否则正文根本轮不到输出。
      maxTokens: Math.max(config.maxTokens, 4_096),
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            '根据用户原始问题和对话历史，把需求整理成一条完整但不过度细化的用户故事。' +
            '只判断四项信息是否明确：1）使用AI的人的业务角色；2）希望达成的业务目标；3）可以交给AI的现有输入；4）希望AI产出的结果。' +
            '字段映射必须固定：humanCheckpoint填写使用者角色，goal填写业务目标，inputs填写现有输入，aiRole填写期望输出。problem概括任务，currentMethod统一填写“计划使用AI完成该任务”。' +
            '信息达到类别级别即可，例如“产品录屏和卖点材料”“社交媒体宣传视频”已经足够。不要追问素材数量、时长、格式、预算、历史工作方式、审核人、国家明细或工具偏好。' +
            '优先从用户已经说过的话中提取，不得重复追问。缺少角色或目标时先合并追问这两项；缺少输入或输出时再合并追问这两项；每轮最多问一组。' +
            '未知项填写“待确认”，任何四项仍待确认时needsClarification必须为true。四项全部明确后立即停止追问，needsClarification为false，assistantReply只说明用户故事已形成、可以确认生成方案。' +
            '目标用户故事示例：作为欧洲区域营销经理，我希望将产品图片、功能演示素材、核心卖点和品牌规范提交给AI，由AI自动生成适合社交媒体投放的产品宣传视频，从而缩短视频制作周期、降低沟通与制作成本，并提升新品推广效率。' +
            DEMAND_OUTPUT_CONTRACT,
        },
        {
          role: 'user',
          content: JSON.stringify({
            originalQuestion: draft.originalQuestion,
            currentDemand: draft.demand,
            clarificationCount: draft.clarificationCount,
            conversation: draft.messages.map(({ role, text: line }) => ({ role, text: line })),
          }),
        },
      ],
    });
    const value = demandParameters.parse(tryParseJson(text));
    const { assistantReply, needsClarification, ...demand } = value;
    return { demand, assistantReply, needsClarification };
  }

  async generate(
    workspaceId: string,
    draft: DemandDraft,
    config: NestLlmRuntimeConfig,
    signal?: AbortSignal,
    repair = false,
  ): Promise<AgentGeneration> {
    // 检索在服务端确定性完成，不再让模型用 function calling 自己发查询：
    // 候选资源一次性放进提示词，请求就退化成一次普通补全。
    const query = [
      draft.originalQuestion,
      draft.demand.problem,
      draft.demand.goal,
      draft.demand.currentMethod,
      draft.demand.inputs,
      draft.demand.aiRole,
      draft.demand.domain,
    ].filter(Boolean).join(' ');
    const [cases, tools, capabilities] = await Promise.all([
      this.resources.searchCases(workspaceId, query, 4),
      this.resources.searchTools(workspaceId, query, 4),
      this.resources.searchCapabilities(workspaceId, query, 4),
    ]);
    const collected = uniqueResources([...tools, ...capabilities, ...cases]).slice(0, 12);

    const text = await nestLlmStreamedText({
      config,
      signal,
      maxTokens: Math.max(config.maxTokens, repair ? 12_288 : 8_192),
      temperature: repair ? 0.1 : 0.3,
      messages: [
        {
          role: 'system',
          content:
            AI_KNOWLEDGE_SOLUTION_INSTRUCTIONS +
            SOLUTION_OUTPUT_CONTRACT +
            (repair
              ? '上一次输出不是合法 JSON 或缺少必填字段。这次务必只输出完整、可解析的 JSON。'
              : ''),
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: '检索结果已给出，请据此生成简洁、可执行的业务行动方案',
            question: draft.originalQuestion,
            demand: draft.demand,
            candidates: collected,
          }),
        },
      ],
    });

    const parsed = tryParseJson(text);
    const checked = solutionParameters.safeParse(parsed);
    return {
      // 解析失败时把原始值交给 sanitizeLlmSolution，由它决定是否退回规则方案。
      solution: checked.success ? checked.data : parsed,
      resources: collected,
    };
  }
}
