import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed, PrototypeToolSeed } from '@/domain/prototype/types';
import {
  FEATURED_SCENARIOS,
  filterAiMapCards,
  type PortalMapCard,
} from '@/domain/portalMap';
import { openPortalCard } from '@/domain/portalNavigation';
import {
  AI_TOOL_NAV_CATEGORIES,
  AI_TOOL_SCOPE_OPTIONS,
  isHomeAiTool,
  toolBelongsToNavCategory,
  toolBelongsToScope,
  type AiToolNavCategoryId,
  type AiToolScopeId,
} from '@/domain/aiToolCategories';
import {
  DISCOVER_SCENARIO_IDS,
  SCENARIO_CAPABILITY_CATEGORIES,
  SCENARIO_PUBLISHED_AT,
  scenarioBelongsToCapability,
  type DiscoverScenarioId,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import {
  RANK_MODE_OPTIONS,
  heatScore,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { EngagementActions } from '@/components/content/EngagementActions';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import {
  ensureEngagementSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';

interface HomeScenePortalProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

/** 标题 + 同行筛选 + 右侧操作，压缩行高 */
function SectionToolbar({
  title,
  filters,
  trailing,
}: {
  title: string;
  filters?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2.5">
      <h2 className="shrink-0 text-[14px] font-semibold tracking-tight text-zinc-900">{title}</h2>
      {filters ? <div className="min-w-0 flex-1 overflow-hidden">{filters}</div> : null}
      {trailing ? <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

/** 统一筛选轨：浅底 + 白底选中 */
function FilterTrack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-zinc-100/90 p-1 scroll-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
        active
          ? 'bg-white text-zinc-900 shadow-sm'
          : 'text-zinc-500 hover:text-zinc-800',
      )}
    >
      {children}
    </button>
  );
}

/** 紧凑下拉：三处筛选统一固定宽度 */
function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="relative w-[92px] shrink-0">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-full border border-zinc-200/90 bg-white py-1.5 pl-2.5 pr-6 text-[11px] font-medium text-zinc-700 outline-none transition hover:border-zinc-300 focus:border-zinc-400"
      >
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <i className="fa-solid fa-chevron-down pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-400" />
    </div>
  );
}

function ToolIconRow({
  tools,
  onOpen,
}: {
  tools: PrototypeToolSeed[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-[76px] items-center gap-2 overflow-x-auto px-1 scroll-hidden">
      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.desc}
          onClick={() => onOpen(t.id)}
          className="flex w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 transition hover:bg-zinc-100/90"
        >
          <ToolLogo name={t.name} logoUrl={t.logoUrl} icon={t.icon} size={32} />
          <span className="w-full truncate text-center text-[11px] font-semibold text-zinc-800">
            {t.name}
          </span>
        </button>
      ))}
      {!tools.length ? (
        <p className="px-3 py-4 text-[12px] text-zinc-400">该分类暂无推荐工具</p>
      ) : null}
    </div>
  );
}

type OpsTab = 'news' | 'training';

export function HomeScenePortal({ onInvokeAgent, onInvokeSkill }: HomeScenePortalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const user = useSessionStore((s) => s.user);

  const [rankMode, setRankMode] = useState<RankMode>('trending');
  const [opsRankMode, setOpsRankMode] = useState<RankMode>('trending');
  const [capability, setCapability] = useState<ScenarioCapabilityId | 'all'>('all');
  const [toolCat, setToolCat] = useState<AiToolNavCategoryId>('chat');
  const [toolScope, setToolScope] = useState<AiToolScopeId>('external');
  const [opsTab, setOpsTab] = useState<OpsTab>('news');
  const focusPortalType = useNavigationIntentStore((s) => s.focusPortalType);
  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const homeAiTools = useMemo(() => tools.filter(isHomeAiTool), [tools]);

  const toolsInCategory = useMemo(
    () =>
      homeAiTools.filter(
        (t) => toolBelongsToScope(t, toolScope) && toolBelongsToNavCategory(t, toolCat),
      ),
    [homeAiTools, toolCat, toolScope],
  );

  const discoverScenarios = useMemo(
    () =>
      FEATURED_SCENARIOS.filter((s) =>
        (DISCOVER_SCENARIO_IDS as readonly string[]).includes(s.id),
      ),
    [],
  );

  const rankedScenarios = useMemo(() => {
    const filtered = discoverScenarios.filter((s) =>
      scenarioBelongsToCapability(s.id, capability),
    );
    return sortByRankMode(
      filtered.map((s) => ({
        ...s,
        publishedAt: SCENARIO_PUBLISHED_AT[s.id as DiscoverScenarioId],
      })),
      rankMode,
      engagementOf,
    );
  }, [discoverScenarios, capability, rankMode, engagementOf, engagementById]);

  /** 当前能力筛下按热度的 Top3，用于火标 */
  const hotTop3Ids = useMemo(() => {
    const filtered = discoverScenarios.filter((s) =>
      scenarioBelongsToCapability(s.id, capability),
    );
    return [...filtered]
      .sort((a, b) => heatScore(engagementOf(b.id)) - heatScore(engagementOf(a.id)))
      .slice(0, 3)
      .map((s) => s.id);
  }, [discoverScenarios, capability, engagementOf, engagementById]);

  const catalog = useMemo(
    () =>
      filterAiMapCards({
        agents,
        skills,
        tools,
        portalContent,
        affiliation,
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        selection: { kind: 'all' },
        search: '',
      }),
    [agents, skills, tools, portalContent, affiliation, user],
  );

  useEffect(() => {
    const ids = [
      ...DISCOVER_SCENARIO_IDS,
      ...catalog.filter((c) => c.kind === 'news' || c.kind === 'training').map((c) => c.id),
      ...portalContent.filter((p) => p.type === 'news' || p.type === 'training').map((p) => p.id),
    ];
    ensureEngagementSeeds(ids);
  }, [catalog, portalContent]);

  const opsPools = useMemo(() => {
    const news = catalog.filter((c) => c.kind === 'news');
    const training = catalog.filter((c) => c.kind === 'training');
    const sort = (list: PortalMapCard[]) =>
      sortByRankMode(
        list.map((c) => ({ ...c, publishedAt: c.publishedAt })),
        opsRankMode,
        engagementOf,
      );
    return {
      news: sort(news).slice(0, 3),
      training: sort(training).slice(0, 3),
    };
  }, [catalog, opsRankMode, engagementOf, engagementById]);

  const opsCards = opsPools[opsTab];

  const handleCard = (card: PortalMapCard) => {
    bumpUse(card.id);
    openPortalCard(card, { onInvokeAgent, onInvokeSkill, showToast });
  };

  const openTool = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool?.homepageUrl) {
      showToast('暂无入口链接');
      return;
    }
    const win = window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
    useMarketplaceStore.getState().bumpToolInvokes(toolId);
    if (!win) {
      showToast('浏览器拦截了弹窗，请允许本站弹窗后重试，或复制链接手动打开');
      return;
    }
    showToast(`已打开：${tool.name}`);
  };

  const goOpsMore = () => {
    focusPortalType(opsTab);
    setAppView('portal-ops');
  };

  const openScenario = (scenarioId: string) => {
    bumpUse(scenarioId);
    focusScenario(scenarioId);
    setAppView('ai-map');
  };

  const linkBtnClass =
    'text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1.35rem] pb-2">
      {/* 1. 马上能用：标题 | 能力筛选 …… 外部/内部 | 更多→工具 */}
      <section>
        <SectionToolbar
          title="马上能用"
          filters={
            <FilterTrack>
              {AI_TOOL_NAV_CATEGORIES.map((c) => (
                <FilterChip key={c.id} active={toolCat === c.id} onClick={() => setToolCat(c.id)}>
                  <i className={cn('fa-solid text-[9px]', c.icon)} />
                  {c.label}
                </FilterChip>
              ))}
            </FilterTrack>
          }
          trailing={
            <>
              <MiniSelect
                ariaLabel="工具来源"
                value={toolScope}
                onChange={setToolScope}
                options={[...AI_TOOL_SCOPE_OPTIONS]}
              />
              <button type="button" onClick={() => setAppView('tools')} className={linkBtnClass}>
                更多
              </button>
            </>
          }
        />
        <div className="min-h-[92px] rounded-2xl border border-zinc-200/70 bg-white/80 px-2 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <ToolIconRow tools={toolsInCategory} onOpen={openTool} />
        </div>
      </section>

      {/* 2. 场景案例：标题 | 能力筛选 …… 排行下拉 | 更多 · 最多两排 */}
      <section>
        <SectionToolbar
          title="场景案例"
          filters={
            <FilterTrack>
              <FilterChip active={capability === 'all'} onClick={() => setCapability('all')}>
                全部
              </FilterChip>
              {SCENARIO_CAPABILITY_CATEGORIES.map((c) => (
                <FilterChip
                  key={c.id}
                  active={capability === c.id}
                  onClick={() => setCapability(c.id)}
                  title={c.blurb}
                >
                  <i className={cn('fa-solid text-[9px]', c.icon)} />
                  {c.label}
                </FilterChip>
              ))}
            </FilterTrack>
          }
          trailing={
            <>
              <MiniSelect
                ariaLabel="排序方式"
                value={rankMode}
                onChange={setRankMode}
                options={[...RANK_MODE_OPTIONS]}
              />
              <button type="button" onClick={() => setAppView('ai-map')} className={linkBtnClass}>
                更多
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rankedScenarios.slice(0, 6).map((s) => (
            <div
              key={s.id}
              className="relative flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50/60"
            >
              {hotTop3Ids.includes(s.id) ? (
                <span
                  className="pointer-events-none absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center text-[#E85D04]"
                  title="最火 Top3"
                  aria-label="最火"
                >
                  <i className="fa-solid fa-fire text-[11px]" />
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => openScenario(s.id)}
                className="flex items-start gap-2.5 text-left"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <i className={cn('fa-solid text-[11px]', s.icon)} />
                </span>
                <span className="min-w-0 pr-5">
                  <span className="block truncate text-[12px] font-semibold text-zinc-900">
                    {s.label}
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-[10px] leading-snug text-zinc-400">
                    {s.desc}
                  </span>
                </span>
              </button>
              <EngagementActions
                contentId={s.id}
                compact
                onAfterAction={(action) => {
                  if (action === 'download') showToast('已记录下载');
                  if (action === 'dislike') showToast('已反馈，运营将关注优化');
                }}
              />
            </div>
          ))}
          {!rankedScenarios.length ? (
            <p className="col-span-full py-6 text-center text-[12px] text-zinc-400">
              该能力下暂无场景
            </p>
          ) : null}
        </div>
      </section>

      {/* 3. 本周精选：标题 | 洞察/培训 …… 排序下拉 | 更多 */}
      <section className="border-t border-zinc-100">
        <SectionToolbar
          title="本周精选"
          filters={
            <FilterTrack>
              {(
                [
                  { id: 'news' as const, label: 'AI前沿洞察' },
                  { id: 'training' as const, label: 'AI培训学院' },
                ] as const
              ).map((t) => (
                <FilterChip key={t.id} active={opsTab === t.id} onClick={() => setOpsTab(t.id)}>
                  {t.label}
                </FilterChip>
              ))}
            </FilterTrack>
          }
          trailing={
            <>
              <MiniSelect
                ariaLabel="精选排序"
                value={opsRankMode}
                onChange={setOpsRankMode}
                options={[...RANK_MODE_OPTIONS]}
              />
              <button type="button" onClick={goOpsMore} className={linkBtnClass}>
                更多
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {opsCards.length ? (
            opsCards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCard(c)}
                className="flex items-start gap-2.5 rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-white">
                  <i className={cn('fa-solid text-[10px]', c.icon)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-zinc-800">{c.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400">{c.desc}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="col-span-full py-4 text-center text-[12px] text-zinc-400">暂无精选内容</p>
          )}
        </div>
      </section>
    </div>
  );
}
