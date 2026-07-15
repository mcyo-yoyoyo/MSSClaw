import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import {
  buildOrgCoverage,
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
import { DocumentPreviewPanel } from '@/components/center/DocumentPreviewPanel';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { openPortalCard } from '@/domain/portalNavigation';
import type { DeptFilter, EfficiencyFilter, RegionFilter } from '@/domain/assetFilters';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useHomeStore } from '@/stores/homeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

interface AiMapPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
}

type LeftTab = 'scenarios' | 'coverage';

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

export function AiMapPage({ onInvokeAgent, onInvokeSkill, onAskKbDocument }: AiMapPageProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const user = useSessionStore((s) => s.user);

  const [leftTab, setLeftTab] = useState<LeftTab>('scenarios');
  const [listFilter, setListFilter] = useState<ScenarioListFilter>('related');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [narrativeCard, setNarrativeCard] = useState<PortalMapCard | null>(null);
  const [narrativeKind, setNarrativeKind] = useState<'all' | 'case' | 'insight' | 'training' | 'news'>(
    'all',
  );
  const [capsOpen, setCapsOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [efficiencyFilter, setEfficiencyFilter] = useState<EfficiencyFilter>('all');
  const pendingCaseId = useNavigationIntentStore((s) => s.pendingCaseId);
  const consumeCaseId = useNavigationIntentStore((s) => s.consumeCaseId);

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

  const allBundlesForCoverage = useMemo(
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

  const coverage = useMemo(() => buildOrgCoverage(allBundlesForCoverage), [allBundlesForCoverage]);

  useEffect(() => {
    if (!bundles.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !bundles.some((b) => b.id === selectedId)) {
      setSelectedId(bundles[0].id);
    }
  }, [bundles, selectedId]);

  useEffect(() => {
    setNarrativeKind('all');
  }, [selectedId]);

  // 原案例库深链：定位到包含该案例的场景并打开叙事预览
  useEffect(() => {
    if (!pendingCaseId) return;
    const id = consumeCaseId();
    if (!id) return;
    const pool = allBundlesForCoverage.length ? allBundlesForCoverage : bundles;
    const hit = pool.find((b) =>
      b.cases.some((c) => c.action.type === 'case' && c.action.caseId === id),
    );
    if (!hit) {
      showToast(`未在样板间找到案例：${id}`);
      return;
    }
    setListFilter('all');
    setLeftTab('scenarios');
    setSelectedId(hit.id);
    const card = hit.cases.find((c) => c.action.type === 'case' && c.action.caseId === id) ?? null;
    if (card) setNarrativeCard(card);
  }, [pendingCaseId, allBundlesForCoverage, bundles, consumeCaseId, showToast]);

  const selected: ScenarioBundle | null = bundles.find((b) => b.id === selectedId) ?? null;

  const narrativeCards = useMemo(() => {
    if (!selected) return [];
    if (narrativeKind === 'all') return selected.cases;
    return selected.cases.filter((c) => c.kind === narrativeKind);
  }, [selected, narrativeKind]);

  const narrativeKindOptions = useMemo(() => {
    if (!selected?.cases.length) return [] as Array<'case' | 'insight' | 'training' | 'news'>;
    const set = new Set(selected.cases.map((c) => c.kind));
    return (['case', 'insight', 'training', 'news'] as const).filter((k) => set.has(k));
  }, [selected]);

  const handleCard = (card: PortalMapCard) => {
    openPortalCard(card, { onInvokeAgent, onInvokeSkill, onAskKbDocument, showToast });
  };

  const startScenario = (bundle: ScenarioBundle) => {
    const primary = bundle.agents[0] ?? bundle.tools[0];
    if (!primary) {
      showToast('该场景尚无可用 Agent / Tool');
      return;
    }
    handleCard(primary);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <CenterPageHeader
          title="案例"
          subtitle="AI 样板间 · 场景案例与能力组合沉淀"
          tip={
            <>
              左侧选业务场景 → 先看场景叙事与「一键打样」→ 再按需展开能力组合（Agent / Tool / 知识）。首页「场景导航」是橱窗速览，这里是完整资产包。
            </>
          }
          actions={
            <>
              <CenterSearchInput
                value={search}
                onChange={setSearch}
                placeholder="搜索场景名称…"
              />
              <button
                type="button"
                onClick={() => {
                  useHomeStore.getState().setHomeMode('portal');
                  setAppView('home');
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                回场景导航（橱窗）
              </button>
            </>
          }
        />

        <OrgAssetFilterBar
          deptFilter={deptFilter}
          regionFilter={regionFilter}
          efficiencyFilter={efficiencyFilter}
          onDeptChange={setDeptFilter}
          onRegionChange={setRegionFilter}
          onEfficiencyChange={setEfficiencyFilter}
        />

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white md:w-[260px]">
            <div className="flex border-b border-zinc-100 p-1.5">
              {(
                [
                  ['scenarios', '场景'],
                  ['coverage', '组织覆盖'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLeftTab(id)}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition',
                    leftTab === id ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {leftTab === 'scenarios' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex gap-1 border-b border-zinc-100 px-2 py-2">
                  {(
                    [
                      ['related', '与我相关'],
                      ['all', '全部场景'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setListFilter(id)}
                      className={cn(
                        'rounded-md px-2 py-1 text-[10px] font-medium transition',
                        listFilter === id
                          ? 'bg-claw-600/10 text-claw-700'
                          : 'text-zinc-400 hover:text-zinc-700',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
                  {bundles.length === 0 ? (
                    <p className="px-2 py-8 text-center text-[11px] text-zinc-400">
                      暂无匹配场景，试试「全部场景」
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
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-400">机关职能</p>
                  <div className="space-y-1">
                    {coverage
                      .filter((r) => r.axis === 'dept')
                      .map((row) => (
                        <CoverageRow key={row.id} row={row} />
                      ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-400">一线区域</p>
                  <div className="space-y-1">
                    {coverage
                      .filter((r) => r.axis === 'region')
                      .map((row) => (
                        <CoverageRow key={row.id} row={row} />
                      ))}
                  </div>
                </div>
              </div>
            )}
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
                      {selected.matchTags.length
                        ? ` · ${selected.matchTags.map((t) => `#${t}`).join(' ')}`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startScenario(selected)}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
                  >
                    一键打样
                  </button>
                </div>

                <section className="rounded-xl border border-zinc-200/80 bg-white p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[12px] font-semibold text-claw-600">场景叙事 · 案例与培训</h3>
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
                                ? '案例'
                                : k === 'insight'
                                  ? '洞察'
                                  : k === 'training'
                                    ? '培训'
                                    : '资讯'}
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
                        title="推荐 Agent"
                        emptyHint="待建设 · 可挂载业务 Agent"
                        cards={selected.agents}
                        onCard={handleCard}
                      />
                      <Quadrant
                        title="可用 Tool / Skill"
                        emptyHint="待建设 · 可挂载工具或 Skill"
                        cards={selected.tools}
                        onCard={handleCard}
                      />
                      <Quadrant
                        title="相关知识"
                        emptyHint="待建设 · 可关联知识库文档"
                        cards={selected.knowledge}
                        onCard={handleCard}
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

      <CenterModal
        open={!!narrativeCard}
        title={narrativeCard?.title ?? '场景叙事'}
        onClose={() => setNarrativeCard(null)}
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
        {narrativeCard ? (
          <DocumentPreviewPanel
            meta={{
              title: narrativeCard.title,
              typeLabel: narrativeCard.kindLabel,
              author: narrativeCard.publisher,
              updatedAt: narrativeCard.publishedAt,
              pages: 3,
              summary: narrativeCard.desc,
              bodyParagraphs: [
                narrativeCard.desc,
                `本条目属于场景样板间资产，可与 Agent / Tool / 知识组合打样。`,
                `类型：${narrativeCard.kindLabel} · 可见性与组织归属随门户运营配置。`,
              ],
            }}
          />
        ) : null}
      </CenterModal>
    </div>
  );
}

function CoverageRow({
  row,
}: {
  row: ReturnType<typeof buildOrgCoverage>[number];
}) {
  return (
    <div className="rounded-lg border border-zinc-100 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-zinc-800">{row.label}</span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
            row.strength === 'strong' && 'bg-emerald-50 text-emerald-700',
            row.strength === 'partial' && 'bg-amber-50 text-amber-700',
            row.strength === 'empty' && 'bg-zinc-100 text-zinc-400',
          )}
        >
          {row.strength === 'strong' ? '齐套' : row.strength === 'partial' ? '部分' : '空白'}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-zinc-400">
        {row.scenarioCount} 个场景 · {row.assetCount} 项资产
      </p>
      {row.gapLabels.length > 0 ? (
        <p className="mt-1 truncate text-[10px] text-amber-600/90">
          缺口：{row.gapLabels.slice(0, 3).join('、')}
        </p>
      ) : null}
    </div>
  );
}
