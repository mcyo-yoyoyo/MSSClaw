import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import {
  buildScenarioBundles,
  type PortalMapCard,
  type ScenarioBundle,
  type ScenarioListFilter,
} from '@/domain/portalMap';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
} from '@/components/center/CenterShell';
import { CaseEditorModal } from '@/components/center/CaseEditorModal';
import { CaseOutcomePanel } from '@/components/content/CaseOutcomePanel';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { downloadCaseFile, downloadScenarioCasePack } from '@/domain/caseExport';
import { isSystemAdmin } from '@/domain/currentUser';
import {
  getPortalItemById,
  outcomeFromNarrativeCard,
  resolveScenarioCaseItems,
} from '@/domain/portalCase';
import {
  resolvePipelineStepTargets,
  resolveScenarioDemoPlan,
  type ScenarioDemoPlan,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import { buildSkillDemoPrompt } from '@/domain/skillRuntime';
import { buildAgentDemoPrompt } from '@/domain/agents/runtime';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { openPortalCard } from '@/domain/portalNavigation';
import type { DeptFilter, EfficiencyFilter, RegionFilter } from '@/domain/assetFilters';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useHomeStore } from '@/stores/homeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { returnFromResource } from '@/domain/openResourceNav';
import { canExecuteChat } from '@/domain/permissions';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { ExpertTeamModal } from '@/components/content/ExpertTeamModal';

interface AiMapPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
  /** 专家团同会话顺序接力 */
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}

function Quadrant({
  title,
  emptyHint,
  cards,
  onCard,
}: {
  title: string;
  emptyHint: string;
  cards: PortalMapCard[];
  onCard: (card: PortalMapCard) => void;
}) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-claw-600">{title}</h3>
        <span className="text-[10px] text-zinc-400">{cards.length}</span>
      </div>
      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-6 text-center text-[11px] text-zinc-400">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {cards.slice(0, 5).map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onCard(card)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-zinc-50"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-white">
                  <i className={`fa-solid ${card.icon} text-[9px]`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-zinc-900">{card.title}</span>
                  <span className="block truncate text-[10px] text-zinc-400">{card.kindLabel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReturnToTaskButton() {
  const returnTarget = useNavigationIntentStore((s) => s.returnTarget);
  if (!returnTarget) return null;
  return (
    <button
      type="button"
      onClick={() => returnFromResource()}
      className="rounded-xl border border-zinc-900/15 bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
    >
      <i className="fa-solid fa-arrow-left mr-1.5 text-[10px]" />
      返回任务
    </button>
  );
}

export function AiMapPage({
  onInvokeAgent,
  onInvokeSkill,
  onAskKbDocument,
  onStartExpertTeam,
}: AiMapPageProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const user = useSessionStore((s) => s.user);

  const [listFilter, setListFilter] = useState<ScenarioListFilter>('related');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [narrativeCard, setNarrativeCard] = useState<PortalMapCard | null>(null);
  const [editorTarget, setEditorTarget] = useState<string | 'new' | null>(null);
  const [narrativeKind, setNarrativeKind] = useState<'all' | 'case' | 'training' | 'news'>('all');
  const [teamPlan, setTeamPlan] = useState<ScenarioDemoPlan | null>(null);
  const canEditCase = isSystemAdmin(user?.platformRole);
  const [capsOpen, setCapsOpen] = useState(true);
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [efficiencyFilter, setEfficiencyFilter] = useState<EfficiencyFilter>('all');
  const pendingCaseId = useNavigationIntentStore((s) => s.pendingCaseId);
  const consumeCaseId = useNavigationIntentStore((s) => s.consumeCaseId);
  const pendingScenarioId = useNavigationIntentStore((s) => s.pendingScenarioId);
  const consumeScenarioId = useNavigationIntentStore((s) => s.consumeScenarioId);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const bundles = useMemo(
    () =>
      buildScenarioBundles({
        agents,
        skills,
        tools,
        portalContent,
        affiliation,
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        filter: listFilter,
        search,
        deptFilter,
        regionFilter,
        efficiencyFilter,
      }),
    [
      agents,
      skills,
      tools,
      portalContent,
      affiliation,
      user?.id,
      user?.name,
      user?.platformRole,
      listFilter,
      search,
      deptFilter,
      regionFilter,
      efficiencyFilter,
    ],
  );

  /** 深链定位用不带搜索的全量场景列表 */
  const allBundles = useMemo(
    () =>
      buildScenarioBundles({
        agents,
        skills,
        tools,
        portalContent,
        affiliation,
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        filter: 'all',
        search: '',
      }),
    [agents, skills, tools, portalContent, affiliation, user?.id, user?.name, user?.platformRole],
  );

  useEffect(() => {
    if (!bundles.length) {
      // 深链等待全量列表时，勿清空已选场景
      if (pendingScenarioId || pendingCaseId || allBundles.some((b) => b.id === selectedId)) {
        return;
      }
      setSelectedId(null);
      return;
    }
    if (!selectedId || !bundles.some((b) => b.id === selectedId)) {
      // 已选场景在全量中存在、仅被筛选隐藏时，保留选中，避免盖掉深链
      if (selectedId && allBundles.some((b) => b.id === selectedId)) return;
      setSelectedId(bundles[0].id);
    }
  }, [bundles, selectedId, allBundles, pendingScenarioId, pendingCaseId]);

  useEffect(() => {
    setNarrativeKind('all');
  }, [selectedId]);

  // 原案例库 / 首页橱窗深链：定位场景并打开对应案例叙事
  useEffect(() => {
    if (!pendingCaseId) return;
    if (!allBundles.length) return;
    const id = pendingCaseId;
    const hit = allBundles.find((b) =>
      b.cases.some((c) => c.action.type === 'case' && c.action.caseId === id),
    );
    if (!hit) {
      consumeCaseId();
      showToast(`未在场景案例中找到：${id}`);
      return;
    }
    consumeCaseId();
    setListFilter('all');
    setDeptFilter('all');
    setRegionFilter('all');
    setEfficiencyFilter('all');
    setSearch('');
    setSelectedId(hit.id);
    const card = hit.cases.find((c) => c.action.type === 'case' && c.action.caseId === id) ?? null;
    if (card) {
      setNarrativeCard(card);
      setNarrativeKind(card.kind === 'insight' ? 'news' : card.kind === 'training' ? 'training' : card.kind === 'case' ? 'case' : 'all');
    }
  }, [pendingCaseId, allBundles, consumeCaseId, showToast]);

  // 发现页场景入口：聚焦场景；若同时带了案例深链则由上方 case effect 打开叙事
  useEffect(() => {
    if (!pendingScenarioId) return;
    if (!allBundles.length) return;
    const id = pendingScenarioId;
    const hit = allBundles.find((b) => b.id === id);
    if (!hit) {
      consumeScenarioId();
      showToast(`未找到场景：${id}`);
      return;
    }
    consumeScenarioId();
    setListFilter('all');
    setDeptFilter('all');
    setRegionFilter('all');
    setEfficiencyFilter('all');
    setSearch('');
    setSelectedId(hit.id);
    // 无独立案例深链时，自动打开该场景主案例
    if (!useNavigationIntentStore.getState().peekCaseId()) {
      const primary =
        hit.cases.find(
          (c) =>
            c.action.type === 'case' &&
            getPortalItemById(c.action.caseId)?.isGold &&
            getPortalItemById(c.action.caseId)?.type === 'case',
        ) ??
        hit.cases.find(
          (c) => c.action.type === 'case' && getPortalItemById(c.action.caseId)?.type === 'case',
        ) ??
        hit.cases[0] ??
        null;
      if (primary) setNarrativeCard(primary);
    }
  }, [pendingScenarioId, allBundles, consumeScenarioId, showToast]);

  const selected: ScenarioBundle | null = bundles.find((b) => b.id === selectedId) ?? null;

  const narrativeCards = useMemo(() => {
    if (!selected) return [];
    if (narrativeKind === 'all') return selected.cases;
    if (narrativeKind === 'news') {
      return selected.cases.filter((c) => c.kind === 'news' || c.kind === 'insight');
    }
    return selected.cases.filter((c) => c.kind === narrativeKind);
  }, [selected, narrativeKind]);

  const narrativeKindOptions = useMemo(() => {
    if (!selected?.cases.length) return [] as Array<'case' | 'training' | 'news'>;
    const kinds = selected.cases.map((c) => (c.kind === 'insight' ? 'news' : c.kind));
    const set = new Set(kinds);
    return (['case', 'training', 'news'] as const).filter((k) => set.has(k));
  }, [selected]);

  const handleCard = (card: PortalMapCard) => {
    openPortalCard(card, { onInvokeAgent, onInvokeSkill, onAskKbDocument, showToast });
  };

  /** 能力组合：专家/技能仅展示挂载，不开任务；工具/知识仍可打开 */
  const handleCapabilityCard = (card: PortalMapCard) => {
    if (card.action.type === 'agent' || card.action.type === 'skill') {
      showToast(
        card.action.type === 'agent'
          ? `本场景挂载专家「${card.title}」· 请用上方「一键打样」开任务`
          : `本场景挂载技能「${card.title}」· 请用上方「一键打样」开任务`,
      );
      return;
    }
    handleCard(card);
  };

  const invokePipelineStep = (plan: ScenarioDemoPlan, step: ScenarioPipelineStep, stepIndex: number) => {
    const { agent, skill } = resolvePipelineStepTargets(step);
    const total = plan.steps.length;
    const prefix = `【专家团 ${stepIndex + 1}/${total} · ${plan.scenarioLabel} · ${step.label}】`;
    if (skill) {
      const body = buildSkillDemoPrompt(skill);
      if (agent) {
        onInvokeAgent(agent, `${prefix} ${body}`);
      } else {
        onInvokeSkill(skill);
      }
      showToast(`专家团第 ${stepIndex + 1}/${total} 步：${step.label}`);
      return;
    }
    if (agent) {
      onInvokeAgent(agent, `${prefix} ${buildAgentDemoPrompt(agent)}`);
      showToast(`专家团第 ${stepIndex + 1}/${total} 步：${agent.name}`);
      return;
    }
    showToast(`未找到可调用的专家/技能：${step.label}`);
  };

  const startScenario = (bundle: ScenarioBundle) => {
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) {
      showToast('该场景暂无可打样的技能或能力');
      return;
    }
    if (plan.mode === 'team') {
      setTeamPlan(plan);
      return;
    }
    if (plan.soloSkill) {
      onInvokeSkill(plan.soloSkill);
      showToast(`已启动打样：${plan.label}`);
      return;
    }
    if (plan.soloAgent) {
      onInvokeAgent(plan.soloAgent);
      showToast(`已启动打样：${plan.soloAgent.name}`);
      return;
    }
    showToast('该场景暂无可打样的技能或能力');
  };

  const selectedDemoPlan = selected ? resolveScenarioDemoPlan(selected) : null;

  const downloadScenarioPack = (bundle: ScenarioBundle) => {
    const items = resolveScenarioCaseItems(bundle);
    if (!items.length) {
      showToast('该场景暂无可下载的案例包');
      return;
    }
    downloadScenarioCasePack(bundle.label, items);
    const bump = useContentEngagementStore.getState().bumpDownload;
    items.forEach((i) => bump(i.id));
    showToast(
      items.length === 1
        ? `已下载案例包：${items[0]!.title}`
        : `已下载场景案例包（${items.length} 个）`,
    );
  };

  const narrativeOutcome = narrativeCard ? outcomeFromNarrativeCard(narrativeCard) : null;
  const narrativeSkill = narrativeOutcome?.skillId
    ? skills.find((s) => s.id === narrativeOutcome.skillId)
    : undefined;
  const narrativeAgent = narrativeOutcome?.agentId
    ? agents.find((a) => a.id === narrativeOutcome.agentId)
    : undefined;

  return (
    <div className="center-surface center-page scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <CenterPageHeader
          title="场景案例"
          subtitle="下载案例包 · 一键打样开任务（多步场景走接力，无需进入专家库）"
          tip={
            <>
              3 分钟演示：选场景 → 打开成效卡 →「一键打样」开任务。首页「学 · 找案例」是橱窗，这里是完整案例库。
            </>
          }
          actions={
            <>
              <ReturnToTaskButton />
              <CenterSearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索场景名称…"
              />
              <button
                type="button"
                onClick={() => {
                  useHomeStore.getState().setHomeMode('portal');
                  useNavigationIntentStore.getState().clearReturnTarget();
                  setAppView('home');
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                返回找案例
              </button>
              {canEditCase ? (
                <button
                  type="button"
                  onClick={() => setEditorTarget('new')}
                  className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
                >
                  <i className="fa-solid fa-plus mr-1" />
                  新建案例
                </button>
              ) : null}
            </>
          }
        />

        <OrgAssetFilterBar
          deptFilter={deptFilter}
          regionFilter={regionFilter}
          efficiencyFilter={efficiencyFilter}
          scenarioFilter={listFilter}
          onDeptChange={setDeptFilter}
          onRegionChange={setRegionFilter}
          onEfficiencyChange={setEfficiencyFilter}
          onScenarioFilterChange={setListFilter}
        />

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white md:w-[260px]">
            <div className="border-b border-zinc-100 px-3 py-2">
              <p className="text-[11px] font-semibold text-zinc-700">业务场景</p>
              <p className="text-[10px] text-zinc-400">
                {listFilter === 'related' ? '与我相关' : '全部场景'} · {bundles.length}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
              {bundles.length === 0 ? (
                <p className="px-2 py-8 text-center text-[11px] text-zinc-400">
                  暂无匹配场景，试试顶部筛选「全部场景」
                </p>
              ) : (
                bundles.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition',
                      selectedId === b.id
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                        selectedId === b.id ? 'bg-white/15' : 'bg-zinc-100',
                      )}
                    >
                      <i className={`fa-solid ${b.icon} text-[10px]`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span className="truncate text-[12px] font-semibold">{b.label}</span>
                        <span
                          className={cn(
                            'shrink-0 text-[9px]',
                            selectedId === b.id ? 'text-white/60' : 'text-zinc-400',
                          )}
                        >
                          {b.completeness}/4
                        </span>
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 block truncate text-[10px]',
                          selectedId === b.id ? 'text-white/55' : 'text-zinc-400',
                        )}
                      >
                        {b.desc}
                      </span>
                      <span
                        className={cn(
                          'mt-1 flex flex-wrap gap-1.5 text-[9px]',
                          selectedId === b.id ? 'text-white/50' : 'text-zinc-400',
                        )}
                      >
                        <span>专家 {b.agents.length}</span>
                        <span>工具 {b.tools.length}</span>
                        <span>案例 {b.cases.length}</span>
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-[#fafafa]/80 p-3 md:p-4">
            {selected ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
                        <i className={`fa-solid ${selected.icon} text-[13px]`} />
                      </span>
                      <div>
                        <h2 className="text-[16px] font-semibold text-zinc-900">{selected.label}</h2>
                        <p className="text-[12px] text-zinc-500">{selected.desc}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-400">
                      能力齐套 {selected.completeness}/4
                      {selected.related ? ' · 与你相关' : ''}
                      {selectedDemoPlan?.mode === 'team'
                        ? ` · 多步接力 ${selectedDemoPlan.steps.length} 步`
                        : selectedDemoPlan
                          ? ' · 可一键打样'
                          : ''}
                      {selected.matchTags.length
                        ? ` · ${selected.matchTags.map((t) => `#${t}`).join(' ')}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadScenarioPack(selected)}
                      className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
                    >
                      <i className="fa-solid fa-download mr-1 text-[10px]" />
                      一键下载案例包
                    </button>
                    {canExecuteChat() && selectedDemoPlan ? (
                      <button
                        type="button"
                        onClick={() => startScenario(selected)}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
                        title={
                          selectedDemoPlan.mode === 'team'
                            ? '按场景步骤在任务中接力打样（无需进入专家库）'
                            : '用本场景主能力直接开任务打样'
                        }
                      >
                        {selectedDemoPlan.mode === 'team'
                          ? '一键打样 · 多步接力'
                          : '一键打样'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[12px] font-semibold text-claw-600">样板间叙事 · 案例与培训</h3>
                    <span className="text-[10px] text-zinc-400">
                      {narrativeCards.length}/{selected.cases.length}
                    </span>
                  </div>
                  {selected.cases.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-6 text-center text-[11px] text-zinc-400">
                      待建设 · 可从门户运营上架案例 / 洞察 / 培训
                    </p>
                  ) : (
                    <>
                      {narrativeKindOptions.length > 1 ? (
                        <div className="mb-2 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setNarrativeKind('all')}
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition',
                              narrativeKind === 'all'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                            )}
                          >
                            全部
                          </button>
                          {narrativeKindOptions.map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setNarrativeKind(k)}
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition',
                                narrativeKind === k
                                  ? 'bg-zinc-900 text-white'
                                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                              )}
                            >
                              {k === 'case'
                                ? '场景案例'
                                : k === 'training'
                                  ? '培训'
                                  : '前沿洞察'}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {narrativeCards.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[11px] text-zinc-400">
                          当前类型暂无内容
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {narrativeCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => setNarrativeCard(card)}
                              className="rounded-lg border border-zinc-100 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-white">
                                  <i className={`fa-solid ${card.icon} text-[9px]`} />
                                </span>
                                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                                  {card.kindLabel}
                                </span>
                                {card.action.type === 'case' &&
                                getPortalItemById(card.action.caseId)?.isGold ? (
                                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                                    金
                                  </span>
                                ) : null}
                              </div>
                              <p className="truncate text-[12px] font-semibold text-zinc-900">{card.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">{card.desc}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>

                <section className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
                  <button
                    type="button"
                    onClick={() => setCapsOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-zinc-50"
                  >
                    <span className="text-[12px] font-semibold text-zinc-800">
                      能力组合
                      <span className="ml-2 text-[11px] font-normal text-zinc-400">
                        齐套 {selected.completeness}/4 · Agent / Tool / 知识
                      </span>
                    </span>
                    <i
                      className={cn(
                        'fa-solid text-[10px] text-zinc-400',
                        capsOpen ? 'fa-chevron-up' : 'fa-chevron-down',
                      )}
                    />
                  </button>
                  {capsOpen ? (
                    <div className="grid grid-cols-1 gap-3 border-t border-zinc-100 p-3 sm:grid-cols-3">
                      <Quadrant
                        title="专家（本场景挂载）"
                        emptyHint="待建设 · 可挂载业务专家"
                        cards={selected.agents}
                        onCard={handleCapabilityCard}
                      />
                      <Quadrant
                        title="技能 / 工具"
                        emptyHint="待建设 · 可挂载工具或 Skill"
                        cards={selected.tools}
                        onCard={handleCapabilityCard}
                      />
                      <Quadrant
                        title="相关知识"
                        emptyHint="待建设 · 可关联知识库文档"
                        cards={selected.knowledge}
                        onCard={handleCapabilityCard}
                      />
                    </div>
                  ) : null}
                </section>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center text-[12px] text-zinc-500">
                请从左侧选择一个业务场景
              </div>
            )}
          </main>
        </div>
      </div>

      <ExpertTeamModal
        plan={teamPlan}
        onClose={() => setTeamPlan(null)}
        onStartTeam={(fromIndex = 0) => {
          if (!teamPlan) return;
          onStartExpertTeam(teamPlan, fromIndex);
          setTeamPlan(null);
        }}
        onInvokeStep={(step) => {
          if (!teamPlan) return;
          const idx = teamPlan.steps.findIndex(
            (s) => s.agentId === step.agentId && s.skillId === step.skillId,
          );
          invokePipelineStep(teamPlan, step, idx >= 0 ? idx : 0);
          setTeamPlan(null);
        }}
      />

      <CenterModal
        open={!!narrativeCard}
        title={narrativeCard?.title ?? '案例成效'}
        onClose={() => setNarrativeCard(null)}
        size="lg"
        actions={
          <button
            type="button"
            onClick={() => setNarrativeCard(null)}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
          >
            关闭
          </button>
        }
      >
        {narrativeCard && narrativeOutcome ? (
          <CaseOutcomePanel
            card={narrativeOutcome}
            skillLabel={narrativeSkill?.name}
            agentLabel={narrativeAgent?.name}
            onDemoCase={
              narrativeSkill || narrativeAgent
                ? () => {
                    if (narrativeSkill) {
                      onInvokeSkill(narrativeSkill);
                      showToast(`已按案例打样：${narrativeSkill.name}`);
                    } else if (narrativeAgent) {
                      onInvokeAgent(narrativeAgent);
                      showToast(`已按案例打样：${narrativeAgent.name}`);
                    }
                    setNarrativeCard(null);
                  }
                : undefined
            }
            onEdit={
              canEditCase
                ? () => {
                    const id =
                      narrativeCard.action.type === 'case'
                        ? narrativeCard.action.caseId
                        : narrativeOutcome.id;
                    setEditorTarget(id);
                  }
                : undefined
            }
            onDownload={() => {
              const item =
                narrativeCard.action.type === 'case'
                  ? getPortalItemById(narrativeCard.action.caseId)
                  : getPortalItemById(narrativeOutcome.id);
              if (!item) {
                showToast('未找到可下载的案例内容');
                return;
              }
              downloadCaseFile(item);
              showToast('已下载案例包（.case.zip）');
            }}
          />
        ) : null}
      </CenterModal>

      <CaseEditorModal
        target={editorTarget}
        onClose={() => setEditorTarget(null)}
        onSaved={(item) => {
          // 若正在看该案例，刷新成效卡标题对应的 portal 数据即可（store 已更新）
          if (
            narrativeCard?.action.type === 'case' &&
            narrativeCard.action.caseId === item.id
          ) {
            setNarrativeCard({
              ...narrativeCard,
              title: item.title,
              desc: item.desc,
              icon: item.icon,
              publisher: item.publisher,
              publishedAt: item.publishedAt,
            });
          }
        }}
      />
    </div>
  );
}
