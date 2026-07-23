import type { DiscoverScenarioId } from '@/domain/scenarioCapabilities';
import { isDiscoverScenarioId } from '@/domain/scenarioCapabilities';

/**
 * 业务场景篮子（广场 / AI任务主线）
 * 一级 Tab 统一四字业务名；能力轴降为次要标签。
 */
export const BUSINESS_SCENARIO_CATEGORIES = [
  {
    id: 'S1',
    label: '市场洞察',
    fullLabel: '市场与竞争洞察',
    icon: 'fa-chart-line',
    blurb: '竞品、价格、舆情与市场情报',
    tabVisible: true,
  },
  {
    id: 'S2',
    label: '内容生成',
    fullLabel: '内容生成与调优',
    icon: 'fa-pen-nib',
    blurb: '文案、本地化、培训内容与活动物料',
    tabVisible: true,
  },
  {
    id: 'S3',
    label: '销售赋能',
    fullLabel: '销售赋能与转化',
    icon: 'fa-handshake',
    blurb: '线索、话术陪练与成交辅助',
    tabVisible: true,
  },
  {
    id: 'S5',
    label: '客户服务',
    fullLabel: '客户服务与运营',
    icon: 'fa-headset',
    blurb: '客服、工单与满意度运营',
    tabVisible: true,
  },
  {
    id: 'S8',
    label: '数据分析',
    fullLabel: '数据分析与报表洞察',
    icon: 'fa-chart-column',
    blurb: '多源分析、SO/SI 报表与经营归因',
    tabVisible: true,
  },
  {
    id: 'S4',
    label: '合规结算',
    fullLabel: '合规筛查与结算对账',
    icon: 'fa-scale-balanced',
    blurb: '合规筛查、对账结算与核验',
    tabVisible: true,
  },
  {
    id: 'S6',
    label: '知识问答',
    fullLabel: '企业知识检索与问答',
    icon: 'fa-book-open',
    blurb: '制度案例检索、知识问答与复用',
    tabVisible: true,
  },
  {
    id: 'S7',
    label: '日常办公',
    fullLabel: '日常办公与协作提效',
    icon: 'fa-briefcase',
    blurb: '会议纪要、工作总结、招聘与归档',
    tabVisible: true,
  },
] as const;

export type BusinessScenarioId = (typeof BUSINESS_SCENARIO_CATEGORIES)[number]['id'];

/** 一级筛选可见的业务场景（不含建设中空篮） */
export function listVisibleBusinessScenarioCategories() {
  return BUSINESS_SCENARIO_CATEGORIES.filter((c) => c.tabVisible);
}

/** 发现场景 → 主业务篮子 */
export const DISCOVER_TO_BUSINESS_SCENARIO: Record<DiscoverScenarioId, BusinessScenarioId> = {
  'price-offer-monitor': 'S1',
  'ecommerce-review': 'S1',
  'l10n-translation': 'S2',
  'retail-training': 'S3',
  'customer-service': 'S5',
  'ops-analytics': 'S8',
  'fulfillment-settlement': 'S4',
  'knowledge-deposit': 'S6',
  'hr-interview': 'S7',
};

/** 热门宫格：有内容的篮子优先展示代表场景 */
export const BUSINESS_SCENARIO_FEATURED_DISCOVER: Partial<
  Record<BusinessScenarioId, DiscoverScenarioId>
> = {
  S1: 'price-offer-monitor',
  S2: 'l10n-translation',
  S3: 'retail-training',
  S4: 'fulfillment-settlement',
  S5: 'customer-service',
  S6: 'knowledge-deposit',
  S7: 'hr-interview',
  S8: 'ops-analytics',
};

export function isBusinessScenarioId(id: string): id is BusinessScenarioId {
  return BUSINESS_SCENARIO_CATEGORIES.some((c) => c.id === id);
}

export function getBusinessScenarioMeta(id: BusinessScenarioId) {
  return BUSINESS_SCENARIO_CATEGORIES.find((c) => c.id === id)!;
}

export function getPrimaryBusinessScenario(
  discoverScenarioId: string,
): BusinessScenarioId | null {
  if (!isDiscoverScenarioId(discoverScenarioId)) return null;
  return DISCOVER_TO_BUSINESS_SCENARIO[discoverScenarioId];
}

export function scenarioBelongsToBusiness(
  discoverScenarioId: string,
  businessId: BusinessScenarioId | 'all',
): boolean {
  if (businessId === 'all') return isDiscoverScenarioId(discoverScenarioId);
  return getPrimaryBusinessScenario(discoverScenarioId) === businessId;
}

/** 热门场景入口：有代表场景的篮子 + 建设中占位 */
export function listHotBusinessScenarioEntries(): Array<{
  businessId: BusinessScenarioId;
  label: string;
  icon: string;
  blurb: string;
  discoverId: DiscoverScenarioId | null;
  comingSoon: boolean;
}> {
  return listVisibleBusinessScenarioCategories().map((c) => {
    const discoverId = BUSINESS_SCENARIO_FEATURED_DISCOVER[c.id] ?? null;
    return {
      businessId: c.id,
      label: c.label,
      icon: c.icon,
      blurb: c.blurb,
      discoverId,
      comingSoon: !discoverId,
    };
  });
}
