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
import {
  downloadScenarioCasePack,
  downloadScenarioDemoPack,
} from '@/domain/caseExport';
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
import { countScenarioEnvSlots, type ScenarioEnv } from '@/domain/scenarioEnv';
import { ARCHITECTURE_DOC_KIND_LABELS } from '@/domain/scenarioArchitecture';
import {
  ScenarioLayerInspectBody,
  inspectTitle,
  type ScenarioLayerInspectTarget,
  type ToolkitEnvSlotId,
  VIEW_ONLY_HINT,
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
            <p className="text-[10px] text-zinc-400">点击查看详情</p>
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
            <p className="text-[10px] text-zinc-400">点击查看详情</p>
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
            <p className="text-[10px] text-zinc-400">点击查看详情</p>
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

  const [listFilter, setListFilter] = useState<ScenarioListFilter>('related');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [narrativeCard, setNarrativeCard] = useState<PortalMapCard | null>(null);
  const [editorTarget, setEditorTarget] = useState<string | 'new' | null>(null);
  const [narrativeKind, setNarrativeKind] = useState<
    'all' | 'playbook' | 'case' | 'training' | 'news'
  >('all');
  const [teamPlan, setTeamPlan] = useState<ScenarioDemoPlan | null>(null);
  const [inspectTarget, setInspectTarget] = useState<ScenarioLayerInspectTarget | null>(null);
  const canEditCase = isSystemAdmin(user?.platformRole);
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
      setNarrativeKind(
        card.kind === 'insight'
          ? 'news'
          : card.kind === 'training'
            ? 'training'
            : card.kind === 'playbook'
              ? 'playbook'
              : card.kind === 'case'
                ? 'case'
                : 'all',
      );
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
    if (!selected?.cases.length) {
      return [] as Array<'playbook' | 'case' | 'training' | 'news'>;
    }
    const kinds = selected.cases.map((c) => (c.kind === 'insight' ? 'news' : c.kind));
    const set = new Set(kinds);
    return (['playbook', 'training', 'news', 'case'] as const).filter((k) => set.has(k));
  }, [selected]);

  /** 方案 A：层内点击一律只读详情，执行/下载走顶栏 */
  const openCapabilityInspect = (card: PortalMapCard) => {
    setInspectTarget({ kind: 'capability', card, layerLabel: '能力层' });
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
    if (!items.length && !bundle.layers.toolkit) {
      showToast('该场景暂无可下载的学习内容');
      return;
    }
    downloadScenarioCasePack(bundle.label, items, bundle.env);
    const bump = useContentEngagementStore.getState().bumpDownload;
    items.forEach((i) => bump(i.id));
    showToast('已下载学习包（.learn.zip）');
  };

  const downloadDemoPack = (bundle: ScenarioBundle) => {
    const all = resolveScenarioCaseItems(bundle);
    const caseItems = all.filter((i) => i.type === 'case');
    const hasCaps =
      bundle.agents.length +
        bundle.skills.length +
        bundle.tools.length +
        bundle.architectureDocs.length +
        caseItems.length >
      0;
    if (!hasCaps) {
      showToast('该场景暂无可下载的打样能力包');
      return;
    }
    downloadScenarioDemoPack({
      scenarioId: bundle.id,
      scenarioLabel: bundle.label,
      agents: bundle.agents,
      skills: bundle.skills,
      tools: bundle.tools,
      architectureDocs: bundle.architectureDocs,
      caseItems,
    });
    showToast('已下载打样包（.demo.zip）');
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
          subtitle="学·学习包 · 配·环境清单 · 跑·打样包 / 一键打样"
          tip={
            <>
              三层齐套灯：思想层下学习包（.learn.zip），工具层看环境，能力层下打样包（.demo.zip）或一键打样；架构
              md 可在能力层在线阅读。
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
                        <span>{b.layers.thought ? '学' : '·'}</span>
                        <span>{b.layers.toolkit ? '配' : '·'}</span>
                        <span>{b.layers.capability ? '跑' : '·'}</span>
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
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <LayerBadge active={selected.layers.thought} label="学 · 思想层" />
                      <LayerBadge active={selected.layers.toolkit} label="配 · 工具层" />
                      <LayerBadge active={selected.layers.capability} label="跑 · 能力层" />
                      <span className="text-[11px] text-zinc-400">
                        齐套 {selected.completeness}/3
                        {selected.related ? ' · 与你相关' : ''}
                        {selectedDemoPlan?.mode === 'team'
                          ? ` · 多步接力 ${selectedDemoPlan.steps.length} 步`
                          : selectedDemoPlan
                            ? ' · 可一键打样'
                            : ' · 暂不可打样'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadLearnPack(selected)}
                      disabled={!selected.layers.thought && !selected.layers.toolkit}
                      className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                      title="学习包：思想层 + 工具层环境（.learn.zip）"
                    >
                      <i className="fa-solid fa-download mr-1 text-[10px]" />
                      下载学习包
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDemoPack(selected)}
                      disabled={!selected.layers.capability}
                      className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                      title="打样包：架构 md + 能力挂载 + 场景案例（.demo.zip）"
                    >
                      <i className="fa-solid fa-box-archive mr-1 text-[10px]" />
                      下载打样包
                    </button>
                    {canExecuteChat() ? (
                      <button
                        type="button"
                        onClick={() => startScenario(selected)}
                        disabled={!selectedDemoPlan}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          selectedDemoPlan?.mode === 'team'
                            ? '按场景步骤在任务中接力打样'
                            : selectedDemoPlan
                              ? '用本场景能力层主能力开任务打样'
                              : '能力层暂无可用 Agent / Skill'
                        }
                      >
                        {selectedDemoPlan?.mode === 'team'
                          ? '一键打样 · 多步接力'
                          : '一键打样'}
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* ① 思想层 · 学 */}
                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[12px] font-semibold text-zinc-900">
                        ① 思想层 · 学
                        <span className="ml-2 text-[11px] font-normal text-zinc-400">
                          点击查看详情 · 下载请用上方「下载学习包」
                        </span>
                      </h3>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {narrativeCards.length}/{selected.cases.length}
                    </span>
                  </div>
                  {selected.cases.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-6 text-center text-[11px] text-zinc-400">
                      待建设 · 可从上架前沿洞察、培训案例或场景方案
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
                              {k === 'playbook'
                                ? '场景方案'
                                : k === 'case'
                                  ? '场景案例'
                                  : k === 'training'
                                    ? '培训案例'
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
                                layerLabel: '思想层 · 延伸知识',
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

                {/* ② 工具层 · 配 */}
                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2">
                    <h3 className="text-[12px] font-semibold text-zinc-900">
                      ② 工具层 · 配
                      <span className="ml-2 text-[11px] font-normal text-zinc-400">
                        硬件 / AI Coding / 大模型 · 仅了解，不调用
                      </span>
                    </h3>
                  </div>
                  <ToolkitEnvPanel
                    env={selected.env}
                    onInspectSlot={openToolkitEnvInspect}
                  />
                  <p className="mt-2 text-[10px] text-zinc-400">
                    点击卡片查看环境详情（只读）。与首页「常用 AI 工具」不同，此处不提供调用。
                  </p>
                  {selected.envTools.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                        本场景相关外部工具（点击查看）
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

                {/* ③ 能力层 · 跑 */}
                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2">
                    <h3 className="text-[12px] font-semibold text-zinc-900">
                      ③ 能力层 · 跑
                      <span className="ml-2 text-[11px] font-normal text-zinc-400">
                        Agent / Skill / Tool / 架构文件 · 打样或下载打样包
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
            viewOnlyHint={VIEW_ONLY_HINT}
            onOpenLink={
              narrativeOutcome.homepageUrl
                ? () => {
                    window.open(narrativeOutcome.homepageUrl, '_blank', 'noopener,noreferrer');
                    showToast('已打开了解');
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
