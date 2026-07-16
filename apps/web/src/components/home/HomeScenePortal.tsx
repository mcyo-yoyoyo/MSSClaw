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
  isHomeAiTool,
  type AiToolNavCategoryId,
} from '@/domain/aiToolCategories';
import { getPlazaToolPicks } from '@/domain/plazaToolPicks';
import {
  getPlazaToolGuides,
  PLAZA_GUIDE_TYPE_LABEL,
  type PlazaToolGuide,
} from '@/domain/plazaToolGuides';
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
import { isNewScenario } from '@/domain/contentBadges';

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
        active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
      )}
    >
      {children}
    </button>
  );
}

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
  onHowTo,
  emptyText = '暂无推荐',
}: {
  tools: PrototypeToolSeed[];
  onOpen: (id: string) => void;
  onHowTo: (tool: PrototypeToolSeed) => void;
  emptyText?: string;
}) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 overflow-x-auto px-1 scroll-hidden">
      {tools.map((t) => {
        const hasGuide = getPlazaToolGuides(t.id).length > 0;
        return (
          <div key={t.id} className="flex shrink-0 items-center gap-2 px-1 py-1">
            <button
              type="button"
              title={t.desc}
              onClick={() => onOpen(t.id)}
              className="flex w-[64px] flex-col items-center justify-center gap-1.5 rounded-lg py-1 transition hover:bg-zinc-100/70"
            >
              <ToolLogo name={t.name} logoUrl={t.logoUrl} icon={t.icon} size={28} />
              <span className="w-full truncate text-center text-[11px] font-semibold text-zinc-800">
                {t.name}
              </span>
            </button>
            {hasGuide ? (
              <button
                type="button"
                title="试用前有疑问？点此查看 How to 指引"
                onClick={() => onHowTo(t)}
                className="group flex flex-col items-start justify-center gap-0.5 rounded-md px-0.5 py-1 text-left transition"
              >
                <span className="font-serif text-[10px] italic leading-none tracking-wide text-zinc-300 transition group-hover:text-zinc-500">
                  How to
                </span>
                <span className="text-[9px] leading-none text-zinc-300/80 transition group-hover:text-zinc-400">
                  有疑问点这里
                </span>
              </button>
            ) : null}
          </div>
        );
      })}
      {!tools.length ? <p className="px-2 py-3 text-[11px] text-zinc-400">{emptyText}</p> : null}
    </div>
  );
}

function HowToDrawer({
  toolName,
  guides,
  onClose,
  onOpenGuide,
}: {
  toolName: string;
  guides: PlazaToolGuide[];
  onClose: () => void;
  onOpenGuide: (g: PlazaToolGuide) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[320px] flex-col border-l border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-serif text-[12px] italic text-zinc-400">How to</p>
            <h3 className="mt-0.5 truncate text-[14px] font-semibold text-zinc-900">{toolName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {guides.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onOpenGuide(g)}
              className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                {PLAZA_GUIDE_TYPE_LABEL[g.type]}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-zinc-800">{g.title}</span>
                {g.blurb ? (
                  <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">{g.blurb}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

/** 本周精选 · 自动横向广播滚动 */
function PlazaPromoBanner({
  items,
  onOpen,
  onMore,
}: {
  items: PortalMapCard[];
  onOpen: (card: PortalMapCard) => void;
  onMore: () => void;
}) {
  const [paused, setPaused] = useState(false);
  // 单元内容铺满后再复制一份，配合 translateX(-50%) 无缝循环
  const track = useMemo(() => {
    if (!items.length) return [];
    let unit = [...items];
    while (unit.length < 5) unit = [...unit, ...items];
    return [...unit, ...unit];
  }, [items]);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200/70 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 px-2.5 py-2">
      <span className="shrink-0 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        本周精选
      </span>
      <div
        className="plaza-marquee min-w-0 flex-1 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {items.length ? (
          <div
            className={cn('plaza-marquee-track flex w-max gap-2.5', paused && 'plaza-marquee-paused')}
            style={{ animationDuration: `${Math.max(18, items.length * 5)}s` }}
          >
            {track.map((c, i) => (
              <button
                key={`${c.id}-${i}`}
                type="button"
                onClick={() => onOpen(c)}
                className="flex max-w-[240px] shrink-0 items-center gap-2 rounded-lg border border-zinc-200/60 bg-white/90 px-3 py-1.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-zinc-300"
              >
                <span className="shrink-0 rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-500">
                  {c.kind === 'training' ? '培训' : '洞察'}
                </span>
                <span className="truncate text-[12px] font-semibold text-zinc-800">{c.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-2 py-1 text-[12px] text-zinc-400">暂无精选内容</p>
        )}
      </div>
      <button
        type="button"
        onClick={onMore}
        className="shrink-0 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700"
      >
        更多
      </button>
    </div>
  );
}

export function HomeScenePortal({ onInvokeAgent, onInvokeSkill }: HomeScenePortalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const user = useSessionStore((s) => s.user);

  const [rankMode, setRankMode] = useState<RankMode>('trending');
  const [capability, setCapability] = useState<ScenarioCapabilityId | 'all'>('all');
  const [toolCat, setToolCat] = useState<AiToolNavCategoryId>('chat');
  const [howToTool, setHowToTool] = useState<PrototypeToolSeed | null>(null);
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
  const toolsById = useMemo(() => new Map(homeAiTools.map((t) => [t.id, t])), [homeAiTools]);

  const pickedTools = useMemo(() => {
    const picks = getPlazaToolPicks(toolCat);
    const resolve = (ids: string[]) =>
      ids.map((id) => toolsById.get(id)).filter((t): t is PrototypeToolSeed => Boolean(t));
    return {
      external: resolve(picks.external),
      internal: resolve(picks.internal),
    };
  }, [toolCat, toolsById]);

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

  /** 洞察 + 培训混排，供横幅轮播 */
  const promoItems = useMemo(() => {
    const news = catalog.filter((c) => c.kind === 'news');
    const training = catalog.filter((c) => c.kind === 'training');
    const ranked = sortByRankMode(
      [...news, ...training].map((c) => ({ ...c, publishedAt: c.publishedAt })),
      'trending',
      engagementOf,
    );
    return ranked.slice(0, 8);
  }, [catalog, engagementOf, engagementById]);

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

  const openHowTo = (tool: PrototypeToolSeed) => {
    setHowToTool(tool);
  };

  const openGuideResource = (g: PlazaToolGuide) => {
    if (!g.url || g.url === '#') {
      showToast(`指引「${g.title}」演示占位，后续可挂 PPT / 图片 / 视频`);
      return;
    }
    window.open(g.url, '_blank', 'noopener,noreferrer');
  };

  const goOpsMore = () => {
    focusPortalType('news');
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
      {/* 0. 本周精选横幅 */}
      <PlazaPromoBanner items={promoItems} onOpen={handleCard} onMore={goOpsMore} />

      {/* 1. 马上能用：能力筛选 + 外部 | 内部 并排精选 */}
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
            <button type="button" onClick={() => setAppView('tools')} className={linkBtnClass}>
              更多
            </button>
          }
        />
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-2.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="mb-1 px-1 text-[11px] font-semibold text-zinc-500">外部</p>
            <ToolIconRow tools={pickedTools.external} onOpen={openTool} onHowTo={openHowTo} />
          </div>
          <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-2.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="mb-1 px-1 text-[11px] font-semibold text-zinc-500">内部</p>
            <ToolIconRow
              tools={pickedTools.internal}
              onOpen={openTool}
              onHowTo={openHowTo}
              emptyText="暂无内部推荐"
            />
          </div>
        </div>
      </section>

      {/* 2. 场景案例：最多两排 */}
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
              {(hotTop3Ids.includes(s.id) || isNewScenario(s.id)) ? (
                <span className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1">
                  {isNewScenario(s.id) ? (
                    <span
                      className="rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: '#C8102E' }}
                      title="新品"
                      aria-label="New"
                    >
                      New
                    </span>
                  ) : null}
                  {hotTop3Ids.includes(s.id) ? (
                    <span
                      className="flex h-5 w-5 items-center justify-center text-[#E85D04]"
                      title="最火 Top3"
                      aria-label="最火"
                    >
                      <i className="fa-solid fa-fire text-[11px]" />
                    </span>
                  ) : null}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => openScenario(s.id)}
                className="min-w-0 pr-5 text-left"
              >
                <span className="block truncate text-[12px] font-semibold text-zinc-900">
                  {s.label}
                </span>
                <span className="mt-0.5 line-clamp-1 block text-[10px] leading-snug text-zinc-400">
                  {s.desc}
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

      {howToTool ? (
        <HowToDrawer
          toolName={howToTool.name}
          guides={getPlazaToolGuides(howToTool.id)}
          onClose={() => setHowToTool(null)}
          onOpenGuide={openGuideResource}
        />
      ) : null}
    </div>
  );
}
