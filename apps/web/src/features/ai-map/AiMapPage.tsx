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
import { ScenarioShowcasePanel } from '@/components/content/ScenarioShowcasePanel';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { downloadScenarioUnifiedPack } from '@/domain/caseExport';
import {
  filterCardsByShowcaseTab,
  showcaseTabOf,
  SHOWCASE_TABS,
  type ShowcaseTabId,
} from '@/domain/scenarioShowcase';
import { isSystemAdmin } from '@/domain/currentUser';
import { getPortalItemById, resolveScenarioCaseItems } from '@/domain/portalCase';
import {
  resolvePipelineStepTargets,
  resolveScenarioDemoPlan,
  type ScenarioDemoPlan,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import { buildSkillDemoPrompt } from '@/domain/skillRuntime';
import { buildAgentDemoPrompt } from '@/domain/agents/runtime';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import type { DeptFilter, EfficiencyFilter, RegionFilter } from '@/domain/assetFilters';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { returnFromResource } from '@/domain/openResourceNav';
import { canExecuteChat } from '@/domain/permissions';
import { allowsTaskExecutionSurfaces } from '@/domain/marketRunCapability';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { ExpertTeamModal } from '@/components/content/ExpertTeamModal';
import {
  countScenarioEnvSlots,
  SCENARIO_JOURNEY_COPY,
  type ScenarioEnv,
} from '@/domain/scenarioEnv';
import { ARCHITECTURE_DOC_KIND_LABELS } from '@/domain/scenarioArchitecture';
import {
  ScenarioLayerInspectBody,
  inspectTitle,
  type ScenarioLayerInspectTarget,
  type ToolkitEnvSlotId,
} from '@/components/content/ScenarioLayerInspectBody';

interface AiMapPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
  /** 专家团同会话顺序接力 */
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}

function LayerBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-400',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-zinc-300',
        )}
      />
      {label}
    </span>
  );
}

function Quadrant({
  title,
  emptyHint,
  cards,
  onCard,
  hint,
}: {
  title: string;
  emptyHint: string;
  cards: PortalMapCard[];
  onCard: (card: PortalMapCard) => void;
  hint?: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[12px] font-semibold text-claw-600">{title}</h3>
          {hint ? <p className="mt-0.5 text-[10px] text-zinc-400">{hint}</p> : null}
        </div>
        <span className="shrink-0 text-[10px] text-zinc-400">{cards.length}</span>
      </div>
      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-5 text-center text-[11px] text-zinc-400">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {cards.slice(0, 6).map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onCard(card)}
                className="flex w-full items-start gap-2 rounded-lg bg-white px-2 py-1.5 text-left transition hover:bg-zinc-50"
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

function ToolkitEnvPanel({
  env,
  onInspectSlot,
}: {
  env: ScenarioEnv | null;
  onInspectSlot: (slot: ToolkitEnvSlotId) => void;
}) {
  const slots = countScenarioEnvSlots(env);
  const models = [...(env?.cloudModels ?? []), ...(env?.localModels ?? [])];

  const cardClass = (filled: boolean) =>
    cn(
      'w-full rounded-lg border px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50/80',
      filled
        ? 'border-zinc-200 bg-white'
        : 'border-dashed border-zinc-200 bg-zinc-50/60',
    );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button type="button" onClick={() => onInspectSlot('hardware')} className={cardClass(slots.hardware)}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
            <i className="fa-solid fa-laptop text-[11px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-zinc-800">硬件设备</p>
            <p className="text-[10px] text-zinc-400">{SCENARIO_JOURNEY_COPY.slotHardware}</p>
          </div>
        </div>
        {slots.hardware ? (
          <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-zinc-600">{env!.hardware}</p>
        ) : (
          <p className="mt-2 text-[10px] text-zinc-400">清单待补充</p>
        )}
      </button>

      <button type="button" onClick={() => onInspectSlot('coding')} className={cardClass(slots.coding)}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
            <i className="fa-solid fa-code text-[11px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-zinc-800">AI Coding 工具</p>
            <p className="text-[10px] text-zinc-400">{SCENARIO_JOURNEY_COPY.slotClickHint}</p>
          </div>
        </div>
        {slots.coding ? (
          <p className="mt-2 line-clamp-3 text-[11px] text-zinc-600">
            {env!.codingTools!.map((t) => t.name).join(' · ')}
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-zinc-400">清单待补充</p>
        )}
      </button>

      <button type="button" onClick={() => onInspectSlot('models')} className={cardClass(slots.models)}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
            <i className="fa-solid fa-microchip text-[11px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-zinc-800">云端 / 本地大模型</p>
            <p className="text-[10px] text-zinc-400">{SCENARIO_JOURNEY_COPY.slotClickHint}</p>
          </div>
        </div>
        {slots.models ? (
          <p className="mt-2 line-clamp-3 text-[11px] text-zinc-600">
            {models.map((m) => m.name).join(' · ')}
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-zinc-400">清单待补充</p>
        )}
      </button>
    </div>
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
  onStartExpertTeam,
}: AiMapPageProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const user = useSessionStore((s) => s.user);
  const navPreset = useNavPresentationStore((s) => s.preset);
  const canRunOnline =
    canExecuteChat(user?.platformRole) && allowsTaskExecutionSurfaces(navPreset);

  const [listFilter, setListFilter] = useState<ScenarioListFilter>('related');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [narrativeCard, setNarrativeCard] = useState<PortalMapCard | null>(null);
  const [narrativeKind, setNarrativeKind] = useState<'all' | ShowcaseTabId>('all');
  const [teamPlan, setTeamPlan] = useState<ScenarioDemoPlan | null>(null);
  const [inspectTarget, setInspectTarget] = useState<ScenarioLayerInspectTarget | null>(null);
  const isAdmin = isSystemAdmin(user?.platformRole);

  const openPortalEdit = (id: string) => {
    useNavigationIntentStore.getState().focusPortalEdit(id);
    setAppView('portal-ops');
  };
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
      setNarrativeKind(showcaseTabOf(card.kind));
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
    return filterCardsByShowcaseTab(selected.cases, narrativeKind);
  }, [selected, narrativeKind]);

  /** 固定顺序：前沿洞察 → 场景案例 → 培训课件 */
  const narrativeKindOptions = SHOWCASE_TABS.map((t) => t.id);

  /** 方案 A：层内点击一律只读详情，执行/下载走顶栏 */
  const openCapabilityInspect = (card: PortalMapCard) => {
    setInspectTarget({
      kind: 'capability',
      card,
      layerLabel: SCENARIO_JOURNEY_COPY.runBadge,
    });
  };

  const openToolkitToolInspect = (card: PortalMapCard) => {
    setInspectTarget({ kind: 'toolkit-tool', card });
  };

  const openToolkitEnvInspect = (slot: ToolkitEnvSlotId) => {
    if (!selected) return;
    setInspectTarget({ kind: 'toolkit-env', slot, env: selected.env });
  };

  const openUrlKnow = (url: string, label: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`已打开了解：${label}`);
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
    // 样板间保留专家团确认弹层；货架执行走 onStartExpertTeam 直达
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

  const downloadLearnPack = (bundle: ScenarioBundle) => {
    const items = resolveScenarioCaseItems(bundle);
    const caseItems = items.filter((i) => i.type === 'case');
    const hasAnything =
      items.length > 0 ||
      bundle.layers.toolkit ||
      bundle.agents.length +
        bundle.skills.length +
        bundle.tools.length +
        bundle.architectureDocs.length >
        0;
    if (!hasAnything) {
      showToast('该场景暂无可下载内容');
      return;
    }
    downloadScenarioUnifiedPack({
      scenarioId: bundle.id,
      scenarioLabel: bundle.label,
      learnItems: items,
      env: bundle.env,
      agents: bundle.agents,
      skills: bundle.skills,
      tools: bundle.tools,
      architectureDocs: bundle.architectureDocs,
      caseItems,
    });
    const bump = useContentEngagementStore.getState().bumpDownload;
    items.forEach((i) => bump(i.id));
    showToast('已下载学习包（含准备与打样参照）');
  };

  const narrativeItems = useMemo(
    () => (selected ? resolveScenarioCaseItems(selected) : []),
    [selected, portalContent],
  );

  return (
    <div className="center-surface center-page scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <CenterPageHeader
          title="场景案例"
          subtitle={SCENARIO_JOURNEY_COPY.pageSubtitle}
          tip={
            isAdmin ? (
              <>
                前端预览：学习层展示门户运营上架的前沿洞察 / 场景案例 / 培训课件。新建、编辑、上下架请到
                <strong className="font-semibold">系统设置 · 门户运营</strong>。
              </>
            ) : (
              <>{SCENARIO_JOURNEY_COPY.pageTip}</>
            )
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
                  useNavigationIntentStore.getState().clearReturnTarget();
                  setAppView('home');
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                返回找案例
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAppView('portal-ops')}
                  className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
                >
                  门户运营
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
                          {b.completeness}/3
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
                          'mt-1 flex flex-wrap gap-1 text-[9px]',
                          selectedId === b.id ? 'text-white/55' : 'text-zinc-400',
                        )}
                      >
                        <span>{b.layers.thought ? '学习' : '·'}</span>
                        <span>{b.layers.toolkit ? '准备' : '·'}</span>
                        <span>{b.layers.capability ? '开干' : '·'}</span>
                        <span className="opacity-70">· 案 {b.cases.length}</span>
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
                    <p className="mt-2 text-[11px] font-medium tracking-wide text-zinc-500">
                      {SCENARIO_JOURNEY_COPY.flow}
                      <span className="ml-1.5 font-normal text-zinc-400">
                        先学习方法 → 备齐条件 → 顶栏开干
                      </span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <LayerBadge
                        active={selected.layers.thought}
                        label={SCENARIO_JOURNEY_COPY.learnBadge}
                      />
                      <LayerBadge
                        active={selected.layers.toolkit}
                        label={SCENARIO_JOURNEY_COPY.layerBadge}
                      />
                      <LayerBadge
                        active={selected.layers.capability}
                        label={SCENARIO_JOURNEY_COPY.runBadge}
                      />
                      <span className="text-[11px] text-zinc-400">
                        齐套 {selected.completeness}/3
                        {selected.related ? ' · 与你相关' : ''}
                        {canRunOnline
                          ? selectedDemoPlan
                            ? ' · 可一键打样'
                            : ' · 暂不可打样'
                          : ' · MVP 请下载学习'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadLearnPack(selected)}
                      disabled={
                        !selected.layers.thought &&
                        !selected.layers.toolkit &&
                        !selected.layers.capability
                      }
                      className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                      title={SCENARIO_JOURNEY_COPY.learnPackTitle}
                    >
                      <i className="fa-solid fa-download mr-1 text-[10px]" />
                      下载学习
                    </button>
                    {canRunOnline ? (
                      <button
                        type="button"
                        onClick={() => startScenario(selected)}
                        disabled={!selectedDemoPlan}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          selectedDemoPlan
                            ? '在线开任务跑模型打样（专家团场景自动接力）'
                            : '开干层暂无可用 Agent / Skill'
                        }
                      >
                        一键打样
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* ① 学习 */}
                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[12px] font-semibold text-zinc-900">
                        {SCENARIO_JOURNEY_COPY.learnSectionTitle}
                        <span className="ml-2 text-[11px] font-normal text-zinc-400">
                          {SCENARIO_JOURNEY_COPY.learnSectionHint}
                        </span>
                      </h3>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {narrativeCards.length}/{selected.cases.length}
                    </span>
                  </div>
                  {selected.cases.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-6 text-center text-[11px] text-zinc-400">
                      待建设 · 可从上架前沿洞察、场景案例或培训课件
                    </p>
                  ) : (
                    <>
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
                            {SHOWCASE_TABS.find((t) => t.id === k)?.label ?? k}
                          </button>
                        ))}
                      </div>
                      {narrativeCards.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[11px] text-zinc-400">
                          当前类型暂无内容
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {narrativeCards.map((card) => {
                            const editId =
                              card.action.type === 'case' ? card.action.caseId : null;
                            return (
                              <div
                                key={card.id}
                                className="group relative rounded-lg border border-zinc-100 transition hover:border-zinc-300 hover:bg-zinc-50"
                              >
                                <button
                                  type="button"
                                  onClick={() => setNarrativeCard(card)}
                                  className="w-full px-3 py-2.5 text-left"
                                >
                                  <div className="mb-1 flex items-center gap-2 pr-14">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-white">
                                      <i className={`fa-solid ${card.icon} text-[9px]`} />
                                    </span>
                                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                                      {card.kindLabel}
                                    </span>
                                    {editId && getPortalItemById(editId)?.isGold ? (
                                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                                        金
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="truncate text-[12px] font-semibold text-zinc-900">
                                    {card.title}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">
                                    {card.desc}
                                  </p>
                                </button>
                                {isAdmin && editId ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPortalEdit(editId);
                                    }}
                                    className="absolute right-2 top-2 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 opacity-100 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 sm:opacity-0 sm:group-hover:opacity-100"
                                    title="在门户运营中编辑"
                                  >
                                    <i className="fa-solid fa-pen mr-1 text-[9px]" />
                                    去配置
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {selected.knowledge.length > 0 ? (
                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <p className="mb-1.5 text-[11px] font-medium text-zinc-500">延伸知识</p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {selected.knowledge.slice(0, 4).map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() =>
                              setInspectTarget({
                                kind: 'capability',
                                card,
                                layerLabel: SCENARIO_JOURNEY_COPY.learnExtendLabel,
                              })
                            }
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-zinc-700 transition hover:bg-zinc-50"
                          >
                            <i className={`fa-solid ${card.icon} w-4 text-[10px] text-zinc-400`} />
                            <span className="truncate">{card.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                {/* ② 准备 */}
                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2">
                    <h3 className="text-[12px] font-semibold text-zinc-900">
                      {SCENARIO_JOURNEY_COPY.sectionTitle}
                      <span className="ml-2 text-[11px] font-normal text-zinc-400">
                        {SCENARIO_JOURNEY_COPY.sectionHint}
                      </span>
                    </h3>
                  </div>
                  <ToolkitEnvPanel
                    env={selected.env}
                    onInspectSlot={openToolkitEnvInspect}
                  />
                  <p className="mt-2 text-[10px] text-zinc-400">
                    {SCENARIO_JOURNEY_COPY.panelFooter}
                  </p>
                  {selected.envTools.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                        {SCENARIO_JOURNEY_COPY.envToolsCaption}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {selected.envTools.slice(0, 6).map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => openToolkitToolInspect(card)}
                            className="flex items-start gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                          >
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-white">
                              <i className={`fa-solid ${card.icon} text-[9px]`} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[12px] font-medium text-zinc-900">
                                {card.title}
                              </span>
                              <span className="block truncate text-[10px] text-zinc-400">
                                {card.kindLabel} · 查看详情
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                {/* ③ 开干 */}
                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2">
                    <h3 className="text-[12px] font-semibold text-zinc-900">
                      {SCENARIO_JOURNEY_COPY.runSectionTitle}
                      <span className="ml-2 text-[11px] font-normal text-zinc-400">
                        {SCENARIO_JOURNEY_COPY.runSectionHint}
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Quadrant
                      title="Agent"
                      hint="点击查看 · 不执行"
                      emptyHint="待挂载业务专家"
                      cards={selected.agents}
                      onCard={openCapabilityInspect}
                    />
                    <Quadrant
                      title="Skill"
                      hint="点击查看 · 不执行"
                      emptyHint="待挂载技能"
                      cards={selected.skills}
                      onCard={openCapabilityInspect}
                    />
                    <Quadrant
                      title="Tool"
                      hint="点击查看 · 不执行"
                      emptyHint="待挂载连接器"
                      cards={selected.tools}
                      onCard={openCapabilityInspect}
                    />
                  </div>
                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-zinc-500">
                        架构文件.md
                        <span className="ml-1 font-normal text-zinc-400">
                          点击查看 · 只读
                        </span>
                      </p>
                      <span className="text-[10px] text-zinc-400">
                        {selected.architectureDocs.length}
                      </span>
                    </div>
                    {selected.architectureDocs.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[11px] text-zinc-400">
                        待补充架构设计与执行方案
                      </p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {selected.architectureDocs.map((d) => (
                          <li key={d.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setInspectTarget({ kind: 'architecture', doc: d })
                              }
                              className="flex w-full items-start gap-2 rounded-lg border border-zinc-100 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-white">
                                <i className="fa-solid fa-file-lines text-[9px]" />
                              </span>
                              <span className="min-w-0">
                                <span className="mb-0.5 inline-block rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                                  {ARCHITECTURE_DOC_KIND_LABELS[d.kind]}
                                </span>
                                <span className="block truncate text-[12px] font-medium text-zinc-900">
                                  {d.title}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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

      <CenterModal
        open={!!inspectTarget}
        title={inspectTarget ? inspectTitle(inspectTarget) : '详情'}
        onClose={() => setInspectTarget(null)}
        size="lg"
        actions={
          <button
            type="button"
            onClick={() => setInspectTarget(null)}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
          >
            关闭
          </button>
        }
      >
        {inspectTarget ? (
          <ScenarioLayerInspectBody target={inspectTarget} onOpenUrl={openUrlKnow} />
        ) : null}
      </CenterModal>

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
        open={!!narrativeCard && !!selected}
        title={selected ? `${selected.label} · 案例预览` : '案例预览'}
        onClose={() => setNarrativeCard(null)}
        size="lg"
        actions={
          <>
            {selected ? (
              <button
                type="button"
                onClick={() => downloadLearnPack(selected)}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
              >
                <i className="fa-solid fa-download mr-1 text-[10px]" />
                下载学习
              </button>
            ) : null}
            {selected && canRunOnline ? (
              <button
                type="button"
                onClick={() => {
                  startScenario(selected);
                  setNarrativeCard(null);
                }}
                disabled={!selectedDemoPlan}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                一键打样
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setNarrativeCard(null)}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
            >
              关闭
            </button>
          </>
        }
      >
        {narrativeCard && selected ? (
          <ScenarioShowcasePanel
            scenarioLabel={selected.label}
            items={narrativeItems}
            bundle={selected}
            initialTab={showcaseTabOf(narrativeCard.kind)}
            initialItemId={
              narrativeCard.action.type === 'case'
                ? narrativeCard.action.caseId
                : narrativeCard.id
            }
            onEditItem={isAdmin ? openPortalEdit : undefined}
          />
        ) : null}
      </CenterModal>
    </div>
  );
}
