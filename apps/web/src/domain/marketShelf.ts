/**
 * MSS AI 工具平台 · 货架
 * 统一卡片模型：外部工具精选 / 内部办公推荐 / AI工具Hub
 */

import {
  resolveToolMarketShelf,
} from '@/domain/aiToolCategories';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import { canViewAsset, type AssetViewerContext } from '@/domain/assetVisibility';
import {
  DISCOVER_TO_BUSINESS_SCENARIO,
  getBusinessScenarioMeta,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import type { ToolRegion } from '@/domain/externalToolTaxonomy';
import type { ExecutionTrustTier } from '@/domain/executionTrust';
import {
  anyItemMatchesOrgPerspective,
  emptyOrgPerspectiveSelection,
  isOrgPerspectiveEmpty,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { FEATURED_SCENARIOS, type ScenarioDef } from '@/domain/portalMap';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import {
  getInternalOfficeSceneCatalog,
  listInternalOfficeCatalogTools,
  resolveOfficeToolWithCatalog,
  type InternalOfficeSceneCatalogEntry,
} from '@/domain/internalOfficeScenes';
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
    label: '内部办公推荐',
    shortLabel: '内部',
  },
  projects: {
    view: 'market-projects',
    label: 'AI工具Hub',
    shortLabel: 'AI工具',
  },
};

/** 卡片主 CTA：按能力诚实展示 */
export type MarketPrimaryAction = 'open' | 'howto' | 'detail' | 'run';

export type MarketShelfCard = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  description: string;
  /** 外部工具：厂商名（弱化展示在产品名下） */
  productName?: string;
  /**
   * 「能帮我做什么」结果导向短句（优先于 description 作副文案）
   * 来自 bestFor / cardSummary 首句
   */
  outcomeHint?: string;
  /** 安全分级：外链 / 公司内 / MSS 自研 */
  securityLevel?: 'external' | 'internal' | 'mss';
  /** 适用场景短标签（最多展示 3 个） */
  sceneTags?: string[];
  icon: string;
  /** 外精选 / 公司推荐：品牌 Logo（可上传或由官网初始化） */
  logoUrl?: string;
  /** 领域 / 区域 / 类型 */
  badges: { label: string; tone?: 'dept' | 'region' | 'type' }[];
  featured: boolean;
  heat: number;
  /** 点赞数（MSS Skill/Agent 展示） */
  likes?: number;
  /** 点踩数（MSS Skill 展示） */
  dislikes?: number;
  /** 下载量（MSS Skill/Agent 展示） */
  downloads?: number;
  /**
   * Skill 卡右上角权限标识：公开 | 领域（组织/领域受限）
   * 不传则不展示角标（外部/公司工具卡）
   */
  scopeBadge?: 'public' | 'scoped';
  homepageUrl?: string;
  scenarioId?: string;
  ownerDeptIds?: DeptId[];
  ownerRegionId?: RegionId | null;
  hasHowto: boolean;
  /** AI 项目：是否已挂载可站内执行的 Skill/Agent */
  runnable?: boolean;
  /**
   * 2.0 执行可信度：演示 / 平台模型 / 自配 / 仅下载
   * 仅 MSS Skill·Agent 卡使用
   */
  executionTrust?: ExecutionTrustTier;
  /** 展示用更新时间（YYYY-MM-DD） */
  updatedAt?: string;
  primaryAction: MarketPrimaryAction;
  /** 外部目录：海外 / 国内 */
  region?: ToolRegion;
  /** 外部目录：工具类型 id */
  toolTypeId?: string;
  /** 外部目录：多工具类型 id / 展示名。 */
  toolTypeIds?: string[];
  toolTypeLabels?: string[];
  /** Excel 分类内排序与源顺序。 */
  externalCategoryRanks?: Record<string, number>;
  externalSortOrder?: number;
  sourceOrder?: number;
};

export const MARKET_SECURITY_LABEL: Record<
  NonNullable<MarketShelfCard['securityLevel']>,
  string
> = {
  external: '外部工具',
  internal: '公司工具',
  mss: 'MSS能力',
};

/** 外部工具卡：产品名为标题，卡片核心作用为描述（对齐 Demo） */
function externalToolPresentation(tool: PrototypeToolSeed): {
  title: string;
  productName?: string;
  description: string;
  outcomeHint?: string;
  sceneTags?: string[];
} {
  const configured = tool.marketTitle?.trim();
  const summary =
    tool.cardSummary?.trim() ||
    (tool.desc || '')
      .replace(/\s+/g, ' ')
      .split(/[。！？.!?\n]/)[0]
      .trim() ||
    tool.desc ||
    '';
  const outcomeHint = tool.bestFor?.trim() || summary || undefined;
  const sceneTags = (tool.bestFor ?? '')
    .split(/[、,，/｜|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (configured) {
    return {
      title: configured,
      productName: tool.company || tool.name,
      description: summary,
      outcomeHint,
      sceneTags: sceneTags.length ? sceneTags : undefined,
    };
  }
  return {
    title: tool.name,
    productName: tool.company || undefined,
    description: summary,
    outcomeHint,
    sceneTags: sceneTags.length ? sceneTags : undefined,
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
  if (tool.region === 'overseas') badges.push({ label: '海外', tone: 'region' });
  else if (tool.region === 'domestic') badges.push({ label: '国内', tone: 'region' });
  else if (tool.ownerRegionId) {
    badges.push({ label: getRegionLabel(tool.ownerRegionId), tone: 'region' });
  }
  const src =
    tool.sourceType ?? (tool.tags?.includes('hw-internal') ? 'internal' : 'external');
  badges.push({ label: src === 'internal' ? '内部工具' : '外部工具', tone: 'type' });
  return badges;
}

function scenarioBadges(
  def: ScenarioDef,
  portalItems: PortalContentItem[] = [],
): MarketShelfCard['badges'] {
  const badges: MarketShelfCard['badges'] = [];
  // 与 Skill Hub 一致：领域(dept) · 区域(region) · 业务场景(type)
  const dept = portalItems.find((i) => i.ownerDeptIds?.[0])?.ownerDeptIds?.[0];
  if (dept) {
    badges.push({ label: getDeptLabel(dept), tone: 'dept' });
  }
  const regionId = portalItems.find((i) => i.ownerRegionId)?.ownerRegionId;
  if (regionId) {
    badges.push({ label: getRegionLabel(regionId), tone: 'region' });
  }
  const biz = DISCOVER_TO_BUSINESS_SCENARIO[def.id as DiscoverScenarioId];
  if (biz) {
    badges.push({ label: getBusinessScenarioMeta(biz).label, tone: 'type' });
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
          : {
              title: t.name,
              productName: undefined as string | undefined,
              description: t.cardSummary?.trim() || t.desc,
              outcomeHint: t.cardSummary?.trim() || t.bestFor?.trim() || undefined,
              sceneTags: (t.bestFor ?? '')
                .split(/[、,，/｜|]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 3),
            };
      return {
        id: t.id,
        kind,
        title: presentation.title,
        description: presentation.description,
        productName: presentation.productName,
        outcomeHint: presentation.outcomeHint,
        sceneTags:
          kind === 'external' && t.toolTypeLabels?.length
            ? t.toolTypeLabels.slice(0, 3)
            : presentation.sceneTags?.length
              ? presentation.sceneTags
              : undefined,
        securityLevel: (kind === 'external' ? 'external' : 'internal') as
          | 'external'
          | 'internal',
        icon: t.icon || 'fa-plug',
        logoUrl: resolveToolLogoUrl(t),
        badges: toolBadges(t),
        featured: false,
        heat: Math.round(
          eng
            ? heatScore({ ...eng, uses: eng.uses + (t.invokes ?? 0) })
            : t.invokes ?? 0,
        ),
        homepageUrl: t.homepageUrl,
        ownerDeptIds: t.ownerDeptIds,
        ownerRegionId: t.ownerRegionId ?? null,
        hasHowto,
        primaryAction: (canOpen ? 'open' : 'howto') as MarketPrimaryAction,
        region: t.region,
        toolTypeId: t.toolTypeId,
        toolTypeIds: t.toolTypeIds,
        toolTypeLabels: t.toolTypeLabels,
        externalCategoryRanks: t.externalCategoryRanks,
        externalSortOrder: t.externalSortOrder,
      };
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.heat - a.heat);
}

/** 首页 / 对齐公司货架：办公场景引用的工具卡（链接优先配置工具主数据） */
export function listInternalOfficeMarketCards(
  catalogTools: PrototypeToolSeed[],
  engagementOf?: (id: string) => ContentEngagement,
  howtoToolIds?: Set<string>,
  sceneEntries: InternalOfficeSceneCatalogEntry[] = getInternalOfficeSceneCatalog(),
): MarketShelfCard[] {
  const byId = new Map(catalogTools.map((t) => [t.id, t]));
  return listInternalOfficeCatalogTools(sceneEntries, catalogTools).map((st) => {
    const t = byId.get(st.id);
    const resolved = resolveOfficeToolWithCatalog(st, t);
    const eng = engagementOf?.(st.id);
    const canOpen = Boolean(resolved.homepageUrl && resolved.homepageUrl !== '#');
    const hasHowto = howtoToolIds?.has(st.id) ?? false;
    return {
      id: st.id,
      kind: 'internal' as const,
      title: resolved.name,
      description: (t?.cardSummary || t?.desc || st.blurb).trim(),
      outcomeHint: t?.cardSummary?.trim() || t?.bestFor?.trim() || st.blurb || undefined,
      sceneTags: (t?.bestFor ?? '')
        .split(/[、,，/｜|]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3),
      securityLevel: 'internal' as const,
      icon: t?.icon || 'fa-cube',
      logoUrl: resolveToolLogoUrl(
        t ?? {
          logoUrl: resolved.logoUrl,
          homepageUrl: resolved.homepageUrl,
          sourceType: 'internal',
          tags: ['hw-internal'],
        },
      ),
      badges: [] as MarketShelfCard['badges'],
      featured: false,
      heat: Math.round(
        eng
          ? heatScore({ ...eng, uses: eng.uses + (t?.invokes ?? 0) })
          : t?.invokes ?? 0,
      ),
      homepageUrl: resolved.homepageUrl,
      ownerDeptIds: t?.ownerDeptIds,
      ownerRegionId: t?.ownerRegionId ?? null,
      hasHowto,
      primaryAction: (canOpen ? 'open' : 'howto') as MarketPrimaryAction,
    };
  });
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
      return {
        id: d.id,
        kind: 'projects' as const,
        title: d.label,
        description: d.desc || d.label,
        outcomeHint: d.desc || d.label,
        sceneTags: scenarioBadges(d, items)
          .filter((b) => b.tone === 'type')
          .map((b) => b.label)
          .slice(0, 3),
        securityLevel: 'mss' as const,
        icon: d.icon || 'fa-map',
        badges: scenarioBadges(d, items),
        featured: false,
        heat: eng ? heatScore(eng) : 0,
        likes: eng?.likes ?? 0,
        downloads: eng?.downloads ?? 0,
        scenarioId: d.id,
        hasHowto: items.length > 0,
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

/** 精选门禁：必须能回答「能帮我做什么」，且有上手或可用入口 */
export function qualifiesAsFeaturedContent(card: MarketShelfCard): boolean {
  const outcome = (card.outcomeHint || card.description || '').trim();
  if (outcome.length < 8) return false;
  if (card.kind === 'external' || card.kind === 'internal') {
    return Boolean(card.hasHowto || (card.homepageUrl && card.homepageUrl !== '#'));
  }
  return Boolean(card.hasHowto || card.runnable);
}

/** 精选条与全部列表去重：全部中排除已在精选展示的 id；空卡降到「更多」 */
export function splitFeaturedAndRest(cards: MarketShelfCard[], featuredLimit = 8) {
  const featured = cards
    .filter((c) => c.featured && qualifiesAsFeaturedContent(c))
    .slice(0, featuredLimit);
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
