import { useEffect, useMemo } from 'react';
import { canViewAsset } from '@/domain/assetVisibility';
import { canExecuteChat } from '@/domain/permissions';
import { PageStageHero } from '@/components/layout/PageStageHero';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { HOME_CHANNEL_PINS } from '@/domain/homeChannelPins';
import { orderExternalFeaturedItems } from '@/domain/externalFeaturedOrder';
import {
  applyMarketFeaturedPins,
  listInternalOfficeMarketCards,
  listMarketToolCards,
  qualifiesAsFeaturedContent,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import {
  resolveAgentBusinessScenario,
  resolveAgentFeaturedInDoTask,
} from '@/domain/agentBusinessScenarios';
import {
  resolveSkillBusinessScenario,
  resolveSkillFeaturedInMssMarket,
} from '@/domain/skillBusinessScenarios';
import { skillDisplayDesc, skillDisplayName } from '@/domain/skillDisplay';
import { isSkillRunnable } from '@/domain/skillRuntime';
import { openMarketShelf, openMarketToolDetail } from '@/domain/openHomeJourney';
import { HomeMarketChannels } from '@/components/home/HomeMarketChannels';
import { StageIntentDock } from '@/components/market/StageIntentDock';
import {
  capabilityKey,
  searchCapabilitiesByIntent,
} from '@/domain/capabilityIntentSearch';
import {
  MarketCompareDock,
  MarketCompareDrawer,
} from '@/components/market/MarketCompareDrawer';
import {
  ensurePlazaToolGuidesBootstrapped,
  usePlazaToolGuideStore,
} from '@/stores/plazaToolGuideStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketHiddenStore } from '@/stores/marketHiddenStore';
import { useMarketFeaturedStore } from '@/stores/marketFeaturedStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { greetingForNow } from '@/domain/timeGreeting';
import { emptyOrgPerspectiveSelection } from '@/domain/orgAxisTags';
import { getBusinessScenarioMeta } from '@/domain/businessScenarios';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { sortByRankMode } from '@/domain/contentEngagement';

export function HomePage() {
  const { applyUserOrgDefaults } = useHomeStore();
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const user = useSessionStore((s) => s.user);
  const executeAllowed = canExecuteChat(user?.platformRole);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpView = useContentEngagementStore((s) => s.bumpView);
  const tools = useMarketplaceStore((s) => s.tools);
  const marketSearch = useMarketFilterStore((s) => s.search);
  const favoritesOnly = useMarketFilterStore((s) => s.favoritesOnly);
  const setMarketBusinessFilter = useMarketFilterStore((s) => s.setBusinessFilter);
  const hydrateRecent = useRecentMarketStore((s) => s.hydrate);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const hydrateFavorites = useMarketFavoriteStore((s) => s.hydrate);
  const favoriteItems = useMarketFavoriteStore((s) => s.items);
  const hiddenKeys = useMarketHiddenStore((s) => s.keys);
  const hydrateHidden = useMarketHiddenStore((s) => s.hydrate);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);
  const featuredPins = useMarketFeaturedStore((s) => s.pins);
  const officeSceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const pendingBusinessScenario = useNavigationIntentStore((s) => s.pendingBusinessScenario);
  const consumeBusinessScenario = useNavigationIntentStore((s) => s.consumeBusinessScenario);

  useEffect(() => {
    hydrateRecent();
    hydrateFavorites();
    hydrateHidden();
    hydrateFeaturedPins();
    ensurePlazaToolGuidesBootstrapped();
  }, [hydrateRecent, hydrateFavorites, hydrateHidden, hydrateFeaturedPins]);

  useEffect(() => {
    if (!user) return;
    applyUserOrgDefaults(
      { deptIds: user.deptIds ?? [], regionId: user.regionId ?? null },
      user.platformRole,
    );
  }, [user, applyUserOrgDefaults]);

  useEffect(() => {
    if (!pendingBusinessScenario) return;
    setMarketBusinessFilter(pendingBusinessScenario);
    consumeBusinessScenario();
  }, [pendingBusinessScenario, consumeBusinessScenario, setMarketBusinessFilter]);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user],
  );

  const viewer = useMemo(
    () => ({
      userId: user?.id,
      userName: user?.name,
      affiliation,
      role: user?.platformRole,
    }),
    [user, affiliation],
  );

  const howtoToolIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of guideRecords) ids.add(r.toolId);
    return ids;
  }, [guideRecords]);

  const scopedChannelCards = useMemo(() => {
    const eng = (id: string) => engagementOf(id);
    const org = emptyOrgPerspectiveSelection();

    const externalPins = featuredPins.external ?? [];
    const external = orderExternalFeaturedItems(
      applyMarketFeaturedPins(
        listMarketToolCards(tools, 'external', viewer, org, 'all', eng, howtoToolIds).filter(
          qualifiesAsFeaturedContent,
        ),
        externalPins,
      ),
      externalPins,
    );
    const internal = applyMarketFeaturedPins(
      listInternalOfficeMarketCards(tools, eng, howtoToolIds, officeSceneEntries),
      [...HOME_CHANNEL_PINS.internal],
    );
    const featuredSkills = sortByRankMode(
      skills
        .filter((skill) => skill.published)
        .filter((skill) => canViewAsset(skill, viewer))
        .filter((skill) => resolveSkillFeaturedInMssMarket(skill))
        .map((skill): MarketShelfCardModel => {
          const engagement = eng(skill.id);
          const scenarioId = resolveSkillBusinessScenario(skill);
          const scenarioLabel = scenarioId
            ? getBusinessScenarioMeta(scenarioId).label
            : null;
          const badges: MarketShelfCardModel['badges'] = [];
          if (skill.ownerDeptIds?.[0]) {
            badges.push({ label: getDeptLabel(skill.ownerDeptIds[0]), tone: 'dept' });
          }
          if (skill.ownerRegionId) {
            badges.push({ label: getRegionLabel(skill.ownerRegionId), tone: 'region' });
          }
          return {
            id: skill.id,
            kind: 'projects',
            title: skillDisplayName(skill),
            description: skillDisplayDesc(skill).replace(/^【[^】]+】/, '').trim(),
            outcomeHint: skillDisplayDesc(skill).replace(/^【[^】]+】/, '').trim(),
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
            runnable: executeAllowed && isSkillRunnable(skill),
            primaryAction: 'detail',
            scenarioId: scenarioId ?? undefined,
            ownerDeptIds: skill.ownerDeptIds,
            ownerRegionId: skill.ownerRegionId,
            updatedAt: skill.updatedAt,
          };
        })
        .filter(qualifiesAsFeaturedContent),
      // 与 Skill Hub 初始排序一致：查看量高的精选 Skill 优先。
      'most_viewed',
      eng,
    );

    const featuredAgents = sortByRankMode(
      agents
        .filter((agent) => agent.published)
        .filter((agent) => canViewAsset(agent, viewer))
        .filter((agent) => resolveAgentFeaturedInDoTask(agent))
        .map((agent): MarketShelfCardModel => {
          const engagement = eng(agent.id);
          const scenarioId = resolveAgentBusinessScenario(agent);
          const scenarioLabel = scenarioId
            ? getBusinessScenarioMeta(scenarioId).label
            : null;
          const badges: MarketShelfCardModel['badges'] = [];
          if (agent.ownerDeptIds?.[0]) {
            badges.push({ label: getDeptLabel(agent.ownerDeptIds[0]), tone: 'dept' });
          }
          if (agent.ownerRegionIds?.[0]) {
            badges.push({ label: getRegionLabel(agent.ownerRegionIds[0]), tone: 'region' });
          }
          return {
            id: agent.id,
            kind: 'projects',
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
            runnable: executeAllowed && Boolean(agent.skillIds?.length),
            primaryAction: 'detail',
            scenarioId: scenarioId ?? undefined,
            ownerDeptIds: agent.ownerDeptIds,
            ownerRegionId: agent.ownerRegionIds?.[0] ?? null,
            updatedAt: agent.updatedAt,
          };
        })
        .filter(qualifiesAsFeaturedContent),
      // 与 Agent Hub 初始排序一致：精选优先，同级按互动热度。
      'recommended',
      eng,
    );

    // 不使用 HOME_CHANNEL_PINS.projects；首页只消费 Hub 真实精选资产。
    const projects = [...featuredSkills, ...featuredAgents];

    return { external, internal, projects } satisfies Record<
      MarketShelfKind,
      MarketShelfCardModel[]
    >;
  }, [
    tools,
    skills,
    agents,
    featuredPins,
    viewer,
    engagementOf,
    engagementById,
    howtoToolIds,
    officeSceneEntries,
    executeAllowed,
  ]);

  const favoriteKeys = useMemo(
    () => new Set(favoriteItems.map((f) => `${f.kind}:${f.id}`)),
    [favoriteItems],
  );

  const channelCards = useMemo(() => {
    const applyFav = (list: MarketShelfCardModel[]) =>
      list
        .filter((c) => !hiddenKeys.includes(`${c.kind}:${c.id}`))
        .filter((c) => (favoritesOnly ? favoriteKeys.has(capabilityKey(c)) : true));
    const q = marketSearch.trim();
    const skillIds = new Set(skills.map((skill) => skill.id));
    const takeProjectQuota = (list: MarketShelfCardModel[]) => [
      ...list.filter((card) => skillIds.has(card.id)).slice(0, 2),
      ...list.filter((card) => !skillIds.has(card.id)).slice(0, 1),
    ];
    if (!q) {
      return {
        external: applyFav(scopedChannelCards.external),
        internal: applyFav(scopedChannelCards.internal),
        // 先应用个人隐藏/收藏筛选，再按 2 Skill + 1 Agent 补位。
        projects: takeProjectQuota(applyFav(scopedChannelCards.projects)),
      };
    }
    const all = [
      ...scopedChannelCards.external,
      ...scopedChannelCards.internal,
      ...scopedChannelCards.projects,
    ];
    const ranked = searchCapabilitiesByIntent(q, all, 36, { favoriteKeys });
    const grouped: Record<MarketShelfKind, MarketShelfCardModel[]> = {
      external: [],
      internal: [],
      projects: [],
    };
    for (const m of ranked) grouped[m.card.kind].push(m.card);
    return {
      external: applyFav(grouped.external),
      internal: applyFav(grouped.internal),
      projects: takeProjectQuota(applyFav(grouped.projects)),
    };
  }, [scopedChannelCards, marketSearch, favoritesOnly, favoriteKeys, hiddenKeys, skills]);

  const rememberCard = (card: MarketShelfCardModel) => {
    pushRecent({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
  };

  const openPortalCard = (card: MarketShelfCardModel) => {
    rememberCard(card);
    bumpView(card.id);
    if (card.kind === 'projects') {
      openMarketShelf('projects');
      return;
    }
    openMarketToolDetail(card.id, card.kind);
  };

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="page-canvas mx-auto flex w-full flex-1 flex-col overflow-x-visible py-3 md:py-4">
        {!executeAllowed ? (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-center text-[11px] leading-relaxed text-amber-900">
            当前为只读访客：可浏览货架，不可发起执行或提报
          </div>
        ) : null}

        <div className="flex w-full flex-col gap-3 pb-6 md:gap-3.5">
          <PageStageHero
            tone="home"
            layout="stack"
            className="home-portal-hero"
            eyebrow={
              <>
                {greetingForNow()}
                {user?.name ? `，${user.name}` : ''}
              </>
            }
            title={
              <span className="home-hero-pillars" aria-label="学工具 用工具 造工具">
                <span className="home-hero-pillars__item home-hero-pillars__item--learn">
                  <i className="fa-solid fa-graduation-cap" aria-hidden />
                  学工具
                </span>
                <span className="home-hero-pillars__item home-hero-pillars__item--use">
                  <i className="fa-solid fa-hand-pointer" aria-hidden />
                  用工具
                </span>
                <span className="home-hero-pillars__item home-hero-pillars__item--build">
                  <i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
                  造工具
                </span>
              </span>
            }
            subtitle="从工作场景出发，找工具 / Skill / Agent"
          >
            <StageIntentDock
              scope="home"
              placeholder="描述你要做的事，或输入工具 / Skill 名称…"
            />
          </PageStageHero>

          <HomeMarketChannels
            cardsByKind={channelCards}
            onOpen={openPortalCard}
            searchActive={Boolean(marketSearch.trim())}
          />
        </div>
      </div>
      <MarketCompareDock />
      <MarketCompareDrawer onOpenCard={openPortalCard} />
    </div>
  );
}
