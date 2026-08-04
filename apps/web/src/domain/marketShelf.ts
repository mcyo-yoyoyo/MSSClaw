/**
 * MSS AI 工具平台 · 货架
 * 统一卡片模型：外部工具精选 / 公司工具推荐 / MSS工具集市
 */

import {
  getNavCategoryMeta,
  resolveAiToolNavCategories,
  resolveToolMarketShelf,
} from '@/domain/aiToolCategories';
import { canViewAsset, type AssetViewerContext } from '@/domain/assetVisibility';
import {
  DISCOVER_TO_BUSINESS_SCENARIO,
  getBusinessScenarioMeta,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import {
  anyItemMatchesOrgPerspective,
  emptyOrgPerspectiveSelection,
  isOrgPerspectiveEmpty,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { FEATURED_SCENARIOS, type ScenarioDef } from '@/domain/portalMap';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { resolveToolFeaturedInFindCases } from '@/domain/plazaToolPicks';
import {
  DISCOVER_SCENARIO_IDS,
  type DiscoverScenarioId,
} from '@/domain/scenarioCapabilities';
import {
  getDeptLabel,
  getRegionLabel,
  regionMatchesSelection,
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import { heatScore, type ContentEngagement } from '@/domain/contentEngagement';
import {
  resolveToolBusinessScenarios,
  toolMatchesBusinessScenario,
} from '@/domain/toolBusinessScenarios';

export type MarketShelfKind = 'external' | 'internal' | 'projects';

export const MARKET_SHELF_META: Record<
  MarketShelfKind,
  { view: 'market-external' | 'market-internal' | 'market-projects'; label: string; shortLabel: string }
> = {
  external: {
    view: 'market-external',
    label: '外部工具精选',
    shortLabel: '外精选',
  },
  internal: {
    view: 'market-internal',
    label: '公司工具推荐',
    shortLabel: '公司',
  },
  projects: {
    view: 'market-projects',
    label: 'MSS工具集市',
    shortLabel: 'MSS',
  },
};

/** 卡片主 CTA：按能力诚实展示 */
export type MarketPrimaryAction = 'open' | 'howto' | 'detail' | 'run';

export type MarketShelfCard = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  description: string;
  /** 外部工具：真实产品名（弱化展示在场景标题下） */
  productName?: string;
  icon: string;
  logoUrl?: string;
  /** 领域 / 区域 / 类型 */
  badges: { label: string; tone?: 'dept' | 'region' | 'type' }[];
  featured: boolean;
  heat: number;
  homepageUrl?: string;
  scenarioId?: string;
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
  hasHowto: boolean;
  /** AI 项目：是否已挂载可站内执行的 Skill/Agent */
  runnable?: boolean;
  /** 展示用更新时间（YYYY-MM-DD） */
  updatedAt?: string;
  primaryAction: MarketPrimaryAction;
};

/** 外部工具卡：场景/能力作主标题，产品名弱化；运营可配 marketTitle */
function externalToolPresentation(tool: PrototypeToolSeed): {
  title: string;
  productName: string;
  description: string;
} {
  const configured = tool.marketTitle?.trim();
  if (configured) {
    const oneLine = (tool.desc || '')
      .replace(/\s+/g, ' ')
      .split(/[。！？.!?\n]/)[0]
      .trim();
    return {
      title: configured,
      productName: tool.name,
      description: oneLine || tool.desc || '',
    };
  }
  const caps = resolveAiToolNavCategories(tool);
  const capLabel = caps
    .map((id) => getNavCategoryMeta(id)?.label)
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');
  const biz = resolveToolBusinessScenarios(tool)[0];
  const bizLabel = biz ? getBusinessScenarioMeta(biz).label : '';
  // 主标题优先 AI 应用能力；辅以业务场景，避免大量卡片同名「日常办公」
  const title = capLabel
    ? bizLabel && bizLabel !== '日常办公'
      ? `${capLabel} · ${bizLabel}`
      : capLabel
    : bizLabel || tool.name;
  const oneLine = (tool.desc || '')
    .replace(/\s+/g, ' ')
    .split(/[。！？.!?\n]/)[0]
    .trim();
  return {
    title,
    productName: tool.name,
    description: oneLine || tool.desc || '',
  };
}

export function marketKindFromView(view: string): MarketShelfKind | null {
  if (view === 'market-external') return 'external';
  if (view === 'market-internal') return 'internal';
  if (view === 'market-projects') return 'projects';
  return null;
}

function toolBadges(tool: PrototypeToolSeed): MarketShelfCard['badges'] {
  const badges: MarketShelfCard['badges'] = [];
  const dept = tool.ownerDeptIds?.[0];
  if (dept) badges.push({ label: getDeptLabel(dept), tone: 'dept' });
  if (tool.ownerRegionId) {
    badges.push({ label: getRegionLabel(tool.ownerRegionId), tone: 'region' });
  }
  const src =
    tool.sourceType ?? (tool.tags?.includes('hw-internal') ? 'internal' : 'external');
  badges.push({ label: src === 'internal' ? '内部工具' : '外部工具', tone: 'type' });
  return badges;
}

function scenarioBadges(def: ScenarioDef): MarketShelfCard['badges'] {
  const badges: MarketShelfCard['badges'] = [{ label: 'AI 项目', tone: 'type' }];
  const biz = DISCOVER_TO_BUSINESS_SCENARIO[def.id as DiscoverScenarioId];
  if (biz) {
    badges.unshift({ label: getBusinessScenarioMeta(biz).label, tone: 'dept' });
  }
  return badges;
}

function toolHasLaunchUrl(tool: PrototypeToolSeed): boolean {
  return Boolean(tool.homepageUrl && tool.homepageUrl !== '#');
}

function toolMatchesFilters(
  tool: PrototypeToolSeed,
  org: OrgPerspectiveSelection,
  business: BusinessScenarioId | 'all',
): boolean {
  if (!isOrgPerspectiveEmpty(org)) {
    const deptOk =
      !org.dept.length || (tool.ownerDeptIds ?? []).some((d) => org.dept.includes(d));
    const regionOk = regionMatchesSelection(tool.ownerRegionId, org.region);
    if (!deptOk || !regionOk) return false;
  }
  return toolMatchesBusinessScenario(tool, business);
}

function projectMatchesFilters(
  def: ScenarioDef,
  org: OrgPerspectiveSelection,
  business: BusinessScenarioId | 'all',
  portalItems: PortalContentItem[],
): boolean {
  const biz = DISCOVER_TO_BUSINESS_SCENARIO[def.id as DiscoverScenarioId];
  if (business !== 'all' && biz && biz !== business) return false;
  if (business !== 'all' && !biz) return false;
  if (!isOrgPerspectiveEmpty(org)) {
    // 无归属材料时视为全域项目，避免「假空」
    if (!portalItems.length) return true;
    if (!anyItemMatchesOrgPerspective(portalItems, org)) return false;
  }
  return true;
}

export function listMarketToolCards(
  tools: PrototypeToolSeed[],
  kind: 'external' | 'internal',
  viewer: AssetViewerContext,
  org: OrgPerspectiveSelection = emptyOrgPerspectiveSelection(),
  business: BusinessScenarioId | 'all' = 'all',
  engagementOf?: (id: string) => ContentEngagement,
  howtoToolIds?: Set<string>,
): MarketShelfCard[] {
  return tools
    .filter((t) => resolveToolMarketShelf(t) === kind)
    .filter((t) => canViewAsset(t, viewer))
    .filter((t) => toolMatchesFilters(t, org, business))
    .map((t) => {
      const eng = engagementOf?.(t.id);
      const canOpen = toolHasLaunchUrl(t);
      const hasHowto = howtoToolIds?.has(t.id) ?? false;
      const presentation =
        kind === 'external'
          ? externalToolPresentation(t)
          : { title: t.name, productName: undefined as string | undefined, description: t.desc };
      return {
        id: t.id,
        kind,
        title: presentation.title,
        description: presentation.description,
        productName: presentation.productName,
        icon: t.icon || 'fa-plug',
        logoUrl: t.logoUrl,
        badges: toolBadges(t),
        featured: resolveToolFeaturedInFindCases(t),
        heat: eng
          ? heatScore({ ...eng, uses: eng.uses + (t.invokes ?? 0) })
          : t.invokes ?? 0,
        homepageUrl: t.homepageUrl,
        ownerDeptIds: t.ownerDeptIds,
        ownerRegionId: t.ownerRegionId ?? null,
        hasHowto,
        primaryAction: (canOpen ? 'open' : 'howto') as MarketPrimaryAction,
      };
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.heat - a.heat);
}

export function listMarketProjectCards(
  org: OrgPerspectiveSelection = emptyOrgPerspectiveSelection(),
  business: BusinessScenarioId | 'all' = 'all',
  engagementOf?: (id: string) => ContentEngagement,
  portalByScenario?: (scenarioId: string) => PortalContentItem[],
): MarketShelfCard[] {
  const defs = FEATURED_SCENARIOS.filter((d) =>
    (DISCOVER_SCENARIO_IDS as readonly string[]).includes(d.id),
  );
  const ranked = defs
    .filter((d) =>
      projectMatchesFilters(d, org, business, portalByScenario?.(d.id) ?? []),
    )
    .map((d) => {
      const eng = engagementOf?.(d.id);
      const items = portalByScenario?.(d.id) ?? [];
      const latest = items
        .map((i) => i.publishedAt)
        .filter(Boolean)
        .sort()
        .at(-1);
      return {
        id: d.id,
        kind: 'projects' as const,
        title: d.label,
        description: d.desc || d.label,
        icon: d.icon || 'fa-map',
        badges: scenarioBadges(d),
        featured: false,
        heat: eng ? heatScore(eng) : 0,
        scenarioId: d.id,
        hasHowto: items.length > 0,
        updatedAt: latest ? latest.slice(0, 10) : undefined,
        primaryAction: 'detail' as const,
      };
    })
    .sort((a, b) => b.heat - a.heat);
  // 精选条取热度 Top3，其余进「更多」滚动列表（避免全部进精选导致列表空）
  return ranked.map((c, i) => (i < 3 ? { ...c, featured: true } : c));
}

/**
 * 运营置顶：强制 featured，并按 pin 顺序排到精选前部；未 pin 的保持原精选/热度逻辑。
 */
export function applyMarketFeaturedPins(
  cards: MarketShelfCard[],
  pinnedIds: string[],
): MarketShelfCard[] {
  if (!pinnedIds.length) return cards;
  const pinSet = new Set(pinnedIds);
  const order = new Map(pinnedIds.map((id, i) => [id, i]));
  return [...cards]
    .map((c) => (pinSet.has(c.id) ? { ...c, featured: true } : c))
    .sort((a, b) => {
      const ai = order.has(a.id) ? order.get(a.id)! : Number.POSITIVE_INFINITY;
      const bi = order.has(b.id) ? order.get(b.id)! : Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return Number(b.featured) - Number(a.featured) || b.heat - a.heat;
    });
}

/** 精选条与全部列表去重：全部中排除已在精选展示的 id */
export function splitFeaturedAndRest(cards: MarketShelfCard[], featuredLimit = 8) {
  const featured = cards.filter((c) => c.featured).slice(0, featuredLimit);
  const featuredIds = new Set(featured.map((c) => c.id));
  const rest = cards.filter((c) => !featuredIds.has(c.id));
  return { featured, rest };
}

export interface CrossShelfMarketOptions {
  tools: PrototypeToolSeed[];
  viewer: AssetViewerContext;
  org: OrgPerspectiveSelection;
  business: BusinessScenarioId | 'all';
  search?: string;
  engagementOf?: (id: string) => ContentEngagement;
  howtoToolIds?: Set<string>;
  portalByScenario?: (scenarioId: string) => PortalContentItem[];
  featuredPins: {
    external: string[];
    internal: string[];
    projects: string[];
  };
}

/** 首页 / 跨货架：外部 + 内部 + 项目，合并筛选与运营置顶 */
export function listCrossShelfMarketCards(opts: CrossShelfMarketOptions): MarketShelfCard[] {
  const {
    tools,
    viewer,
    org,
    business,
    search,
    engagementOf,
    howtoToolIds,
    portalByScenario,
    featuredPins,
  } = opts;

  const external = applyMarketFeaturedPins(
    listMarketToolCards(tools, 'external', viewer, org, business, engagementOf, howtoToolIds),
    featuredPins.external,
  );
  const internal = applyMarketFeaturedPins(
    listMarketToolCards(tools, 'internal', viewer, org, business, engagementOf, howtoToolIds),
    featuredPins.internal,
  );
  const projects = applyMarketFeaturedPins(
    listMarketProjectCards(org, business, engagementOf, portalByScenario),
    featuredPins.projects,
  );

  let merged = [...external, ...internal, ...projects];

  const q = search?.trim().toLowerCase();
  if (q) {
    merged = merged.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.badges.some((b) => b.label.toLowerCase().includes(q)),
    );
  }

  return merged;
}
