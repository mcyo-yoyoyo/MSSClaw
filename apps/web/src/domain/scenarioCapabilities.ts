/** 发现页 · 业务场景能力轴（可运营排行对象） */

export const SCENARIO_CAPABILITY_CATEGORIES = [
  { id: 'collect', label: '数据采集', icon: 'fa-database', blurb: '爬取 / 采集 / 监测入湖' },
  { id: 'insight', label: '分析洞察', icon: 'fa-chart-line', blurb: '聚类 / 异动 / 匹配 / 核验' },
  { id: 'generate', label: '内容生成', icon: 'fa-pen-nib', blurb: '文案 / 课件 / 翻译 / 多媒体' },
  { id: 'execute', label: '流程执行', icon: 'fa-diagram-project', blurb: '对账 / 验收 / 面试协同' },
  { id: 'knowledge', label: '知识沉淀', icon: 'fa-book-open', blurb: 'RAG / 归档 / SOP' },
] as const;

export type ScenarioCapabilityId = (typeof SCENARIO_CAPABILITY_CATEGORIES)[number]['id'];

/**
 * Agent Hub / 发现页展示的场景包。
 * 可编排型能力（翻译 / 知识沉淀 / 经营报表 / 客服话术）已迁至 Skill Hub；
 * 此处保留案例型 Agent 场景，并增加营销 / 知识两门面专家。
 */
export const DISCOVER_SCENARIO_IDS = [
  'marketing-intel',
  'knowledge-qa',
  'price-offer-monitor',
  'ecommerce-review',
  'retail-training',
  'hr-interview',
  'fulfillment-settlement',
] as const;

export type DiscoverScenarioId = (typeof DISCOVER_SCENARIO_IDS)[number];

/** 场景 → 能力（主归属在前） */
export const SCENARIO_CAPABILITY_MAP: Record<DiscoverScenarioId, ScenarioCapabilityId[]> = {
  'marketing-intel': ['insight'],
  'knowledge-qa': ['knowledge', 'execute'],
  'price-offer-monitor': ['collect', 'insight'],
  'ecommerce-review': ['collect', 'generate', 'insight'],
  'retail-training': ['generate', 'execute'],
  'hr-interview': ['insight', 'execute'],
  'fulfillment-settlement': ['execute', 'insight'],
};

/** 演示用发布日期（用于「最新」排序） */
export const SCENARIO_PUBLISHED_AT: Record<DiscoverScenarioId, string> = {
  'marketing-intel': '2026-08-10',
  'knowledge-qa': '2026-08-10',
  'price-offer-monitor': '2026-07-12',
  'ecommerce-review': '2026-07-11',
  'retail-training': '2026-07-10',
  'hr-interview': '2026-07-09',
  'fulfillment-settlement': '2026-07-13',
};

export function isDiscoverScenarioId(id: string): id is DiscoverScenarioId {
  return (DISCOVER_SCENARIO_IDS as readonly string[]).includes(id);
}

export function scenarioBelongsToCapability(
  scenarioId: string,
  capabilityId: ScenarioCapabilityId | 'all',
): boolean {
  if (capabilityId === 'all') return isDiscoverScenarioId(scenarioId);
  if (!isDiscoverScenarioId(scenarioId)) return false;
  return SCENARIO_CAPABILITY_MAP[scenarioId].includes(capabilityId);
}

export function getScenarioCapabilities(scenarioId: string): ScenarioCapabilityId[] {
  if (!isDiscoverScenarioId(scenarioId)) return [];
  return SCENARIO_CAPABILITY_MAP[scenarioId];
}
