import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import { canViewAsset } from '@/domain/assetVisibility';
import { canExecuteChat } from '@/domain/permissions';
import { allowsTaskExecutionSurfaces } from '@/domain/marketRunCapability';
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
import { useMarketFeaturedStore } from '@/stores/marketFeaturedStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { AssetAccentMark } from '@/components/brand/AssetAccentMark';
import { ToolLogo } from '@/components/brand/ToolLogo';
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
  const navPreset = useNavPresentationStore((s) => s.preset);
  const showRecentTasks = executeAllowed && allowsTaskExecutionSurfaces(navPreset);
  const roleEnabled = useNavPresentationStore((s) => s.roleEnabled);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const chats = useConversationStore((s) => s.chats);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const switchChat = useConversationStore((s) => s.switchChat);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const marketSearch = useMarketFilterStore((s) => s.search);
  const setMarketSearch = useMarketFilterStore((s) => s.setSearch);
  const setMarketBusinessFilter = useMarketFilterStore((s) => s.setBusinessFilter);
  const recentItems = useRecentMarketStore((s) => s.items);
  const hydrateRecent = useRecentMarketStore((s) => s.hydrate);
  const pushRecent = useRecentMarketStore((s) => s.push);
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
    hydrateFeaturedPins();
    ensurePlazaToolGuidesBootstrapped();
  }, [hydrateRecent, hydrateFeaturedPins]);

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

  const channelCards = useMemo(() => {
    const eng = (id: string) => engagementOf(id);
    const org = emptyOrgPerspectiveSelection();
    const q = marketSearch.trim().toLowerCase();
    const matchSearch = (c: MarketShelfCardModel) =>
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
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

  useEffect(() => {
    const ids = [
      ...channelCards.external,
      ...channelCards.internal,
      ...channelCards.projects,
    ].map((c) => c.id);
    if (ids.length) ensureEngagementSeeds(ids);
  }, [channelCards]);

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

  const openMarketItem = (kind: MarketShelfKind, id: string) => {
    if (kind === 'projects') {
      openMarketShelf('projects');
      return;
    }
    openMarketToolDetail(id, kind);
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
            : 'max-w-[1360px] px-5 md:px-7',
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
          <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 pb-6 md:gap-5">
            <StationAnnounceBanner className="rounded-xl border border-zinc-200/80 bg-white/90 px-3.5 py-1.5 shadow-[0_6px_18px_-16px_rgba(24,24,27,0.35)]" />

            <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-r from-white via-zinc-50/60 to-white px-4 py-4 shadow-[0_10px_28px_-24px_rgba(24,24,27,0.35)] md:px-5 md:py-4">
              <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-5">
                <div className="min-w-0 md:max-w-[52%]">
                  <p className="text-[12px] font-medium text-zinc-500">
                    {greetingForNow()}
                    {user?.name ? `，${user.name}` : ''}
                  </p>
                  <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]">
                    探索 AI 的无限可能
                  </h1>
                  <p className="mt-1 text-[12px] leading-snug text-zinc-500">
                    工具分三类：外部工具精选 · 公司工具推荐 · MSS工具集市
                  </p>
                </div>
                <form
                  className="flex w-full gap-2 md:max-w-md md:flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    openMarketShelf('external');
                  }}
                >
                  <label className="relative min-w-0 flex-1">
                    <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400" />
                    <input
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      placeholder="搜索工具或项目（权限范围内）…"
                      className="w-full rounded-xl border border-zinc-200/90 bg-white py-2.5 pl-10 pr-3 text-[13px] text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100"
                    />
                  </label>
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                  >
                    搜索
                  </button>
                </form>
              </div>
            </section>

            <HomeMarketChannels
              cardsByKind={channelCards}
              rankByKind={rankByKind}
              onRankChange={(kind, mode) =>
                setRankByKind((prev) => ({ ...prev, [kind]: mode }))
              }
              onOpen={openPortalCard}
              onPrimary={openPortalPrimary}
              onHowTo={openPortalHowTo}
              searchActive={Boolean(marketSearch.trim())}
            />

            {recentItems.length > 0 ? (
              <section className="border-t border-zinc-100 pt-4">
                <h2 className="mb-2.5 text-[13px] font-semibold text-zinc-800">最近使用</h2>
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
                        {item.kind === 'external' || item.kind === 'internal' ? (
                          <ToolLogo
                            name={item.title}
                            logoUrl={item.logoUrl}
                            icon={item.icon}
                            size={36}
                            className="rounded-xl"
                          />
                        ) : (
                          <AssetAccentMark id={item.id} className="mt-0 h-2.5 w-2.5" />
                        )}
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-zinc-600">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {showRecentTasks && recentTasks.length > 0 ? (
              <section className="border-t border-zinc-100 pt-4">
                <div className="mb-2.5 flex items-center justify-between">
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
