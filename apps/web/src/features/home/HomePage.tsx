import { useEffect, useMemo, useState } from 'react';
import { canExecuteChat } from '@/domain/permissions';
import { PageStageHero } from '@/components/layout/PageStageHero';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import {
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import {
  legacyHomeChannelCards,
  listHomeFeaturedCandidates,
  resolveHomeFeaturedCards,
  takeLegacyProjectQuota,
  type HomeChannelCardContext,
} from '@/domain/homeFeatured';
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
import { useExternalToolLayoutStore } from '@/stores/externalToolLayoutStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useHomeFeaturedStore } from '@/stores/homeFeaturedStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { greetingForNow } from '@/domain/timeGreeting';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { resolveHomeProjectDetailTarget } from '@/domain/homeProjectDetail';
import { MarketSkillDetailModal } from '@/features/market/MarketSkillDetailModal';
import { CatalogAgentDetailModal } from '@/features/market/CatalogAgentDetailModal';
import { allowsMarketScenarioRun } from '@/domain/marketRunCapability';
import { useNavPresentationStore } from '@/stores/navPresentationStore';

export function HomePage({
  onInvokeAgent,
  onInvokeSkill,
}: {
  onInvokeAgent?: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill?: (skill: PrototypeSkillSeed) => void;
}) {
  const { applyUserOrgDefaults } = useHomeStore();
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const isGuest = useSessionStore((s) => s.isGuest);
  const executeAllowed = canExecuteChat(user?.platformRole);
  const navPreset = useNavPresentationStore((s) => s.preset);
  const allowScenarioRun = allowsMarketScenarioRun(navPreset);
  const canRunSkills = allowScenarioRun && (executeAllowed || isGuest) && Boolean(onInvokeSkill);
  const canRunAgents = allowScenarioRun && (executeAllowed || isGuest) && Boolean(onInvokeAgent);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
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
  const externalToolLayout = useExternalToolLayoutStore((s) => s.document);
  const hydrateExternalToolLayout = useExternalToolLayoutStore((s) => s.hydrate);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const officeSceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const homeFeaturedChannels = useHomeFeaturedStore((s) => s.channels);
  const homeFeaturedLoaded = useHomeFeaturedStore((s) => s.loaded);
  const homeFeaturedWorkspaceId = useHomeFeaturedStore((s) => s.workspaceId);
  const homeFeaturedError = useHomeFeaturedStore((s) => s.error);
  const hydrateHomeFeatured = useHomeFeaturedStore((s) => s.hydrate);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const pendingBusinessScenario = useNavigationIntentStore((s) => s.pendingBusinessScenario);
  const consumeBusinessScenario = useNavigationIntentStore((s) => s.consumeBusinessScenario);
  const [skillDetail, setSkillDetail] = useState<PrototypeSkillSeed | null>(null);
  const [agentDetail, setAgentDetail] = useState<PrototypeAgentSeed | null>(null);
  const currentSkillDetail = skillDetail
    ? skills.find((item) => item.id === skillDetail.id) ?? skillDetail
    : null;

  useEffect(() => {
    hydrateRecent();
    hydrateFavorites();
    hydrateHidden();
    ensurePlazaToolGuidesBootstrapped();
    if (workspaceId && apiConnected) {
      void hydrateHomeFeatured(workspaceId);
      void hydrateExternalToolLayout(workspaceId);
    }
  }, [
    hydrateRecent,
    hydrateFavorites,
    hydrateHidden,
    hydrateHomeFeatured,
    hydrateExternalToolLayout,
    workspaceId,
    apiConnected,
  ]);

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

  const cardContext = useMemo<HomeChannelCardContext>(
    () => ({
      tools,
      skills,
      agents,
      viewer,
      engagementOf: (id: string) => engagementOf(id),
      howtoToolIds,
      canRunSkills,
      canRunAgents,
    }),
    // engagementById 变化时重新读取互动数据
    [tools, skills, agents, viewer, engagementOf, engagementById, howtoToolIds, canRunSkills, canRunAgents],
  );

  // 首页三栏只读取「门户运营 → 首页配置」；从未保存过配置时才沿用旧规则，避免首页空白。
  const homeFeaturedPending =
    apiConnected && !homeFeaturedError && (!homeFeaturedLoaded || homeFeaturedWorkspaceId !== workspaceId);
  const usesHomeFeaturedConfig = Boolean(homeFeaturedChannels) && !homeFeaturedPending;

  const scopedChannelCards = useMemo((): Record<MarketShelfKind, MarketShelfCardModel[]> => {
    if (homeFeaturedPending) return { external: [], internal: [], projects: [] };
    if (homeFeaturedChannels) {
      return resolveHomeFeaturedCards(homeFeaturedChannels, listHomeFeaturedCandidates(cardContext));
    }
    return legacyHomeChannelCards({ ...cardContext, externalToolLayout, officeSceneEntries });
  }, [homeFeaturedPending, homeFeaturedChannels, cardContext, externalToolLayout, officeSceneEntries]);

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
    // 首页配置决定 Hub 栏顺序与构成；只有旧规则才按 2 Skill + 1 Agent 补位。
    const takeProjectQuota = usesHomeFeaturedConfig
      ? (list: MarketShelfCardModel[]) => list
      : takeLegacyProjectQuota;
    if (!q) {
      return {
        external: applyFav(scopedChannelCards.external),
        internal: applyFav(scopedChannelCards.internal),
        // 先应用个人隐藏/收藏筛选，再补位。
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
  }, [scopedChannelCards, usesHomeFeaturedConfig, marketSearch, favoritesOnly, favoriteKeys, hiddenKeys]);

  const rememberCard = (card: MarketShelfCardModel) => {
    pushRecent({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
      ...(card.assetType ? { assetType: card.assetType } : {}),
    });
  };

  const openPortalCard = (card: MarketShelfCardModel) => {
    if (card.kind === 'projects') {
      const target = resolveHomeProjectDetailTarget(card.id, skills, agents);
      if (target?.kind === 'skill') {
        rememberCard(card);
        setSkillDetail(target.item);
        return;
      }
      if (target?.kind === 'agent') {
        rememberCard(card);
        setAgentDetail(target.item);
        return;
      }
      // 兼容已从当前市场快照移除的历史卡片。
      openMarketShelf('projects');
      return;
    }
    rememberCard(card);
    openMarketToolDetail(card.id, card.kind);
  };

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="page-canvas mx-auto flex w-full flex-1 flex-col overflow-x-visible py-3 md:py-4">
        {!executeAllowed && !isGuest ? (
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
            onOpenChannel={openMarketShelf}
            searchActive={Boolean(marketSearch.trim())}
            loading={homeFeaturedPending}
          />
        </div>
      </div>
      <MarketCompareDock />
      <MarketCompareDrawer onOpenCard={openPortalCard} />
      {currentSkillDetail ? (
        <MarketSkillDetailModal
          skill={currentSkillDetail}
          canRun={canRunSkills}
          onClose={() => setSkillDetail(null)}
          onRun={(skill) => {
            setSkillDetail(null);
            onInvokeSkill?.(skill);
          }}
          onToast={showToast}
        />
      ) : null}
      {agentDetail ? (
        <CatalogAgentDetailModal
          agent={agentDetail}
          canRun={canRunAgents}
          onClose={() => setAgentDetail(null)}
          onRun={(agent) => {
            setAgentDetail(null);
            onInvokeAgent?.(agent);
          }}
          onToast={showToast}
        />
      ) : null}
    </div>
  );
}
