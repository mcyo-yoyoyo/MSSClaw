export type AiKnowledgeScenarioId = 'gtm-sellout' | 'ecommerce-voc' | 'mkt-campaign' | 'generic';

export type AiKnowledgeMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

export type DemandFieldKey =
  | 'problem'
  | 'goal'
  | 'currentMethod'
  | 'inputs'
  | 'aiRole'
  | 'humanCheckpoint';

export type DemandSummary = Record<DemandFieldKey, string> & {
  title: string;
  domain: string;
  pendingKeys: DemandFieldKey[];
};

const DEMAND_FIELDS: DemandFieldKey[] = [
  'humanCheckpoint',
  'goal',
  'inputs',
  'aiRole',
];

export type SolutionResource = {
  id?: string;
  kind: 'case' | 'tool' | 'skill' | 'agent';
  label: string;
  url?: string;
  description?: string;
  evidence?: string;
  capabilities?: string[];
  scenarios?: string[];
  bestFor?: string;
  caseApproach?: string;
  caseLearnings?: string;
  caseResult?: string;
  toolsUsed?: string[];
  relevanceScore?: number;
  matchReasons?: string[];
};

export type SolutionAction = {
  id: string;
  title: string;
  owner: string;
  input?: string;
  capability?: string;
  output: string;
  resources?: SolutionResource[];
};

export type SolutionDiagnosis = {
  need: string;
  currentSituation: string;
  keyProblems: string[];
  solutionDirection: string;
};

export type SolutionToolRecommendation = {
  id: string;
  resource: SolutionResource;
  problemSolved: string;
  introduction: string;
  howToUse: string[];
  output: string;
  expectedEffect: string;
};

export type SolutionCaseInsight = {
  id: string;
  resource: SolutionResource;
  similarProblem: string;
  approach: string;
  result: string;
  lessons: string[];
  applicability: string;
  toolsUsed?: string[];
};

export type AiKnowledgeSolution = {
  id: string;
  scenarioId: AiKnowledgeScenarioId;
  title: string;
  domain: string;
  maturity: '已验证方案' | '有依据建议' | '探索性建议';
  generationSource?: 'llm' | 'rule';
  model?: string;
  createdAt: string;
  originalQuestion: string;
  demand: DemandSummary;
  messages: AiKnowledgeMessage[];
  target: string;
  actions: SolutionAction[];
  confirmations: string[];
  evidence?: SolutionResource[];
  diagnosis?: SolutionDiagnosis;
  toolRecommendations?: SolutionToolRecommendation[];
  caseInsights?: SolutionCaseInsight[];
};

export type DemandDraft = {
  id?: string;
  scenarioId: AiKnowledgeScenarioId;
  originalQuestion: string;
  demand: DemandSummary;
  messages: AiKnowledgeMessage[];
  clarificationCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export const AI_KNOWLEDGE_PROMPTS = [
  '如何提高国家渠道 Sell Out 预测效率？',
  '如何分析多国家、多语种的电商评论？',
  '如何整合营销活动材料并形成行动建议？',
] as const;

export const AI_KNOWLEDGE_CASE_LIBRARY_URL =
  (import.meta as ImportMeta & { env?: { VITE_AI_CASE_LIBRARY_URL?: string } }).env?.VITE_AI_CASE_LIBRARY_URL?.trim() ||
  'http://localhost:4174/index.html';

const STORAGE_KEY = 'mss-ai-knowledge-solutions-v1';

const FIELD_LABELS: Record<DemandFieldKey, string> = {
  problem: '要解决的问题',
  goal: '业务目标',
  currentMethod: '当前方式',
  inputs: '现有输入',
  aiRole: '期望输出',
  humanCheckpoint: '使用者角色',
};

const SCENARIO_KEYWORDS: Array<{ id: AiKnowledgeScenarioId; keywords: string[] }> = [
  { id: 'gtm-sellout', keywords: ['sell out', 'sellout', 'psi', '预测', '销量'] },
  { id: 'ecommerce-voc', keywords: ['评论', 'voc', '差评', '电商', '多语种', '用户声音'] },
  { id: 'mkt-campaign', keywords: ['营销', '活动', '物料', 'campaign', '市场', 'mkt'] },
];

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function message(role: AiKnowledgeMessage['role'], text: string): AiKnowledgeMessage {
  return { id: createId('msg'), role, text, createdAt: nowIso() };
}

export function demandFieldLabel(key: DemandFieldKey): string {
  return FIELD_LABELS[key];
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
      inputs: '评论平台、国家范围和历史评论数据待确认',
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
      inputs: '活动Brief、物料和审批要求待确认',
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

export function startDemandDraft(question: string): DemandDraft {
  const clean = question.trim();
  const scenarioId = inferScenario(clean);
  return {
    scenarioId,
    originalQuestion: clean,
    demand: demandForScenario(scenarioId, clean),
    messages: [message('user', clean), message('assistant', clarificationForScenario(scenarioId))],
    clarificationCount: 0,
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

export function applyClarification(draft: DemandDraft, answer: string): DemandDraft {
  const clean = answer.trim();
  const nextDemand: DemandSummary = {
    ...draft.demand,
    inputs: inferInputs(clean, draft.scenarioId),
    humanCheckpoint: inferHumanCheckpoint(clean, draft.scenarioId),
    pendingKeys: [],
  };
  return {
    ...draft,
    demand: nextDemand,
    clarificationCount: draft.clarificationCount + 1,
    messages: [
      ...draft.messages,
      message('user', clean),
      message(
        'assistant',
        '需求摘要已经更新。请检查右侧内容；确认无误后，我会基于相关案例、工具和内部能力生成一次性行动方案。',
      ),
    ],
  };
}

export function updateDemandField(
  draft: DemandDraft,
  key: DemandFieldKey,
  value: string,
): DemandDraft {
  const clean = value.trim();
  const complete = isDemandFieldComplete(clean);
  return {
    ...draft,
    demand: {
      ...draft.demand,
      [key]: clean || '待确认',
      pendingKeys: complete
        ? draft.demand.pendingKeys.filter((item) => item !== key)
        : [...new Set([...draft.demand.pendingKeys, key])],
    },
  };
}

export function canConfirmDemand(demand: DemandSummary): boolean {
  return demand.pendingKeys.length === 0
    && DEMAND_FIELDS.every((key) => isDemandFieldComplete(demand[key]));
}

export function demandUserStory(demand: DemandSummary): string {
  if (!canConfirmDemand(demand)) return '';
  const role = demand.humanCheckpoint.replace(/(?:负责)?确认.*$/, '').trim();
  return `作为${role}，我希望将${demand.inputs}提交给AI，由AI生成${demand.aiRole}，从而${demand.goal.replace(/[。.]$/, '')}。`;
}

function isDemandFieldComplete(value: string): boolean {
  const normalized = value.trim();
  return Boolean(
    normalized
    && !/待确认|待补充|尚待确认|尚未确认|尚未确定|需要确认|需要补充/.test(normalized),
  );
}

const CASE_URLS: Partial<Record<AiKnowledgeScenarioId, string>> = {
  'ecommerce-voc': `${AI_KNOWLEDGE_CASE_LIBRARY_URL.replace(/index\.html$/, '')}cases/claude-reversia-reversia-translates-e-commerce-stores-across-110-languages-with-claude.html`,
};

function resourcesForScenario(scenarioId: AiKnowledgeScenarioId): SolutionResource[] {
  if (scenarioId === 'gtm-sellout') {
    return [
      { kind: 'skill', label: 'Sell Out Forecast Assistant' },
      { kind: 'tool', label: '数据分析工具' },
      { kind: 'case', label: '海外区域预测案例', url: AI_KNOWLEDGE_CASE_LIBRARY_URL },
    ];
  }
  if (scenarioId === 'ecommerce-voc') {
    return [
      { kind: 'agent', label: '评论分析 Agent' },
      { kind: 'skill', label: '评论语种翻译' },
      { kind: 'case', label: 'Reversia 多语种电商案例', url: CASE_URLS[scenarioId] },
    ];
  }
  if (scenarioId === 'mkt-campaign') {
    return [
      { kind: 'agent', label: '营销 Agent' },
      { kind: 'skill', label: 'DocComplianceChecker' },
      { kind: 'case', label: '海外营销运营案例', url: AI_KNOWLEDGE_CASE_LIBRARY_URL },
    ];
  }
  return [{ kind: 'case', label: '浏览相关海外案例', url: AI_KNOWLEDGE_CASE_LIBRARY_URL }];
}

function actionsForScenario(
  scenarioId: AiKnowledgeScenarioId,
  demand: DemandSummary,
): SolutionAction[] {
  const resources = resourcesForScenario(scenarioId);
  if (scenarioId === 'gtm-sellout') {
    return [
      { id: 'prepare', title: '准备并检查数据', owner: '数据接口人', input: demand.inputs, capability: '数据完整性检查', output: '字段完整性和异常清单', resources: resources.filter((r) => r.kind === 'tool') },
      { id: 'baseline', title: '生成基线预测', owner: '预测分析人员', input: '已检查的 PSI 和历史销量', capability: 'Sell Out Forecast Skill', output: 'SKU级预测基线和异常值', resources: resources.filter((r) => r.kind === 'skill' || r.kind === 'case') },
      { id: 'signals', title: '补充市场信号并形成调整建议', owner: '国家业务人员', input: '促销、渠道和市场变化', capability: '趋势分析和风险解释', output: '调整建议、风险和解释' },
      { id: 'confirm', title: '确认最终预测', owner: demand.humanCheckpoint.replace(/确认.*$/, '') || '国家业务负责人', input: '预测基线和调整建议', output: '最终预测值和确认记录' },
    ];
  }
  if (scenarioId === 'ecommerce-voc') {
    return [
      { id: 'collect', title: '确定评论范围并汇总数据', owner: '电商数据接口人', input: demand.inputs, capability: '评论数据采集', output: '统一评论数据表' },
      { id: 'translate', title: '完成多语种翻译和字段清洗', owner: '电商运营', input: '统一评论数据表', capability: '评论语种翻译 Skill', output: '可分析的标准化评论', resources: resources.filter((r) => r.kind === 'skill' || r.kind === 'case') },
      { id: 'analyze', title: '识别主题、情绪和异常趋势', owner: '评论分析负责人', input: '标准化评论', capability: '评论分析 Agent', output: '主题清单、趋势和代表性原文', resources: resources.filter((r) => r.kind === 'agent') },
      { id: 'decide', title: '确认优先问题和改进动作', owner: '电商运营负责人', input: '分析结果和原文证据', output: '问题优先级和行动清单' },
    ];
  }
  if (scenarioId === 'mkt-campaign') {
    return [
      { id: 'inventory', title: '汇总活动材料并建立清单', owner: '活动项目经理', input: demand.inputs, capability: '文档解析', output: '材料目录和缺失项' },
      { id: 'extract', title: '提取关键信息和一致性问题', owner: '内容运营', input: '活动Brief和现有物料', capability: '营销 Agent', output: '活动摘要和信息冲突清单', resources: resources.filter((r) => r.kind === 'agent' || r.kind === 'case') },
      { id: 'review', title: '完成内容与合规检查', owner: '审核负责人', input: '待发布物料', capability: 'DocComplianceChecker', output: '修改项和审核清单', resources: resources.filter((r) => r.kind === 'skill') },
      { id: 'confirm', title: '确认发布动作和责任人', owner: '活动负责人', input: '活动摘要、审核清单', output: '最终发布计划和行动项' },
    ];
  }
  return [
    { id: 'scope', title: '确认问题范围和成功标准', owner: '业务负责人', input: demand.problem, output: '明确的问题边界和目标' },
    { id: 'prepare', title: '准备所需数据和材料', owner: '业务接口人', input: demand.inputs, output: '可供分析的输入清单' },
    { id: 'analyze', title: '形成分析建议和行动清单', owner: '项目负责人', capability: 'AI辅助分析', output: '优先级明确的行动建议', resources },
    { id: 'confirm', title: '确认并安排下一步行动', owner: demand.humanCheckpoint.replace(/确认.*$/, '') || '业务负责人', output: '行动责任人与完成时间' },
  ];
}

function diagnosisForDraft(draft: DemandDraft): SolutionDiagnosis {
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

function recommendationsForScenario(scenarioId: AiKnowledgeScenarioId): SolutionToolRecommendation[] {
  return resourcesForScenario(scenarioId)
    .filter((resource) => resource.kind !== 'case')
    .map((resource, index) => ({
      id: `tool-${index + 1}`,
      resource,
      problemSolved: `使用${resource.label}处理当前流程中的对应重复工作。`,
      introduction: `${resource.label}是 MSS 已登记的${resource.kind === 'tool' ? 'AI 工具' : resource.kind === 'skill' ? 'Skill 能力' : 'Agent 能力'}。`,
      howToUse: ['准备已确认的业务输入', `使用${resource.label}完成处理`, '抽样检查结果并进入业务判断'],
      output: '形成可供业务人员复核和继续使用的结构化结果。',
      expectedEffect: '减少重复整理工作，并提升信息处理的一致性。',
    }));
}

function caseInsightsForScenario(scenarioId: AiKnowledgeScenarioId, demand: DemandSummary): SolutionCaseInsight[] {
  return resourcesForScenario(scenarioId)
    .filter((resource) => resource.kind === 'case')
    .map((resource, index) => ({
      id: `case-${index + 1}`,
      resource,
      similarProblem: `该案例与“${demand.title}”存在相近的业务问题。`,
      approach: '案例通过引入 AI 能力重组原有信息处理流程。',
      result: '具体效果以案例原文披露为准。',
      lessons: ['先从边界清晰的任务开始验证', '保留人工复核点和原始证据'],
      applicability: '需要结合当前数据、流程和组织条件判断可迁移范围。',
      toolsUsed: resource.toolsUsed?.length ? resource.toolsUsed : ['案例原文未明确说明'],
    }));
}

export function buildSolution(draft: DemandDraft): AiKnowledgeSolution {
  const title = `${draft.demand.title}行动方案`;
  const confirmations =
    draft.scenarioId === 'gtm-sellout'
      ? ['PSI字段完整性', '试点国家和SKU范围']
      : draft.scenarioId === 'ecommerce-voc'
        ? ['评论平台和时间范围', '原文抽样复核规则']
        : draft.scenarioId === 'mkt-campaign'
          ? ['必须纳入的材料范围', '最终审批责任人']
          : ['输入材料是否齐全', '最终责任人是否明确'];
  return {
    id: createId('solution'),
    scenarioId: draft.scenarioId,
    title,
    domain: draft.demand.domain,
    maturity: draft.scenarioId === 'generic' ? '探索性建议' : '有依据建议',
    createdAt: nowIso(),
    originalQuestion: draft.originalQuestion,
    demand: draft.demand,
    messages: [
      ...draft.messages,
      message('assistant', '需求已确认，行动方案已生成。'),
    ],
    target: draft.demand.goal.replace(/[。.]$/, ''),
    actions: actionsForScenario(draft.scenarioId, draft.demand),
    confirmations,
    diagnosis: diagnosisForDraft(draft),
    toolRecommendations: recommendationsForScenario(draft.scenarioId),
    caseInsights: caseInsightsForScenario(draft.scenarioId, draft.demand),
  };
}

export function loadAiKnowledgeSolutions(): AiKnowledgeSolution[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AiKnowledgeSolution =>
        Boolean(item && typeof item === 'object' && 'id' in item && 'title' in item),
    );
  } catch {
    return [];
  }
}

export function saveAiKnowledgeSolution(solution: AiKnowledgeSolution): AiKnowledgeSolution[] {
  const next = [solution, ...loadAiKnowledgeSolutions().filter((item) => item.id !== solution.id)].slice(0, 50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeAiKnowledgeSolution(id: string): AiKnowledgeSolution[] {
  const next = loadAiKnowledgeSolutions().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function formatSolutionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
