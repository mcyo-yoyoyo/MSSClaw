/**
 * Agent Hub 筛选维度（《Agent Hub页面优化建议 V1.4》§1.4）
 *
 * 五个维度中「职能 / 区域」沿用左栏组织轴（SidebarMarketFilters），
 * 本文件补齐余下三个页内维度：能力类型、开放范围、适配平台。
 *
 * 能力类型优先读运营配置的 `capabilityTypeIds`；未配置时按名称 / 简介 /
 * 场景标签 / Skill id 关键词兜底推断，保证存量 Agent 不用先补数据也可筛。
 */

import { ASSET_VISIBILITY_LABELS, type AssetVisibility } from '@/domain/orgTaxonomy';

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

/** §1.4「能力类型建议包含」六类，顺序即展示顺序 */
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

/** §1.3.10 适配平台候选值；运营在 environment.platforms 中配置 */
export const AGENT_PLATFORM_PRESETS = [
  'MSS AI提效作战平台',
  '员工助手',
  '企业数字产线',
] as const;

/** environment.platforms 缺省时的兜底平台（与详情页环境信息 Tab 一致） */
export const DEFAULT_AGENT_PLATFORM = 'MSS AI提效作战平台';

/**
 * 筛选只依赖这些字段，避免与 prototype/types 形成循环依赖。
 */
export interface AgentFilterSource {
  name?: string;
  desc?: string;
  bizLine?: string;
  scenarioTags?: string[];
  skillIds?: string[];
  capabilityTypeIds?: AgentCapabilityTypeId[];
  visibility?: AssetVisibility;
  environment?: { platforms?: string[] };
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

export function resolveAgentPlatforms(agent: AgentFilterSource): string[] {
  const configured = (agent.environment?.platforms ?? [])
    .map((p) => p.trim())
    .filter(Boolean);
  return configured.length ? Array.from(new Set(configured)) : [DEFAULT_AGENT_PLATFORM];
}

export function resolveAgentVisibility(agent: AgentFilterSource): AssetVisibility {
  return agent.visibility ?? 'public';
}

export const AGENT_VISIBILITY_FILTERS: { id: AssetVisibility; label: string }[] = (
  ['public', 'org', 'private'] as AssetVisibility[]
).map((id) => ({ id, label: ASSET_VISIBILITY_LABELS[id] }));

/** 页内筛选态：空数组 = 该维度不筛 */
export interface AgentHubFilterSelection {
  capabilityTypes: AgentCapabilityTypeId[];
  visibilities: AssetVisibility[];
  platforms: string[];
}

export function emptyAgentHubFilterSelection(): AgentHubFilterSelection {
  return { capabilityTypes: [], visibilities: [], platforms: [] };
}

export function isAgentHubFilterEmpty(selection: AgentHubFilterSelection): boolean {
  return (
    !selection.capabilityTypes.length &&
    !selection.visibilities.length &&
    !selection.platforms.length
  );
}

export function countAgentHubFilters(selection: AgentHubFilterSelection): number {
  return (
    selection.capabilityTypes.length +
    selection.visibilities.length +
    selection.platforms.length
  );
}

/** 同维度多选取并集，跨维度取交集 */
export function agentMatchesHubFilters(
  agent: AgentFilterSource,
  selection: AgentHubFilterSelection,
): boolean {
  if (selection.capabilityTypes.length) {
    const types = resolveAgentCapabilityTypes(agent);
    if (!selection.capabilityTypes.some((id) => types.includes(id))) return false;
  }
  if (selection.visibilities.length) {
    if (!selection.visibilities.includes(resolveAgentVisibility(agent))) return false;
  }
  if (selection.platforms.length) {
    const platforms = resolveAgentPlatforms(agent);
    if (!selection.platforms.some((p) => platforms.includes(p))) return false;
  }
  return true;
}

/**
 * 各维度在给定 Agent 集合下的可选项与命中数。
 * 计数按「除本维度外其余筛选已生效」统计，便于用户预判点下去还剩多少。
 */
export function buildAgentHubFilterFacets<T extends AgentFilterSource>(
  agents: T[],
  selection: AgentHubFilterSelection,
): {
  capabilityTypes: { id: AgentCapabilityTypeId; label: string; icon: string; count: number }[];
  visibilities: { id: AssetVisibility; label: string; count: number }[];
  platforms: { id: string; label: string; count: number }[];
} {
  const without = (dimension: keyof AgentHubFilterSelection) =>
    agents.filter((agent) =>
      agentMatchesHubFilters(agent, { ...selection, [dimension]: [] }),
    );

  const capabilityPool = without('capabilityTypes');
  const visibilityPool = without('visibilities');
  const platformPool = without('platforms');

  const platformLabels = new Set<string>(AGENT_PLATFORM_PRESETS);
  for (const agent of agents) {
    for (const p of resolveAgentPlatforms(agent)) platformLabels.add(p);
  }

  return {
    capabilityTypes: AGENT_CAPABILITY_TYPES.map((type) => ({
      id: type.id,
      label: type.label,
      icon: type.icon,
      count: capabilityPool.filter((agent) =>
        resolveAgentCapabilityTypes(agent).includes(type.id),
      ).length,
    })),
    visibilities: AGENT_VISIBILITY_FILTERS.map((item) => ({
      ...item,
      count: visibilityPool.filter((agent) => resolveAgentVisibility(agent) === item.id).length,
    })),
    platforms: Array.from(platformLabels).map((label) => ({
      id: label,
      label,
      count: platformPool.filter((agent) => resolveAgentPlatforms(agent).includes(label)).length,
    })),
  };
}
