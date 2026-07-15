/** 发现页 · 业务场景能力轴（可运营排行对象） */

export const SCENARIO_CAPABILITY_CATEGORIES = [
  { id: 'collect', label: '数据采集', icon: 'fa-database', blurb: '爬取 / 采集 / 监测入湖' },
  { id: 'insight', label: '分析洞察', icon: 'fa-chart-line', blurb: '聚类 / 异动 / 匹配 / 核验' },
  { id: 'generate', label: '内容生成', icon: 'fa-pen-nib', blurb: '文案 / 课件 / 翻译 / 多媒体' },
  { id: 'execute', label: '流程执行', icon: 'fa-diagram-project', blurb: '对账 / 验收 / 面试协同' },
  { id: 'knowledge', label: '知识沉淀', icon: 'fa-book-open', blurb: 'RAG / 归档 / SOP' },
] as const;

export type ScenarioCapabilityId = (typeof SCENARIO_CAPABILITY_CATEGORIES)[number]['id'];

/** 发现页展示的 7 个业务场景（排除平台总览 mss-ai-platform） */
export const DISCOVER_SCENARIO_IDS = [
  'price-offer-monitor',
  'ecommerce-review',
  'retail-training',
  'hr-interview',
  'l10n-translation',
  'fulfillment-settlement',
  'knowledge-deposit',
] as const;

export type DiscoverScenarioId = (typeof DISCOVER_SCENARIO_IDS)[number];

/** 场景 → 能力（主归属在前） */
export const SCENARIO_CAPABILITY_MAP: Record<DiscoverScenarioId, ScenarioCapabilityId[]> = {
  'price-offer-monitor': ['collect', 'insight'],
  'ecommerce-review': ['collect', 'insight'],
  'retail-training': ['generate'],
  'hr-interview': ['insight', 'execute'],
  'l10n-translation': ['generate'],
  'fulfillment-settlement': ['execute', 'insight'],
  'knowledge-deposit': ['knowledge'],
};

/** 演示用发布日期（用于「最新」排序） */
export const SCENARIO_PUBLISHED_AT: Record<DiscoverScenarioId, string> = {
  'price-offer-monitor': '2026-07-12',
  'ecommerce-review': '2026-07-11',
  'retail-training': '2026-07-10',
  'hr-interview': '2026-07-09',
  'l10n-translation': '2026-07-08',
  'fulfillment-settlement': '2026-07-13',
  'knowledge-deposit': '2026-07-07',
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
