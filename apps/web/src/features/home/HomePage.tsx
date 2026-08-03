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
  HOME_RANK_TABS,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import { isNewSkill } from '@/domain/contentBadges';
import { downloadSkillFile } from '@/domain/skillExport';
import {
  listCrossShelfMarketCards,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { openMarketShelf, openMarketToolDetail } from '@/domain/openHomeJourney';
import { resolveCaseItemsForScenarioId } from '@/domain/portalCase';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import {
  ensurePlazaToolGuidesBootstrapped,
  usePlazaToolGuideStore,
} from '@/stores/plazaToolGuideStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { isWarRoom } from '@/domain/chat';
import { selectSidebarTasks } from '@/domain/taskUiStatus';
import { useConversationStore } from '@/stores/conversationStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketFeaturedStore } from '@/stores/marketFeaturedStore';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { greetingForNow } from '@/domain/timeGreeting';

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
  const chats = useConversationStore((s) => s.chats);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const switchChat = useConversationStore((s) => s.switchChat);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const marketOrgSelection = useMarketFilterStore((s) => s.orgSelection);
  const marketBusinessFilter = useMarketFilterStore((s) => s.businessFilter);
  const marketSearch = useMarketFilterStore((s) => s.search);
  const setMarketSearch = useMarketFilterStore((s) => s.setSearch);
  const setMarketBusinessFilter = useMarketFilterStore((s) => s.setBusinessFilter);
  const recentItems = useRecentMarketStore((s) => s.items);
  const hydrateRecent = useRecentMarketStore((s) => s.hydrate);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const favoriteItems = useMarketFavoriteStore((s) => s.items);
  const hydrateFavorites = useMarketFavoriteStore((s) => s.hydrate);
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);
  const featuredPins = useMarketFeaturedStore((s) => s.pins);
  const hydrateFeaturedPins = useMarketFeaturedStore((s) => s.hydrate);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const [rankMode, setRankMode] = useState<RankMode>('trending');
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

  const recentTasks = useMemo(() => {
    const list = Object.values(chats).filter((c) => !isWarRoom(c));
    return selectSidebarTasks(list, currentChatId, 3).visible;
  }, [chats, currentChatId]);

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

  const portalCards = useMemo(() => {
    const eng = (id: string) => engagementOf(id);
    const raw = listCrossShelfMarketCards({
      tools,
      viewer,
      org: marketOrgSelection,
      business: marketBusinessFilter,
      search: marketSearch,
      engagementOf: eng,
      howtoToolIds,
      portalByScenario,
      featuredPins,
    });
    return sortByRankMode(raw, rankMode, eng);
  }, [
    tools,
    viewer,
    marketOrgSelection,
    marketBusinessFilter,
    marketSearch,
    engagementOf,
    engagementById,
    howtoToolIds,
    portalByScenario,
    featuredPins,
    rankMode,
  ]);

  useEffect(() => {
    if (portalCards.length) ensureEngagementSeeds(portalCards.map((c) => c.id));
  }, [portalCards]);

  const isFavorited = (card: MarketShelfCardModel) =>
    favoriteItems.some((x) => x.id === card.id && x.kind === card.kind);

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
      rememberCard(card);
      if (!win) showToast('浏览器拦截了弹窗，请允许后重试，或先查看 How to');
      else showToast(`已打开：${card.title}`);
      return true;
    }
    return false;
  };

  const onToggleFavorite = (card: MarketShelfCardModel) => {
    const added = toggleFavorite({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
    showToast(added ? `已收藏：${card.title}` : `已取消收藏：${card.title}`);
  };

  const openPortalCard = (card: MarketShelfCardModel) => {
    rememberCard(card);
    if (card.kind === 'projects') {
      openMarketShelf('projects');
      return;
    }
    openMarketToolDetail(card.id, card.kind);
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
      if (card.kind !== 'projects') openMarketToolDetail(card.id, card.kind);
      else openMarketShelf('projects');
      return;
    }
    showToast(`「${card.title}」暂无 How to，可在门户运营维护`);
  };

  const openMarketItem = (kind: MarketShelfKind, id: string) => {
    if (kind === 'projects') {
      openMarketShelf('projects');
      return;
    }
    openMarketToolDetail(id, kind);
  };

  const portalEmptyHint =
    marketSearch.trim() ||
    marketOrgSelection.dept.length ||
    marketOrgSelection.region.length ||
    marketBusinessFilter !== 'all'
      ? '当前筛选下暂无推荐。可清空左侧领域/区域/场景，或调整搜索关键词。'
      : '权限范围内暂无上架内容。若预期应可见，请联系运营确认可见性与上架状态。';

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
          'mx-auto flex w-full flex-1 flex-col overflow-x-visible py-4 md:py-5',
          showAssistant
            ? 'max-w-[960px] px-8 md:px-11'
            : 'max-w-[1280px] px-5 md:px-7',
        )}
      >
        {showAssistant ? (
          <header className="mb-3 text-center">
            <h1 className="home-slogan-art">
              <span className="home-slogan-gradient">MSS AI 工具平台</span>
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
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-9 pb-8">
            <section className="relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-gradient-to-b from-white via-zinc-50/70 to-zinc-100/40 px-5 py-8 text-center shadow-[0_12px_40px_-28px_rgba(24,24,27,0.35)] md:px-10 md:py-10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.05),transparent_70%)]"
              />
              <p className="relative text-[13px] font-medium text-zinc-500">
                {greetingForNow()}
                {user?.name ? `，${user.name}` : ''}
              </p>
              <h1 className="relative mt-2 text-[28px] font-semibold tracking-tight text-zinc-900 md:text-[32px]">
                探索 AI 的无限可能
              </h1>
              <p className="relative mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-zinc-500">
                发现最热门的 AI 工具、内部应用和创新项目
              </p>
              <form
                className="relative mx-auto mt-6 flex max-w-xl gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  openMarketShelf('external');
                }}
              >
                <label className="relative min-w-0 flex-1">
                  <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400" />
                  <input
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    placeholder="搜索工具或项目（权限范围内）…"
                    className="w-full rounded-2xl border border-zinc-200/90 bg-white py-3.5 pl-11 pr-4 text-[14px] text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100"
                  />
                </label>
                <button
                  type="submit"
                  className="shrink-0 rounded-2xl bg-zinc-900 px-5 py-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                >
                  搜索
                </button>
              </form>
            </section>

            <section>
              <div className="mb-5 flex justify-center">
                <div className="inline-flex flex-wrap justify-center gap-1 rounded-2xl border border-zinc-200/90 bg-white/80 p-1 shadow-sm backdrop-blur">
                  {HOME_RANK_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRankMode(tab.id)}
                      className={cn(
                        'rounded-xl px-4 py-2 text-[12px] font-medium transition',
                        rankMode === tab.id
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {portalCards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {portalCards.map((c) => (
                    <MarketShelfCard
                      key={`${c.kind}-${c.id}`}
                      card={c}
                      favorited={isFavorited(c)}
                      onOpen={() => openPortalCard(c)}
                      onPrimary={() => openPortalPrimary(c)}
                      onHowTo={() => openPortalHowTo(c)}
                      onFavorite={() => onToggleFavorite(c)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-4 py-16 text-center text-[13px] text-zinc-400">
                  {portalEmptyHint}
                </div>
              )}
            </section>

            {recentItems.length > 0 ? (
              <section className="border-t border-zinc-100 pt-7">
                <h2 className="mb-3 text-[13px] font-semibold text-zinc-800">最近使用</h2>
                <div className="flex flex-wrap gap-3">
                  {recentItems.slice(0, 8).map((item) => (
                    <button
                      key={`${item.kind}-${item.id}-${item.at}`}
                      type="button"
                      title={item.title}
                      onClick={() => openMarketItem(item.kind, item.id)}
                      className="flex w-[76px] flex-col items-center gap-1.5 rounded-2xl border border-transparent p-2 transition hover:border-zinc-200 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-100">
                        <ToolLogo
                          name={item.title}
                          logoUrl={item.logoUrl}
                          icon={item.icon}
                          size={36}
                          className="rounded-xl"
                        />
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-zinc-600">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {favoriteItems.length > 0 ? (
              <section id="home-favorites" className="border-t border-zinc-100 pt-7">
                <h2 className="mb-3 text-[13px] font-semibold text-zinc-800">我的收藏</h2>
                <div className="flex flex-wrap gap-3">
                  {favoriteItems.slice(0, 8).map((item) => (
                    <button
                      key={`fav-${item.kind}-${item.id}`}
                      type="button"
                      title={item.title}
                      onClick={() => openMarketItem(item.kind, item.id)}
                      className="flex w-[76px] flex-col items-center gap-1.5 rounded-2xl border border-transparent p-2 transition hover:border-zinc-200 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-100">
                        <ToolLogo
                          name={item.title}
                          logoUrl={item.logoUrl}
                          icon={item.icon}
                          size={36}
                          className="rounded-xl"
                        />
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-zinc-600">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {executeAllowed && recentTasks.length > 0 ? (
              <section className="border-t border-zinc-100 pt-7">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold text-zinc-800">最近任务</h2>
                  <button
                    type="button"
                    onClick={() => setAppView('task')}
                    className="text-[12px] font-medium text-zinc-500 transition hover:text-zinc-800"
                  >
                    查看全部
                  </button>
                </div>
                <ul className="space-y-2">
                  {recentTasks.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          switchChat(c.id);
                          setAppView('task');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-2xl border border-zinc-200/80 bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-[0_8px_24px_-18px_rgba(24,24,27,0.35)]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 ring-1 ring-zinc-100">
                          <i className="fa-solid fa-list-check text-[11px]" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
                          {c.title || c.id}
                        </span>
                        <i className="fa-solid fa-chevron-right text-[9px] text-zinc-300" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
