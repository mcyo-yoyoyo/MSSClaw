/**
 * Agent Hub 能力类型与运行平台配置。
 *
 * 能力类型优先读运营配置的 `capabilityTypeIds`；未配置时按名称 / 简介 /
 * 场景标签 / Skill id 关键词兜底推断，保证存量 Agent 也能展示能力类型。
 */

export type AgentCapabilityTypeId =
  | 'text_gen'
  | 'translate_polish'
  | 'material_review'
  | 'data_analysis'
  | 'qa_retrieval'
  | 'process_automation';

export interface AgentCapabilityTypeMeta {
  id: AgentCapabilityTypeId;
  label: string;
  icon: string;
  /** 兜底推断关键词（命中任一即归入该类型） */
  keywords: string[];
}

/** 六类能力标签，顺序即展示顺序 */
export const AGENT_CAPABILITY_TYPES: AgentCapabilityTypeMeta[] = [
  {
    id: 'text_gen',
    label: '文本生成',
    icon: 'fa-pen-nib',
    keywords: [
      '生成', '撰写', '写作', '文案', '报告', '周报', '总结', '纪要', '简报',
      '方案', '材料', 'PPT', '文档生成', 'doc-gen', 'report', 'summary', 'weekly',
    ],
  },
  {
    id: 'translate_polish',
    label: '翻译润色',
    icon: 'fa-language',
    keywords: ['翻译', '润色', '多语言', '本地化', 'translate', 'polish', 'i18n'],
  },
  {
    id: 'material_review',
    label: '材料审核',
    icon: 'fa-file-shield',
    keywords: [
      '审核', '合规', '风险', '筛查', '校验', '质检', '把关', '解读', '合同', '招投标',
      'compliance', 'review', 'audit',
    ],
  },
  {
    id: 'data_analysis',
    label: '数据分析',
    icon: 'fa-chart-line',
    keywords: [
      '分析', '洞察', '问数', '报表', '数据', '监测', '价格', '零售', '渠道', '经营',
      'analysis', 'insight', 'data', 'monitor', 'price', 'retail',
    ],
  },
  {
    id: 'qa_retrieval',
    label: '问答检索',
    icon: 'fa-magnifying-glass',
    keywords: [
      '问答', '检索', '搜索', '查询', '知识', '制度', '查制度', 'FAQ', '客服',
      'qa', 'search', 'retrieval', 'knowledge',
    ],
  },
  {
    id: 'process_automation',
    label: '流程自动化',
    icon: 'fa-bolt',
    keywords: [
      '自动化', '流程', '编排', '整理', '归档', '同步', '派发', '闭环', 'SOP', '工单',
      'automation', 'workflow', 'organize', 'pipeline',
    ],
  },
];

const CAPABILITY_TYPE_BY_ID = new Map(AGENT_CAPABILITY_TYPES.map((t) => [t.id, t]));

export function getAgentCapabilityTypeMeta(
  id: AgentCapabilityTypeId,
): AgentCapabilityTypeMeta | undefined {
  return CAPABILITY_TYPE_BY_ID.get(id);
}

export function getAgentCapabilityTypeLabel(id: AgentCapabilityTypeId): string {
  return CAPABILITY_TYPE_BY_ID.get(id)?.label ?? id;
}

/** 适配平台候选值；运营在 environment.platforms 中配置 */
export const AGENT_PLATFORM_PRESETS = [
  'MSS AI提效平台',
  '员工助手',
  '企业数字产线',
] as const;

/**
 * 能力类型解析只依赖这些字段，避免与 prototype/types 形成循环依赖。
 */
export interface AgentFilterSource {
  name?: string;
  desc?: string;
  bizLine?: string;
  scenarioTags?: string[];
  skillIds?: string[];
  capabilityTypeIds?: AgentCapabilityTypeId[];
}

function filterHaystack(agent: AgentFilterSource): string {
  return [
    agent.name ?? '',
    agent.desc ?? '',
    agent.bizLine ?? '',
    ...(agent.scenarioTags ?? []),
    ...(agent.skillIds ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * 解析 Agent 的能力类型。
 * 运营已配置时直接采用；否则按关键词推断，一个 Agent 可命中多类。
 */
export function resolveAgentCapabilityTypes(
  agent: AgentFilterSource,
): AgentCapabilityTypeId[] {
  const explicit = (agent.capabilityTypeIds ?? []).filter((id) =>
    CAPABILITY_TYPE_BY_ID.has(id),
  );
  if (explicit.length) return Array.from(new Set(explicit));

  const haystack = filterHaystack(agent);
  const hits = AGENT_CAPABILITY_TYPES.filter((type) =>
    type.keywords.some((kw) => haystack.includes(kw.toLowerCase())),
  ).map((type) => type.id);
  return hits;
}
