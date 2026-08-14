import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import { canViewAsset } from '@/domain/assetVisibility';
import { canExecuteChat } from '@/domain/permissions';
import type { BusinessScenarioId } from '@/domain/businessScenarios';
import { BusinessScenarioFilterBar } from '@/components/home/BusinessScenarioFilterBar';
import {
  getSkillBusinessLabel,
  listFeaturedDoTaskSkillIds,
} from '@/domain/skillBusinessScenarios';
import { listDoTaskSceneExperts } from '@/domain/agentBusinessScenarios';
import { buildAgentDemoPrompt } from '@/domain/agents/runtime';
import { isDoTaskSceneExpertsVisible } from '@/domain/homeCapabilityFlags';
import {
  emptyOrgPerspectiveSelection,
  getSkillOrgAxisTags,
  isOrgPerspectiveEmpty,
  skillMatchesOrgPerspectiveSelection,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { HomeCommandBox } from '@/components/home/HomeCommandBox';
import { SectionToolbar } from '@/components/home/HomeScenePortal';
import { SceneExpertPanel } from '@/components/home/SceneExpertPanel';
import {
  CardPageCarousel,
  HOME_SECONDARY_PANEL_H,
  HomeFeedCard,
} from '@/components/home/CardPageCarousel';
import { OrgPerspectiveFilter } from '@/components/home/OrgPerspectiveFilter';
import { StationAnnounceBanner } from '@/components/home/StationAnnounceBanner';
import { HomeAiBriefTeaser } from '@/components/home/HomeAiBriefTeaser';
import { PageStageHero } from '@/components/layout/PageStageHero';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useSessionStore } from '@/stores/sessionStore';
import {
  ensureEngagementSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';
import {
  heatScore,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import { isNewSkill } from '@/domain/contentBadges';
import { downloadSkillFile } from '@/domain/skillExport';
import {
  applyMarketFeaturedPins,
  listInternalOfficeMarketCards,
  listMarketProjectCards,
  listMarketToolCards,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { openMarketShelf, openMarketToolDetail } from '@/domain/openHomeJourney';
import { resolveCaseItemsForScenarioId } from '@/domain/portalCase';
import { HomeMarketChannels } from '@/components/home/HomeMarketChannels';
import { HomeIntentFinder } from '@/components/home/HomeIntentFinder';
import { HomeMyWorkbench } from '@/components/home/HomeMyWorkbench';
import {
  MarketCompareDock,
  MarketCompareDrawer,
} from '@/components/market/MarketCompareDrawer';
import {
  ensurePlazaToolGuidesBootstrapped,
  usePlazaToolGuideStore,
} from '@/stores/plazaToolGuideStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketFeaturedStore } from '@/stores/marketFeaturedStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { greetingForNow } from '@/domain/timeGreeting';

const DEFAULT_RANK_BY_KIND: Record<MarketShelfKind, RankMode> = {
  external: 'trending',
  internal: 'trending',
  projects: 'trending',
};

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
}

const ASK_SUBTITLE_SKILLS = '选场景技能 · 再补充意图 · 对话到执行';
const ASK_SUBTITLE_WITH_EXPERTS =
  '选场景技能，或选营销 / 知识专家 · 点选填入 · 补充意图后执行';

export function HomePage({
  onSubmitTask,
  onInvokeAgent: _onInvokeAgent,
  onInvokeSkill: _onInvokeSkill,
}: HomePageProps) {
  void _onInvokeAgent;
  void _onInvokeSkill;
  const {
    homeMode,
    setDraftText,
    requestComposerFocus,
    applyUserOrgDefaults,
  } = useHomeStore();
  const skills = useMarketplaceStore((s) => s.skills);
  const agents = useMarketplaceStore((s) => s.agents);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const bumpToolInvokes = useMarketplaceStore((s) => s.bumpToolInvokes);
  const user = useSessionStore((s) => s.user);
  const executeAllowed = canExecuteChat(user?.platformRole);
  const roleEnabled = useNavPresentationStore((s) => s.roleEnabled);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const marketSearch = useMarketFilterStore((s) => s.search);
  const setMarketBusinessFilter = useMarketFilterStore((s) => s.setBusinessFilter);
  const hydrateRecent = useRecentMarketStore((s) => s.hydrate);
  const recentItems = useRecentMarketStore((s) => s.items);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const hydrateFavorites = useMarketFavoriteStore((s) => s.hydrate);
  const favoriteItems = useMarketFavoriteStore((s) => s.items);
  const featuredPins = useMarketFeaturedStore((s) => s.pins);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);
  const officeSceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const [rankByKind, setRankByKind] =
    useState<Record<MarketShelfKind, RankMode>>(DEFAULT_RANK_BY_KIND);
  const [businessFilter, setBusinessFilter] = useState<BusinessScenarioId | 'all'>('all');
  const pendingBusinessScenario = useNavigationIntentStore((s) => s.pendingBusinessScenario);
  const consumeBusinessScenario = useNavigationIntentStore((s) => s.consumeBusinessScenario);
  const [orgSelection, setOrgSelection] = useState<OrgPerspectiveSelection>(
    emptyOrgPerspectiveSelection,
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const showSceneExperts = useMemo(() => {
    void roleEnabled;
    return isDoTaskSceneExpertsVisible();
  }, [roleEnabled]);

  useEffect(() => {
    setOrgSelection(emptyOrgPerspectiveSelection());
  }, [user?.id]);

  useEffect(() => {
    hydrateRecent();
    hydrateFavorites();
    hydrateFeaturedPins();
    ensurePlazaToolGuidesBootstrapped();
  }, [hydrateRecent, hydrateFavorites, hydrateFeaturedPins]);

  useEffect(() => {
    if (!user) return;
    applyUserOrgDefaults(
      { deptIds: user.deptIds ?? [], regionId: user.regionId ?? null },
      user.platformRole,
    );
  }, [user, applyUserOrgDefaults]);

  useEffect(() => {
    if (!pendingBusinessScenario) return;
    setBusinessFilter(pendingBusinessScenario);
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

  const featuredSkills = useMemo(() => {
    const byId = new Map(skills.map((s) => [s.id, s]));
    const ids = listFeaturedDoTaskSkillIds(skills, businessFilter, 24);
    return ids
      .map((id) => byId.get(id))
      .filter((s): s is PrototypeSkillSeed => Boolean(s))
      .filter((s) => canViewAsset(s, viewer))
      .filter((s) => skillMatchesOrgPerspectiveSelection(s, orgSelection));
  }, [skills, businessFilter, orgSelection, viewer]);

  const featuredAgents = useMemo(() => {
    if (!showSceneExperts) return [];
    return listDoTaskSceneExperts(agents).filter((a) => canViewAsset(a, viewer));
  }, [agents, viewer, showSceneExperts]);

  useEffect(() => {
    ensureEngagementSeeds(featuredSkills.map((s) => s.id));
  }, [featuredSkills]);

  useEffect(() => {
    if (featuredAgents.length) ensureEngagementSeeds(featuredAgents.map((a) => a.id));
  }, [featuredAgents]);

  const hotSkillIds = useMemo(() => {
    void engagementById;
    return [...featuredSkills]
      .sort(
        (a, b) =>
          heatScore({ ...engagementOf(b.id), uses: engagementOf(b.id).uses + (b.invokes ?? 0) }) -
          heatScore({ ...engagementOf(a.id), uses: engagementOf(a.id).uses + (a.invokes ?? 0) }),
      )
      .slice(0, 3)
      .map((s) => s.id);
  }, [featuredSkills, engagementOf, engagementById]);

  useEffect(() => {
    if (selectedSkillId && !featuredSkills.some((s) => s.id === selectedSkillId)) {
      setSelectedSkillId(null);
    }
  }, [featuredSkills, selectedSkillId]);

  useEffect(() => {
    if (selectedAgentId && !featuredAgents.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(null);
    }
  }, [featuredAgents, selectedAgentId]);

  const orgResetKey = useMemo(
    () => `${orgSelection.dept.join(',')}|${orgSelection.region.join(',')}`,
    [orgSelection],
  );

  const howtoToolIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of guideRecords) ids.add(r.toolId);
    return ids;
  }, [guideRecords]);

  const portalByScenario = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof resolveCaseItemsForScenarioId>>();
    return (scenarioId: string) => {
      if (!cache.has(scenarioId)) {
        cache.set(scenarioId, resolveCaseItemsForScenarioId(scenarioId));
      }
      return cache.get(scenarioId)!;
    };
  }, [portalContent]);

  const channelCards = useMemo(() => {
    const eng = (id: string) => engagementOf(id);
    const org = emptyOrgPerspectiveSelection();
    const q = marketSearch.trim().toLowerCase();
    const matchSearch = (c: MarketShelfCardModel) =>
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.outcomeHint?.toLowerCase().includes(q) ?? false) ||
      (c.sceneTags?.some((t) => t.toLowerCase().includes(q)) ?? false) ||
      c.badges.some((b) => b.label.toLowerCase().includes(q));

    const byPinsThenClicks = (list: MarketShelfCardModel[]) =>
      [...list].sort((a, b) => {
        if (Number(b.featured) !== Number(a.featured)) {
          return Number(b.featured) - Number(a.featured);
        }
        const au = eng(a.id).uses;
        const bu = eng(b.id).uses;
        if (bu !== au) return bu - au;
        return b.heat - a.heat;
      });

    const external = byPinsThenClicks(
      applyMarketFeaturedPins(
        listMarketToolCards(
          tools,
          'external',
          viewer,
          org,
          'all',
          eng,
          howtoToolIds,
        ),
        featuredPins.external,
      ).filter(matchSearch),
    );
    const internal = listInternalOfficeMarketCards(
      tools,
      eng,
      howtoToolIds,
      officeSceneEntries,
    ).filter(matchSearch);
    const projects = sortByRankMode(
      applyMarketFeaturedPins(
        listMarketProjectCards(org, 'all', eng, portalByScenario),
        featuredPins.projects,
      ).filter(matchSearch),
      rankByKind.projects,
      eng,
    );

    return { external, internal, projects } satisfies Record<
      MarketShelfKind,
      MarketShelfCardModel[]
    >;
  }, [
    tools,
    viewer,
    marketSearch,
    engagementOf,
    engagementById,
    howtoToolIds,
    portalByScenario,
    featuredPins,
    rankByKind,
    officeSceneEntries,
  ]);

  const projectsBreakdown = useMemo(() => {
    const q = marketSearch.trim().toLowerCase();
    const skillIds = listFeaturedDoTaskSkillIds(skills, 'all', 256);
    const skill = skillIds
      .map((id) => skills.find((s) => s.id === id))
      .filter((s): s is PrototypeSkillSeed => Boolean(s))
      .filter((s) => canViewAsset(s, viewer))
      .filter((s) => {
        if (!q) return true;
        return `${s.name} ${s.nameZh ?? ''} ${s.desc} ${s.command ?? ''}`
          .toLowerCase()
          .includes(q);
      }).length;
    return {
      skill,
      agent: channelCards.projects.length,
    };
  }, [skills, viewer, marketSearch, channelCards.projects]);

  const intentCatalog = useMemo(
    () => [...channelCards.external, ...channelCards.internal, ...channelCards.projects],
    [channelCards],
  );

  useEffect(() => {
    const ids = intentCatalog.map((c) => c.id);
    if (ids.length) ensureEngagementSeeds(ids);
  }, [intentCatalog]);

  const rememberCard = (card: MarketShelfCardModel) => {
    pushRecent({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
  };

  const openToolUrl = (card: MarketShelfCardModel) => {
    if (card.homepageUrl && card.homepageUrl !== '#') {
      const win = window.open(card.homepageUrl, '_blank', 'noopener,noreferrer');
      bumpToolInvokes(card.id);
      if (card.kind !== 'projects') bumpUse(card.id);
      rememberCard(card);
      if (!win) showToast('浏览器拦截了弹窗，请允许后重试，或先查看 How to');
      else showToast(`已打开：${card.title}`);
      return true;
    }
    return false;
  };

  const openPortalCard = (card: MarketShelfCardModel) => {
    rememberCard(card);
    if (card.kind === 'projects') {
      openMarketShelf('projects');
      return;
    }
    bumpUse(card.id);
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

  const openPortalPrimary = (card: MarketShelfCardModel) => {
    if (card.kind === 'projects') {
      rememberCard(card);
      openMarketShelf('projects');
      return;
    }
    if (openToolUrl(card)) return;
    if (card.hasHowto) {
      showToast(`「${card.title}」请查看 How to 了解使用方式`);
    } else {
      showToast(`「${card.title}」暂无可用链接，请先申请权限或联系运营配置入口`);
    }
  };

  const openPortalHowTo = (card: MarketShelfCardModel) => {
    if (card.hasHowto) {
      showToast(`「${card.title}」How to 材料可在详情页查看`);
      if (card.kind !== 'projects') {
        bumpUse(card.id);
        openMarketToolDetail(card.id, card.kind);
      } else openMarketShelf('projects');
      return;
    }
    showToast(`「${card.title}」暂无 How to，可在门户运营维护`);
  };

  const selectSkill = (skill: PrototypeSkillSeed) => {
    setSelectedSkillId(skill.id);
    setSelectedAgentId(null);
    setDraftText(`${skill.command} `);
    requestComposerFocus();
  };

  const selectAgent = (agent: PrototypeAgentSeed) => {
    setSelectedAgentId(agent.id);
    setSelectedSkillId(null);
    setDraftText(buildAgentDemoPrompt(agent));
    requestComposerFocus();
  };

  const emptyHint =
    businessFilter !== 'all' && !featuredSkills.length
      ? '该业务场景暂无场景技能（建设中）'
      : !isOrgPerspectiveEmpty(orgSelection)
        ? '当前视角下暂无匹配技能'
        : '暂无场景技能';

  const agentEmptyHint = '暂无精选专家，可先用上方场景技能';
  const selectedSkill = featuredSkills.find((s) => s.id === selectedSkillId) ?? null;
  const selectedAgent = featuredAgents.find((a) => a.id === selectedAgentId) ?? null;
  const composerTarget = selectedSkill ?? selectedAgent;
  const askSubtitle = showSceneExperts ? ASK_SUBTITLE_WITH_EXPERTS : ASK_SUBTITLE_SKILLS;

  /** 做任务次入口：仅 openUseSkills 进入 assistant；首页落地始终为平台门户 */
  const showAssistant = executeAllowed && homeMode === 'assistant';

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div
        className={cn(
          'mx-auto flex w-full flex-1 flex-col overflow-x-visible py-3 md:py-4',
          showAssistant
            ? 'max-w-[960px] px-8 md:px-11'
            : 'page-canvas',
        )}
      >
        {showAssistant ? (
          <header className="mb-3 text-center">
            <h1 className="home-slogan-art">
              <span className="home-slogan-gradient">MSS AI提效作战平台</span>
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
              {askSubtitle}
            </p>
          </header>
        ) : null}

        {!executeAllowed ? (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-center text-[11px] leading-relaxed text-amber-900">
            当前为只读访客：可浏览货架，不可发起执行或提报
          </div>
        ) : null}

        {showAssistant ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-visible pb-2">
            <div className="flex items-center justify-between gap-2">
              <StationAnnounceBanner className="min-w-0 flex-1 border-b border-zinc-100/90 pb-2" />
              <button
                type="button"
                onClick={() => useHomeStore.getState().setHomeMode('portal')}
                className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50"
              >
                返回首页
              </button>
            </div>

            <section className="overflow-x-visible">
              <SectionToolbar
                title="场景技能"
                filters={
                  <BusinessScenarioFilterBar value={businessFilter} onChange={setBusinessFilter} />
                }
                trailing={<OrgPerspectiveFilter value={orgSelection} onChange={setOrgSelection} />}
              />

              <CardPageCarousel
                items={featuredSkills}
                getKey={(s) => s.id}
                resetKey={`${businessFilter}-${orgResetKey}`}
                emptyText={emptyHint}
                renderCard={(skill) => {
                  const orgTags = getSkillOrgAxisTags(skill);
                  const bizLabel = getSkillBusinessLabel(skill);
                  const titleTags =
                    orgTags.length > 0
                      ? orgTags
                      : bizLabel
                        ? [{ axis: 'dept' as const, id: 'biz', label: bizLabel }]
                        : [];
                  return (
                    <HomeFeedCard
                      title={skill.name}
                      tags={titleTags}
                      description={skill.desc}
                      active={selectedSkillId === skill.id}
                      onClick={() => selectSkill(skill)}
                      contentId={skill.id}
                      baseUses={skill.invokes ?? 0}
                      isNew={isNewSkill(skill.id)}
                      isHot={hotSkillIds.includes(skill.id)}
                      onDownload={() => {
                        downloadSkillFile(skill);
                        showToast(`已下载技能包：${skill.name}`);
                      }}
                      onAfterAction={(action) => {
                        if (action === 'dislike') showToast('已反馈，运营将关注优化');
                      }}
                    />
                  );
                }}
              />
            </section>

            {showSceneExperts ? (
              <SceneExpertPanel
                agents={featuredAgents}
                selectedId={selectedAgentId}
                onSelect={selectAgent}
                emptyText={agentEmptyHint}
              />
            ) : null}

            {composerTarget ? (
              <section>
                <SectionToolbar
                  title="补充意图"
                  align="center"
                  filters={
                    <p className="truncate leading-none text-[11px] text-zinc-500">
                      已选{' '}
                      <span className="font-medium text-zinc-700">
                        {selectedSkill?.name ?? selectedAgent?.name}
                      </span>
                      {selectedAgent ? (
                        <span className="text-zinc-400"> · 专家</span>
                      ) : (
                        <span className="text-zinc-400"> · 技能</span>
                      )}
                    </p>
                  }
                  trailing={
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkillId(null);
                        setSelectedAgentId(null);
                        setDraftText('');
                      }}
                      className="text-[11px] font-medium leading-none text-zinc-400 transition hover:text-zinc-700"
                    >
                      取消
                    </button>
                  }
                />
                <div
                  className={cn(
                    'overflow-hidden rounded-xl border border-zinc-200/80 bg-white',
                    HOME_SECONDARY_PANEL_H,
                  )}
                >
                  <HomeCommandBox
                    compact
                    placeholder={
                      selectedSkill
                        ? `补充意图，例如：${selectedSkill.command} 本周重点市场…`
                        : `补充意图后发送，将调用专家「${selectedAgent?.name ?? ''}」`
                    }
                    onSubmit={(text) => {
                      if (selectedAgent) {
                        onSubmitTask(text, selectedAgent);
                        return;
                      }
                      onSubmitTask(text, useHomeStore.getState().resolveAgentFromText(text));
                    }}
                  />
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 pb-6 md:gap-3.5">
            <PageStageHero
              tone="home"
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
            >
              <HomeIntentFinder catalog={intentCatalog} onOpen={openPortalCard} />
            </PageStageHero>

            <StationAnnounceBanner className="rounded-xl border-0 bg-white/90 px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.05)]" />

            <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-3.5">
              <HomeMyWorkbench
                favorites={favoriteItems}
                recent={recentItems}
                onOpen={openWorkbenchItem}
              />
              <HomeAiBriefTeaser />
            </div>

            <HomeMarketChannels
              cardsByKind={channelCards}
              projectsBreakdown={projectsBreakdown}
              rankByKind={rankByKind}
              onRankChange={(kind, mode) =>
                setRankByKind((prev) => ({ ...prev, [kind]: mode }))
              }
              onOpen={openPortalCard}
              onPrimary={openPortalPrimary}
              onHowTo={openPortalHowTo}
              searchActive={Boolean(marketSearch.trim())}
            />
          </div>
        )}
      </div>
      <MarketCompareDock />
      <MarketCompareDrawer onOpenCard={openPortalCard} />
    </div>
  );
}
