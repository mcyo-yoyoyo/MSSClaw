import { useEffect, useMemo, useState } from 'react';
import { canViewAsset } from '@/domain/assetVisibility';
import { canExecuteChat } from '@/domain/permissions';
import { StationAnnounceBanner } from '@/components/home/StationAnnounceBanner';
import { PageStageHero } from '@/components/layout/PageStageHero';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { type RankMode } from '@/domain/contentEngagement';
import { HOME_CHANNEL_PINS } from '@/domain/homeChannelPins';
import {
  applyMarketFeaturedPins,
  listInternalOfficeMarketCards,
  listMarketToolCards,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { openMarketShelf, openMarketToolDetail } from '@/domain/openHomeJourney';
import { HomeMarketChannels } from '@/components/home/HomeMarketChannels';
import { HomeMeSummary } from '@/components/home/HomeMeSummary';
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

const DEFAULT_RANK_BY_KIND: Record<MarketShelfKind, RankMode> = {
  external: 'trending',
  internal: 'trending',
  projects: 'trending',
};

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
  const recentItems = useRecentMarketStore((s) => s.items);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const hydrateFavorites = useMarketFavoriteStore((s) => s.hydrate);
  const favoriteItems = useMarketFavoriteStore((s) => s.items);
  const hiddenKeys = useMarketHiddenStore((s) => s.keys);
  const hydrateHidden = useMarketHiddenStore((s) => s.hydrate);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);
  const officeSceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const [rankByKind, setRankByKind] =
    useState<Record<MarketShelfKind, RankMode>>(DEFAULT_RANK_BY_KIND);
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

    const external = applyMarketFeaturedPins(
      listMarketToolCards(tools, 'external', viewer, org, 'all', eng, howtoToolIds),
      [...HOME_CHANNEL_PINS.external],
    );
    const internal = applyMarketFeaturedPins(
      listInternalOfficeMarketCards(tools, eng, howtoToolIds, officeSceneEntries),
      [...HOME_CHANNEL_PINS.internal],
    );
    const projects = applyMarketFeaturedPins(
      agents
        .filter((agent) => agent.published)
        .filter((agent) => canViewAsset(agent, viewer))
        .map((agent) => {
          const engagement = eng(agent.id);
          const badges: MarketShelfCardModel['badges'] = [];
          if (agent.ownerDeptIds?.[0]) {
            badges.push({ label: getDeptLabel(agent.ownerDeptIds[0]), tone: 'dept' });
          }
          if (agent.ownerRegionIds?.[0]) {
            badges.push({ label: getRegionLabel(agent.ownerRegionIds[0]), tone: 'region' });
          }
          if (agent.businessScenarioId) {
            badges.push({
              label: getBusinessScenarioMeta(agent.businessScenarioId).label,
              tone: 'type',
            });
          }
          return {
            id: agent.id,
            kind: 'projects' as const,
            title: agent.name,
            description: agent.desc,
            outcomeHint: agent.desc,
            securityLevel: 'mss' as const,
            icon: agent.icon || 'fa-robot',
            badges,
            featured: true,
            heat: agent.invokes ?? 0,
            likes: engagement.likes,
            dislikes: engagement.dislikes,
            downloads: engagement.downloads,
            hasHowto: Boolean(agent.systemPrompt || agent.skillIds?.length),
            primaryAction: 'detail' as const,
          };
        }),
      [...HOME_CHANNEL_PINS.projects],
    );

    return { external, internal, projects } satisfies Record<
      MarketShelfKind,
      MarketShelfCardModel[]
    >;
  }, [
    tools,
    agents,
    viewer,
    engagementOf,
    engagementById,
    howtoToolIds,
    officeSceneEntries,
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
    if (!q) {
      return {
        external: applyFav(scopedChannelCards.external),
        internal: applyFav(scopedChannelCards.internal),
        projects: applyFav(scopedChannelCards.projects),
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
      projects: applyFav(grouped.projects),
    };
  }, [scopedChannelCards, marketSearch, favoritesOnly, favoriteKeys, hiddenKeys]);

  const projectsBreakdown = useMemo(() => {
    const skill = skills
      .filter((item) => item.published && item.featuredInMssMarket !== false)
      .filter((s) => canViewAsset(s, viewer))
      .length;
    const agent = agents
      .filter((item) => item.published)
      .filter((item) => canViewAsset(item, viewer)).length;
    return {
      skill,
      agent,
    };
  }, [skills, agents, viewer]);

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

  const openWorkbenchItem = (item: {
    id: string;
    kind: MarketShelfKind;
    title: string;
    icon?: string;
    logoUrl?: string;
  }) => {
    const card =
      channelCards[item.kind].find((c) => c.id === item.id) ??
      ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: '',
        icon: item.icon ?? 'fa-solid fa-star',
        logoUrl: item.logoUrl,
        badges: [],
        featured: false,
        heat: 0,
        hasHowto: false,
        primaryAction: 'detail' as const,
      } satisfies MarketShelfCardModel);
    openPortalCard(card);
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
          <StationAnnounceBanner className="rounded-xl border-0 bg-white/90 px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.05)]" />

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

          <HomeMeSummary
            favorites={favoriteItems}
            recent={recentItems}
            onOpen={openWorkbenchItem}
          />

          <HomeMarketChannels
            cardsByKind={channelCards}
            projectsBreakdown={projectsBreakdown}
            rankByKind={rankByKind}
            onRankChange={(kind, mode) =>
              setRankByKind((prev) => ({ ...prev, [kind]: mode }))
            }
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
