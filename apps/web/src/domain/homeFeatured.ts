import type { AssetViewerContext } from '@/domain/assetVisibility';
import { canViewAsset } from '@/domain/assetVisibility';
import {
  resolveAgentBusinessScenario,
  resolveAgentFeaturedInDoTask,
} from '@/domain/agentBusinessScenarios';
import { getBusinessScenarioMeta } from '@/domain/businessScenarios';
import { sortByRankMode, type ContentEngagement } from '@/domain/contentEngagement';
import type { ExternalToolLayoutDocument } from '@/domain/externalToolLayout';
import { HOME_CHANNEL_PINS } from '@/domain/homeChannelPins';
import type { InternalOfficeSceneCatalogEntry } from '@/domain/internalOfficeScenes';
import {
  applyMarketFeaturedPins,
  listInternalOfficeMarketCards,
  listMarketToolCards,
  qualifiesAsFeaturedContent,
  type MarketShelfCard,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { emptyOrgPerspectiveSelection } from '@/domain/orgAxisTags';
import { getAssetRegionLabel, getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import type {
  PrototypeAgentSeed,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import {
  resolveSkillBusinessScenario,
  resolveSkillFeaturedInMssMarket,
} from '@/domain/skillBusinessScenarios';
import { skillDisplayDesc, skillDisplayName } from '@/domain/skillDisplay';
import { isSkillRunnable } from '@/domain/skillRuntime';

/** 首页每个精选框展示的卡片数；配置中排在其后的内容作为候补。 */
export const HOME_CHANNEL_DISPLAY_COUNT = 3;
/** 与后端 home-featured 文档的单栏上限保持一致。 */
export const HOME_FEATURED_MAX_PER_CHANNEL = 30;

export const HOME_CHANNEL_KINDS: readonly MarketShelfKind[] = ['external', 'internal', 'projects'];

export const HOME_CHANNEL_BLURB: Record<MarketShelfKind, string | null> = {
  external: '禁止将公司内部信息上传到外部AI网站',
  internal: '写报告、查制度、个人问答等',
  projects: '高价值场景沉淀的 Skill 和 Agent',
};

export const HOME_CHANNEL_TITLE_COLOR: Record<MarketShelfKind, string> = {
  external: '#2563eb',
  internal: '#0d9488',
  projects: '#c45b5f',
};

/**
 * 首页三栏精选配置。工具栏保存工具 ID；AI工具Hub 栏保存 `skill:<id>` / `agent:<id>`，
 * 避免 Skill 与 Agent 的 ID 相同时互相覆盖。
 */
export type HomeFeaturedChannels = Record<MarketShelfKind, string[]>;

export function emptyHomeFeaturedChannels(): HomeFeaturedChannels {
  return { external: [], internal: [], projects: [] };
}

export function homeFeaturedCardRef(card: MarketShelfCard): string {
  return card.kind === 'projects' && card.assetType ? `${card.assetType}:${card.id}` : card.id;
}

export interface HomeChannelCardContext {
  tools: PrototypeToolSeed[];
  skills: PrototypeSkillSeed[];
  agents: PrototypeAgentSeed[];
  viewer: AssetViewerContext;
  engagementOf: (id: string) => ContentEngagement;
  howtoToolIds: Set<string>;
  canRunSkills: boolean;
  canRunAgents: boolean;
}

function skillCard(skill: PrototypeSkillSeed, ctx: HomeChannelCardContext): MarketShelfCard {
  const engagement = ctx.engagementOf(skill.id);
  const scenarioId = resolveSkillBusinessScenario(skill);
  const scenarioLabel = scenarioId ? getBusinessScenarioMeta(scenarioId).label : null;
  const badges: MarketShelfCard['badges'] = [];
  if (skill.ownerDeptIds?.[0]) {
    badges.push({ label: getDeptLabel(skill.ownerDeptIds[0]), tone: 'dept' });
  }
  badges.push({ label: getAssetRegionLabel(skill.ownerRegionId), tone: 'region' });
  const description = skillDisplayDesc(skill).replace(/^【[^】]+】/, '').trim();
  return {
    id: skill.id,
    kind: 'projects',
    assetType: 'skill',
    title: skillDisplayName(skill),
    description,
    outcomeHint: description,
    sceneTags: ['Skill', ...(scenarioLabel ? [scenarioLabel] : [])],
    securityLevel: 'mss',
    icon: skill.icon || 'fa-cube',
    logoUrl: skill.iconUrl,
    badges,
    featured: true,
    heat: skill.invokes ?? 0,
    likes: engagement.likes,
    dislikes: engagement.dislikes,
    downloads: engagement.downloads,
    scopeBadge: (skill.visibility ?? 'public') === 'public' ? 'public' : 'scoped',
    hasHowto: Boolean(skill.instructions || skill.command),
    runnable: ctx.canRunSkills && isSkillRunnable(skill),
    primaryAction: 'detail',
    scenarioId: scenarioId ?? undefined,
    ownerDeptIds: skill.ownerDeptIds,
    ownerRegionId: skill.ownerRegionId,
    updatedAt: skill.updatedAt,
  };
}

function agentCard(agent: PrototypeAgentSeed, ctx: HomeChannelCardContext): MarketShelfCard {
  const engagement = ctx.engagementOf(agent.id);
  const scenarioId = resolveAgentBusinessScenario(agent);
  const scenarioLabel = scenarioId ? getBusinessScenarioMeta(scenarioId).label : null;
  const badges: MarketShelfCard['badges'] = [];
  if (agent.ownerDeptIds?.[0]) {
    badges.push({ label: getDeptLabel(agent.ownerDeptIds[0]), tone: 'dept' });
  }
  if (agent.ownerRegionIds?.[0]) {
    badges.push({ label: getRegionLabel(agent.ownerRegionIds[0]), tone: 'region' });
  }
  return {
    id: agent.id,
    kind: 'projects',
    assetType: 'agent',
    title: agent.name,
    description: agent.desc,
    outcomeHint: agent.desc,
    sceneTags: ['Agent', ...(scenarioLabel ? [scenarioLabel] : [])],
    securityLevel: 'mss',
    icon: agent.icon || 'fa-robot',
    badges,
    featured: true,
    heat: agent.invokes ?? 0,
    likes: engagement.likes,
    dislikes: engagement.dislikes,
    downloads: engagement.downloads,
    scopeBadge: (agent.visibility ?? 'public') === 'public' ? 'public' : 'scoped',
    hasHowto: Boolean(agent.systemPrompt || agent.skillIds?.length),
    runnable: ctx.canRunAgents && Boolean(agent.skillIds?.length),
    primaryAction: 'detail',
    scenarioId: scenarioId ?? undefined,
    ownerDeptIds: agent.ownerDeptIds,
    ownerRegionId: agent.ownerRegionIds?.[0] ?? null,
    updatedAt: agent.updatedAt,
  };
}

/** 首页配置可选的内容池：已上架、当前用户可见的外部工具 / 公司工具 / Skill / Agent。 */
export function listHomeFeaturedCandidates(
  ctx: HomeChannelCardContext,
): Record<MarketShelfKind, MarketShelfCard[]> {
  const org = emptyOrgPerspectiveSelection();
  const toolCards = (kind: 'external' | 'internal') =>
    listMarketToolCards(ctx.tools, kind, ctx.viewer, org, 'all', ctx.engagementOf, ctx.howtoToolIds);
  return {
    external: toolCards('external'),
    internal: toolCards('internal'),
    projects: [
      ...ctx.skills
        .filter((skill) => skill.published && canViewAsset(skill, ctx.viewer))
        .map((skill) => skillCard(skill, ctx)),
      ...ctx.agents
        .filter((agent) => agent.published && canViewAsset(agent, ctx.viewer))
        .map((agent) => agentCard(agent, ctx)),
    ],
  };
}

/** 按首页配置顺序取卡片；已下架、已删除或当前用户无权查看的引用直接跳过，由候补补位。 */
export function resolveHomeFeaturedCards(
  channels: HomeFeaturedChannels,
  candidates: Record<MarketShelfKind, MarketShelfCard[]>,
): Record<MarketShelfKind, MarketShelfCard[]> {
  const pick = (kind: MarketShelfKind) => {
    const byRef = new Map(candidates[kind].map((card) => [homeFeaturedCardRef(card), card]));
    return channels[kind].flatMap((ref) => {
      const card = byRef.get(ref);
      return card ? [card] : [];
    });
  };
  return { external: pick('external'), internal: pick('internal'), projects: pick('projects') };
}

/** 旧规则的 AI工具Hub 栏配额：2 个 Skill + 1 个 Agent。 */
export function takeLegacyProjectQuota(cards: MarketShelfCard[]): MarketShelfCard[] {
  return [
    ...cards.filter((card) => card.assetType === 'skill').slice(0, 2),
    ...cards.filter((card) => card.assetType !== 'skill').slice(0, 1),
  ];
}

/**
 * 旧首页规则：外部精选读工具运营布局、内部推荐读办公场景、Hub 读精选 Skill / Agent。
 * 只在从未保存过「首页配置」时使用，并作为首页配置的初始草稿；保存后首页不再读取这些来源。
 */
export function legacyHomeChannelCards(
  ctx: HomeChannelCardContext & {
    externalToolLayout: ExternalToolLayoutDocument | null;
    officeSceneEntries: InternalOfficeSceneCatalogEntry[];
  },
): Record<MarketShelfKind, MarketShelfCard[]> {
  const externalCandidates = listMarketToolCards(
    ctx.tools,
    'external',
    ctx.viewer,
    emptyOrgPerspectiveSelection(),
    'all',
    ctx.engagementOf,
    ctx.howtoToolIds,
  );
  const externalLayout = ctx.externalToolLayout?.all;
  const externalById = new Map(externalCandidates.map((card) => [card.id, card]));
  // 布局未加载时不使用旧 market-featured 或前端静态目录伪造精选。
  const external = externalLayout
    ? [
        ...externalLayout.overseasFeaturedIds,
        ...externalLayout.domesticFeaturedIds,
      ].flatMap((id) => {
        const card = externalById.get(id);
        return card ? [card] : [];
      })
    : [];
  const internal = applyMarketFeaturedPins(
    listInternalOfficeMarketCards(
      ctx.tools,
      ctx.engagementOf,
      ctx.howtoToolIds,
      ctx.officeSceneEntries,
    ),
    [...HOME_CHANNEL_PINS.internal],
  );
  const featuredSkills = sortByRankMode(
    ctx.skills
      .filter((skill) => skill.published)
      .filter((skill) => canViewAsset(skill, ctx.viewer))
      .filter((skill) => resolveSkillFeaturedInMssMarket(skill))
      .map((skill) => skillCard(skill, ctx))
      .filter(qualifiesAsFeaturedContent),
    // 与 Skill Hub 初始排序一致：查看量高的精选 Skill 优先。
    'most_viewed',
    ctx.engagementOf,
  );
  const featuredAgents = sortByRankMode(
    ctx.agents
      .filter((agent) => agent.published)
      .filter((agent) => canViewAsset(agent, ctx.viewer))
      .filter((agent) => resolveAgentFeaturedInDoTask(agent))
      .map((agent) => agentCard(agent, ctx))
      .filter(qualifiesAsFeaturedContent),
    // 与 Agent Hub 初始排序一致：精选优先，同级按互动热度。
    'recommended',
    ctx.engagementOf,
  );
  return { external, internal, projects: [...featuredSkills, ...featuredAgents] };
}

/** 把旧规则下首页实际展示的卡片转成首页配置草稿，保证首次保存前后首页一致。 */
export function legacyHomeFeaturedChannels(
  cards: Record<MarketShelfKind, MarketShelfCard[]>,
): HomeFeaturedChannels {
  const refs = (list: MarketShelfCard[]) =>
    list.slice(0, HOME_CHANNEL_DISPLAY_COUNT).map(homeFeaturedCardRef);
  return {
    external: refs(cards.external),
    internal: refs(cards.internal),
    projects: refs(takeLegacyProjectQuota(cards.projects)),
  };
}
