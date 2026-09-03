import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { matchesRequiredCaseIntent } from './ai-knowledge.relevance';
import type {
  AiKnowledgeMessage,
  AiKnowledgeScenarioId,
  AiKnowledgeSolution,
  DemandDraft,
  DemandFieldKey,
  DemandSummary,
  SolutionAction,
  SolutionCaseInsight,
  SolutionDiagnosis,
  SolutionResource,
  SolutionToolRecommendation,
} from './ai-knowledge.types';

const DEMAND_FIELDS: DemandFieldKey[] = [
  'humanCheckpoint',
  'goal',
  'inputs',
  'aiRole',
];

const INCOMPLETE_DEMAND_PATTERN = /待确认|待补充|尚待确认|尚未确认|尚未确定|需要确认|需要补充/;

function isDemandFieldComplete(value: string): boolean {
  const normalized = value.trim();
  return Boolean(normalized && !INCOMPLETE_DEMAND_PATTERN.test(normalized));
}

const SCENARIO_KEYWORDS: Array<{ id: AiKnowledgeScenarioId; keywords: string[] }> = [
  { id: 'gtm-sellout', keywords: ['sell out', 'sellout', 'psi', '预测', '销量'] },
  { id: 'ecommerce-voc', keywords: ['评论', 'voc', '差评', '电商', '多语种', '用户声音'] },
  { id: 'mkt-campaign', keywords: ['营销', '活动', '物料', 'campaign', '市场', 'mkt'] },
];

function message(role: AiKnowledgeMessage['role'], text: string): AiKnowledgeMessage {
  return { id: `msg-${randomUUID()}`, role, text, createdAt: new Date().toISOString() };
}

export function inferScenario(question: string): AiKnowledgeScenarioId {
  const normalized = question.trim().toLowerCase();
  let best: { id: AiKnowledgeScenarioId; score: number } = { id: 'generic', score: 0 };
  for (const row of SCENARIO_KEYWORDS) {
    const score = row.keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? keyword.length : 0),
      0,
    );
    if (score > best.score) best = { id: row.id, score };
  }
  return best.id;
}

function demandForScenario(scenarioId: AiKnowledgeScenarioId, question: string): DemandSummary {
  if (scenarioId === 'gtm-sellout') {
    return {
      title: '国家渠道 Sell Out 预测',
      domain: 'GTM',
      problem: '国家渠道 SKU Sell Out 预测依赖手工整合和个人经验，准备周期长。',
      goal: '缩短每周预测准备时间，输出可解释的预测建议和风险。',
      currentMethod: /excel/i.test(question) ? 'Excel + 人工经验' : '人工汇总数据并结合业务经验判断',
      inputs: /psi/i.test(question) ? 'PSI；其他输入待确认' : '待确认',
      aiRole: 'SKU级预测建议、风险说明和可复核的数据依据',
      humanCheckpoint: '待确认',
      pendingKeys: ['humanCheckpoint', 'inputs'],
    };
  }
  if (scenarioId === 'ecommerce-voc') {
    return {
      title: '多国家电商评论分析',
      domain: '电商',
      problem: '多平台、多语种评论分散，人工翻译和归纳难以及时发现共性问题。',
      goal: '形成可复核的评论主题、情绪趋势和优先行动建议。',
      currentMethod: '人工下载评论、翻译并整理周报',
      inputs: '待确认',
      aiRole: '可复核的评论主题、情绪趋势和优先行动建议',
      humanCheckpoint: '待确认',
      pendingKeys: ['humanCheckpoint', 'inputs'],
    };
  }
  if (scenarioId === 'mkt-campaign') {
    return {
      title: '营销活动材料整合',
      domain: 'MKT',
      problem: '活动材料分散在不同文档和渠道，信息整合、合规检查和行动归纳耗时。',
      goal: '快速形成统一活动摘要、待办事项和审核清单。',
      currentMethod: '人工收集材料并逐份核对',
      inputs: '待确认',
      aiRole: '统一活动摘要、材料缺口和可执行行动清单',
      humanCheckpoint: '待确认',
      pendingKeys: ['humanCheckpoint', 'inputs'],
    };
  }
  return {
    title: '业务问题行动方案',
    domain: '其他',
    problem: question.trim(),
    goal: '待确认',
    currentMethod: '计划使用AI完成该任务',
    inputs: '待确认',
    aiRole: '待确认',
    humanCheckpoint: '待确认',
    pendingKeys: ['humanCheckpoint', 'goal', 'inputs', 'aiRole'],
  };
}

function clarificationForScenario(scenarioId: AiKnowledgeScenarioId): string {
  if (scenarioId === 'gtm-sellout') return '请补充两点：你是什么业务角色？目前可以提供哪些数据给AI？';
  if (scenarioId === 'ecommerce-voc') return '请补充两点：你是什么业务角色？目前可以提供哪些评论或业务材料给AI？';
  if (scenarioId === 'mkt-campaign') return '请补充两点：你是什么业务角色？目前可以提供哪些活动材料给AI？';
  return '请先告诉我：你是什么业务角色，希望通过AI达到什么业务目标？';
}

export function createDraft(question: string): DemandDraft {
  const clean = question.trim();
  if (clean.length < 2 || clean.length > 2_000) {
    throw new BadRequestException('question_length_must_be_between_2_and_2000');
  }
  const scenarioId = inferScenario(clean);
  const now = new Date().toISOString();
  return {
    id: `draft-${randomUUID()}`,
    scenarioId,
    originalQuestion: clean,
    demand: demandForScenario(scenarioId, clean),
    messages: [message('user', clean), message('assistant', clarificationForScenario(scenarioId))],
    clarificationCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function inferInputs(answer: string, scenarioId: AiKnowledgeScenarioId): string {
  const hits: string[] = [];
  const checks = [
    ['PSI', /psi/i],
    ['历史销量', /历史|销量|销售数据/i],
    ['市场信号', /市场|促销|活动|渠道变化/i],
    ['评论数据', /评论|评价|review/i],
    ['活动Brief', /brief|活动方案/i],
    ['物料文件', /物料|文档|ppt|word|excel/i],
  ] as const;
  for (const [label, pattern] of checks) {
    if (pattern.test(answer) && !hits.includes(label)) hits.push(label);
  }
  if (hits.length) return hits.join('、');
  if (scenarioId === 'gtm-sellout') return 'PSI、历史销量；市场信号由业务人员补充';
  if (scenarioId === 'ecommerce-voc') return '多平台评论数据、国家和语种范围';
  if (scenarioId === 'mkt-campaign') return '活动Brief、物料文件和审批要求';
  return answer.trim();
}

function inferHumanCheckpoint(answer: string, scenarioId: AiKnowledgeScenarioId): string {
  const explicit = answer.match(/(?:由|最终由|负责人是)?([^，。；]{2,16}(?:负责人|主管|经理|运营|业务人员))(?:确认|审批|判断)?/);
  if (explicit?.[1]) return `${explicit[1]}确认最终结果。`;
  if (scenarioId === 'gtm-sellout') return '国家业务负责人确认最终预测。';
  if (scenarioId === 'ecommerce-voc') return '电商运营负责人确认问题优先级和行动。';
  if (scenarioId === 'mkt-campaign') return '活动负责人确认最终物料和发布动作。';
  return '业务负责人确认最终行动。';
}

export function clarifyDraft(draft: DemandDraft, answer: string): DemandDraft {
  const clean = answer.trim();
  if (!clean || clean.length > 2_000) throw new BadRequestException('invalid_clarification');
  return {
    ...draft,
    demand: { ...draft.demand },
    messages: [
      ...draft.messages,
      message('user', clean),
      message('assistant', '正在根据补充内容更新用户故事。'),
    ],
    clarificationCount: draft.clarificationCount + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function updateDraftDemand(draft: DemandDraft, patch: Partial<DemandSummary>): DemandDraft {
  const demand = { ...draft.demand };
  for (const key of DEMAND_FIELDS) {
    if (typeof patch[key] !== 'string') continue;
    const value = patch[key]!.trim().slice(0, 2_000);
    demand[key] = value || '待确认';
  }
  demand.pendingKeys = DEMAND_FIELDS.filter((key) => !isDemandFieldComplete(demand[key]));
  return { ...draft, demand, updatedAt: new Date().toISOString() };
}

export function canConfirmDemand(demand: DemandSummary): boolean {
  return demand.pendingKeys.length === 0
    && DEMAND_FIELDS.every((key) => isDemandFieldComplete(demand[key]));
}

export function buildDemandUserStory(demand: DemandSummary): string {
  if (!canConfirmDemand(demand)) return '';
  const role = demand.humanCheckpoint.replace(/(?:负责)?确认.*$/, '').trim();
  return `作为${role}，我希望将${demand.inputs}提交给AI，由AI生成${demand.aiRole}，从而${demand.goal.replace(/[。.]$/, '')}。`;
}

function baseActions(draft: DemandDraft, resources: SolutionResource[]): SolutionAction[] {
  const { demand, scenarioId } = draft;
  if (scenarioId === 'gtm-sellout') {
    return [
      { id: 'prepare', title: '准备并检查数据', owner: '数据接口人', input: demand.inputs, capability: '数据完整性检查', output: '字段完整性和异常清单', resources: resources.filter((r) => r.kind === 'tool').slice(0, 2) },
      { id: 'baseline', title: '生成基线预测', owner: '预测分析人员', input: '已检查的 PSI 和历史销量', capability: '预测分析 Skill', output: 'SKU级预测基线和异常值', resources: resources.filter((r) => r.kind === 'skill' || r.kind === 'case').slice(0, 3) },
      { id: 'signals', title: '补充市场信号并形成调整建议', owner: '国家业务人员', input: '促销、渠道和市场变化', capability: '趋势分析和风险解释', output: '调整建议、风险和解释' },
      { id: 'confirm', title: '确认最终预测', owner: demand.humanCheckpoint.replace(/确认.*$/, '') || '国家业务负责人', input: '预测基线和调整建议', output: '最终预测值和确认记录' },
    ];
  }
  if (scenarioId === 'ecommerce-voc') {
    return [
      { id: 'collect', title: '确定评论范围并汇总数据', owner: '电商数据接口人', input: demand.inputs, output: '统一评论数据表' },
      { id: 'translate', title: '完成多语种翻译和字段清洗', owner: '电商运营', input: '统一评论数据表', capability: '翻译与清洗', output: '可分析的标准化评论', resources: resources.filter((r) => r.kind === 'skill' || r.kind === 'case').slice(0, 3) },
      { id: 'analyze', title: '识别主题、情绪和异常趋势', owner: '评论分析负责人', input: '标准化评论', capability: '评论分析 Agent', output: '主题清单、趋势和代表性原文', resources: resources.filter((r) => r.kind === 'agent').slice(0, 2) },
      { id: 'decide', title: '确认优先问题和改进动作', owner: '电商运营负责人', input: '分析结果和原文证据', output: '问题优先级和行动清单' },
    ];
  }
  if (scenarioId === 'mkt-campaign') {
    return [
      { id: 'inventory', title: '汇总活动材料并建立清单', owner: '活动项目经理', input: demand.inputs, capability: '文档解析', output: '材料目录和缺失项' },
      { id: 'extract', title: '提取关键信息和一致性问题', owner: '内容运营', input: '活动Brief和现有物料', capability: '营销分析 Agent', output: '活动摘要和信息冲突清单', resources: resources.filter((r) => r.kind === 'agent' || r.kind === 'case').slice(0, 3) },
      { id: 'review', title: '完成内容与合规检查', owner: '审核负责人', input: '待发布物料', capability: '合规检查 Skill', output: '修改项和审核清单', resources: resources.filter((r) => r.kind === 'skill').slice(0, 2) },
      { id: 'confirm', title: '确认发布动作和责任人', owner: '活动负责人', input: '活动摘要、审核清单', output: '最终发布计划和行动项' },
    ];
  }
  return [
    { id: 'scope', title: '确认问题范围和成功标准', owner: '业务负责人', input: demand.problem, output: '明确的问题边界和目标' },
    { id: 'prepare', title: '准备所需数据和材料', owner: '业务接口人', input: demand.inputs, output: '可供分析的输入清单' },
    { id: 'analyze', title: '形成分析建议和行动清单', owner: '项目负责人', capability: 'AI辅助分析', output: '优先级明确的行动建议', resources: resources.slice(0, 4) },
    { id: 'confirm', title: '确认并安排下一步行动', owner: demand.humanCheckpoint.replace(/确认.*$/, '') || '业务负责人', output: '行动责任人与完成时间' },
  ];
}

function baseDiagnosis(draft: DemandDraft): SolutionDiagnosis {
  return {
    need: draft.demand.goal,
    currentSituation: `${draft.demand.problem} 当前主要通过${draft.demand.currentMethod}处理。`,
    keyProblems: [
      draft.demand.problem,
      `现有输入为${draft.demand.inputs}，需要先形成可供 AI 处理的稳定输入。`,
    ],
    solutionDirection: draft.demand.aiRole,
  };
}

function baseToolRecommendations(resources: SolutionResource[]): SolutionToolRecommendation[] {
  return resources
    .filter((resource) => resource.kind !== 'case')
    .slice(0, 3)
    .map((resource, index) => ({
      id: `tool-${index + 1}`,
      resource,
      problemSolved: conciseResourceText(resource.description) || `为业务流程补充${resource.label}所提供的 AI 能力。`,
      introduction: conciseResourceText(resource.description) || `${resource.label}是 MSS 已登记的${resource.kind === 'tool' ? 'AI 工具' : resource.kind === 'skill' ? 'Skill 能力' : 'Agent 能力'}。`,
      howToUse: ['准备已确认的业务输入', `使用${resource.label}完成对应处理`, '检查输出并交由业务人员复核'],
      output: conciseResourceText(resource.evidence, 120) || '形成可以进入下一步业务判断的结构化结果。',
      expectedEffect: '减少重复整理工作，并让处理过程和结果更容易复核。',
    }));
}

function baseCaseInsights(resources: SolutionResource[], draft: DemandDraft): SolutionCaseInsight[] {
  return resources
    .filter((resource) => resource.kind === 'case')
    .slice(0, 2)
    .map((resource, index) => ({
      id: `case-${index + 1}`,
      resource,
      similarProblem: conciseResourceText(resource.description) || `该案例与“${draft.demand.title}”存在相近的业务问题。`,
      approach: conciseResourceText(resource.caseApproach, 220)
        || conciseResourceText(resource.evidence)
        || '请查看案例原文中的实施路径。',
      result: conciseResourceText(resource.caseResult, 180) || '案例未披露量化结果',
      lessons: resource.caseLearnings
        ? [conciseResourceText(resource.caseLearnings, 220)]
        : ['结合当前业务条件验证案例做法'],
      applicability: '需要结合当前数据、流程和组织条件判断可迁移范围。',
      toolsUsed: resource.toolsUsed?.length ? resource.toolsUsed : ['案例原文未明确说明'],
    }));
}

function conciseResourceText(value: string | undefined, maxLength = 160): string {
  const clean = (value ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  const firstSentence = clean.match(/^.+?[。！？.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length >= 24 && firstSentence.length <= maxLength) {
    return firstSentence;
  }
  return `${clean.slice(0, maxLength).replace(/[，,；;：:\s]+$/, '')}…`;
}

export function buildRuleSolution(draft: DemandDraft, resources: SolutionResource[]): AiKnowledgeSolution {
  if (!canConfirmDemand(draft.demand)) throw new BadRequestException('demand_not_confirmable');
  const confirmations = draft.scenarioId === 'gtm-sellout'
    ? ['PSI字段完整性', '试点国家和SKU范围']
    : draft.scenarioId === 'ecommerce-voc'
      ? ['评论平台和时间范围', '原文抽样复核规则']
      : draft.scenarioId === 'mkt-campaign'
        ? ['必须纳入的材料范围', '最终审批责任人']
        : ['输入材料是否齐全', '最终责任人是否明确'];
  return {
    id: `solution-${randomUUID()}`,
    scenarioId: draft.scenarioId,
    title: `${draft.demand.title}行动方案`,
    domain: draft.demand.domain,
    maturity: draft.scenarioId === 'generic' ? '探索性建议' : '有依据建议',
    generationSource: 'rule',
    createdAt: new Date().toISOString(),
    originalQuestion: draft.originalQuestion,
    demand: draft.demand,
    messages: [...draft.messages, message('assistant', '需求已确认，行动方案已生成。')],
    target: draft.demand.goal.replace(/[。.]$/, ''),
    actions: baseActions(draft, resources),
    confirmations,
    evidence: resources,
    diagnosis: baseDiagnosis(draft),
    toolRecommendations: baseToolRecommendations(resources),
    caseInsights: baseCaseInsights(resources, draft),
  };
}

export function sanitizeLlmSolution(
  raw: unknown,
  base: AiKnowledgeSolution,
  resources: SolutionResource[],
  model: string,
): AiKnowledgeSolution | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const diagnosisRow = obj.diagnosis;
  const diagnosisObj = diagnosisRow && typeof diagnosisRow === 'object' && !Array.isArray(diagnosisRow)
    ? diagnosisRow as Record<string, unknown>
    : {};
  const diagnosis: SolutionDiagnosis = {
    need: textValue(diagnosisObj.need, 500) || base.diagnosis?.need || base.target,
    currentSituation: textValue(diagnosisObj.currentSituation, 700)
      || base.diagnosis?.currentSituation
      || base.demand.problem,
    keyProblems: stringList(diagnosisObj.keyProblems, 4, 300).length
      ? stringList(diagnosisObj.keyProblems, 4, 300)
      : base.diagnosis?.keyProblems ?? [base.demand.problem],
    solutionDirection: textValue(diagnosisObj.solutionDirection, 700)
      || base.diagnosis?.solutionDirection
      || base.demand.aiRole,
  };

  const toolRows = Array.isArray(obj.tools) ? obj.tools : [];
  const toolRecommendations = toolRows.slice(0, 3).map((item, index): SolutionToolRecommendation | null => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const resource = findResource(resources, row.resourceId, ['tool', 'skill', 'agent']);
    const howToUse = stringList(row.howToUse, 4, 300);
    if (!resource || !howToUse.length) return null;
    if (howToUse.some((step) => /准备(?:已确认的)?业务输入|完成对应处理|检查输出并(?:交由业务人员)?复核/.test(step))) {
      return null;
    }
    const output = textValue(row.output, 500);
    const expectedEffect = textValue(row.expectedEffect, 500);
    const recommendation: SolutionToolRecommendation = {
      id: `tool-${index + 1}`,
      resource,
      problemSolved: textValue(row.problemSolved, 500) || base.demand.problem,
      introduction: textValue(row.introduction, 500)
        || resource.description
        || `${resource.label}是本方案采用的AI能力。`,
      howToUse,
      output: output || expectedEffect || howToUse[howToUse.length - 1],
      expectedEffect: expectedEffect || output || `使用${resource.label}完成本次目标所需的处理。`,
    };
    return recommendation;
  }).filter((item): item is SolutionToolRecommendation => item !== null);

  const caseRows = Array.isArray(obj.cases) ? obj.cases : [];
  const caseInsights = caseRows.slice(0, 2).map((item, index): SolutionCaseInsight | null => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const resource = findResource(resources, row.resourceId, ['case']);
    const lessons = stringList(row.lessons, 4, 300);
    if (!resource) return null;
    const demandText = [
      base.originalQuestion,
      base.demand.problem,
      base.demand.goal,
      base.demand.inputs,
      base.demand.aiRole,
    ].join(' ');
    const approach = textValue(row.approach, 700);
    const similarProblem = textValue(row.similarProblem, 500);
    const sourceCaseText = [
      resource.label,
      resource.description,
      resource.caseApproach,
      resource.caseResult,
    ].filter(Boolean).join(' ');
    if (!matchesRequiredCaseIntent(demandText, sourceCaseText)) return null;
    if (!matchesRequiredCaseIntent(demandText, `${similarProblem} ${approach}`)) return null;
    if (!lessons.length || !matchesRequiredCaseIntent(demandText, lessons.join(' '))) return null;
    const insight: SolutionCaseInsight = {
      id: `case-${index + 1}`,
      resource,
      similarProblem: similarProblem
        || resource.description
        || `该案例与“${base.demand.title}”存在相近问题。`,
      approach: approach
        || resource.caseApproach
        || resource.evidence
        || '请查看案例原文中的实施路径。',
      result: textValue(row.result, 500) || resource.caseResult || '案例未披露量化结果',
      lessons: lessons.length
        ? lessons
        : resource.caseLearnings
          ? [resource.caseLearnings]
          : ['结合当前业务条件验证案例做法'],
      applicability: textValue(row.applicability, 500) || '需结合当前数据和流程确认可借鉴范围。',
      toolsUsed: resource.toolsUsed?.length
        ? resource.toolsUsed
        : ['案例原文未明确说明'],
    };
    return insight;
  }).filter((item): item is SolutionCaseInsight => item !== null);
  const hasStrongToolCandidate = strongToolCandidates(resources).length > 0;
  if (hasStrongToolCandidate && !toolRecommendations.length) return null;
  if (!toolRecommendations.length && !caseInsights.length) return null;
  return {
    ...base,
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim().slice(0, 120) : base.title,
    generationSource: 'llm',
    model,
    diagnosis,
    toolRecommendations,
    caseInsights,
  };
}

export function strongToolCandidates(resources: SolutionResource[]): SolutionResource[] {
  return resources.filter((resource) => {
    if (!['tool', 'skill', 'agent'].includes(resource.kind)) return false;
    if ((resource.relevanceScore ?? 0) < 40) return false;
    return (resource.matchReasons ?? []).some((reason) =>
      ['核心能力', '适用场景', '输入输出', '使用说明'].includes(reason),
    );
  });
}

function textValue(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  let items: string[] = [];
  if (Array.isArray(value)) {
    items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } else if (typeof value === 'string' && value.trim()) {
    const clean = value.trim();
    const numbered = clean
      .split(/(?:^|\s+)(?=\d{1,2}[.、）)]\s*)/)
      .map((item) => item.replace(/^\d{1,2}[.、）)]\s*/, '').trim())
      .filter(Boolean);
    items = numbered.length > 1 ? numbered : [clean];
  }
  return items.slice(0, maxItems).map((item) => item.slice(0, maxLength));
}

function findResource(
  resources: SolutionResource[],
  id: unknown,
  kinds: SolutionResource['kind'][],
): SolutionResource | undefined {
  if (typeof id !== 'string') return undefined;
  const target = id.trim().toLocaleLowerCase();
  return resources.find((resource) => kinds.includes(resource.kind) && (
    resource.id?.trim().toLocaleLowerCase() === target
    || resource.label.trim().toLocaleLowerCase() === target
  ));
}
