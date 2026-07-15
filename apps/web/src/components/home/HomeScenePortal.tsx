import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed, PrototypeToolSeed } from '@/domain/prototype/types';
import {
  filterAiMapCards,
  type PortalMapCard,
} from '@/domain/portalMap';
import { openPortalCard } from '@/domain/portalNavigation';
import {
  AI_TOOL_NAV_CATEGORIES,
  isHomeAiTool,
  resolveAiToolNavCategory,
  type AiToolNavCategoryId,
} from '@/domain/aiToolCategories';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

interface HomeScenePortalProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

function ToolIconRow({
  tools,
  onOpen,
  showHoverTip = false,
}: {
  tools: PrototypeToolSeed[];
  onOpen: (id: string) => void;
  showHoverTip?: boolean;
}) {
  const showToast = useMarketplaceStore((s) => s.showToast);

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scroll-hidden">
      {tools.map((t) => (
        <div key={t.id} className="group relative shrink-0">
          <button
            type="button"
            title={showHoverTip ? t.desc : undefined}
            onClick={() => {
              if (showHoverTip && window.matchMedia('(hover: none)').matches) {
                showToast(t.desc);
              }
              onOpen(t.id);
            }}
            className="flex w-[76px] flex-col items-center gap-1.5 rounded-xl bg-transparent px-1.5 py-2 transition hover:bg-zinc-100/80"
          >
            <ToolLogo name={t.name} logoUrl={t.logoUrl} icon={t.icon} size={28} />
            <span className="w-full truncate text-center text-[11px] font-semibold text-zinc-800">
              {t.name}
            </span>
          </button>
          {showHoverTip ? (
            <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden w-44 -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-center text-[10px] leading-snug text-white opacity-0 shadow-lg transition group-hover:opacity-100 [@media(hover:hover)]:block">
              {t.desc}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
            </div>
          ) : null}
        </div>
      ))}
      {!tools.length ? (
        <p className="px-2 py-3 text-[11px] text-zinc-400">该类型暂无工具</p>
      ) : null}
    </div>
  );
}

function CompactCard({
  card,
  onClick,
  rank,
}: {
  card: PortalMapCard;
  onClick: () => void;
  rank?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-2 text-left transition hover:border-zinc-300 hover:shadow-sm"
    >
      {typeof rank === 'number' ? (
        <span
          className={cn(
            'flex h-7 w-5 shrink-0 items-center justify-center text-[12px] font-bold',
            rank <= 3 ? 'text-claw-600' : 'text-zinc-400',
          )}
        >
          {rank}
        </span>
      ) : null}
      {card.logoUrl ? (
        <ToolLogo name={card.title} logoUrl={card.logoUrl} icon={card.icon} size={28} />
      ) : (
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white',
            card.kind === 'case' || card.kind === 'insight' ? 'bg-zinc-700' : 'bg-zinc-800',
          )}
        >
          <i className={cn('fa-solid text-[10px]', card.icon)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-zinc-900">{card.title}</p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{card.desc}</p>
      </div>
    </button>
  );
}

function Column({
  title,
  cards,
  byHeat,
  onCard,
  onMore,
  moreLabel,
  heatOf,
}: {
  title: string;
  cards: PortalMapCard[];
  byHeat: boolean;
  onCard: (c: PortalMapCard) => void;
  onMore: () => void;
  moreLabel: string;
  heatOf: (c: PortalMapCard) => number;
}) {
  const shown = useMemo(() => {
    if (!byHeat) return cards;
    return [...cards].sort((a, b) => heatOf(b) - heatOf(a));
  }, [cards, byHeat, heatOf]);

  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-center">
        <h3 className="text-[14px] font-bold text-claw-600">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {shown.length ? (
          shown.map((c, i) => (
            <CompactCard
              key={c.id}
              card={c}
              rank={byHeat ? i + 1 : undefined}
              onClick={() => onCard(c)}
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-200 px-2 py-3 text-center text-[11px] text-zinc-400">
            暂无内容
          </p>
        )}
      </div>
      <div className="mt-1.5 text-center">
        <button
          type="button"
          onClick={onMore}
          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
        >
          {moreLabel}
        </button>
      </div>
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

  const [byHeat, setByHeat] = useState(false);
  const [toolCat, setToolCat] = useState<AiToolNavCategoryId>('chat');
  const focusPortalType = useNavigationIntentStore((s) => s.focusPortalType);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const homeAiTools = useMemo(() => tools.filter(isHomeAiTool), [tools]);

  const toolsInCategory = useMemo(
    () => homeAiTools.filter((t) => resolveAiToolNavCategory(t) === toolCat),
    [homeAiTools, toolCat],
  );

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

  const heatOf = useMemo(() => {
    const toolInvokes = new Map(tools.map((t) => [t.id, t.invokes]));
    const urlInvokes = new Map(
      tools.filter((t) => t.homepageUrl).map((t) => [t.homepageUrl!, t.invokes]),
    );
    return (card: PortalMapCard): number => {
      const { action } = card;
      if (action.type === 'tool') return toolInvokes.get(action.toolId) ?? 0;
      if (action.type === 'external') return urlInvokes.get(action.url) ?? 0;
      if (card.publishedAt) return Number(card.publishedAt.replace(/-/g, '')) || 0;
      let h = 0;
      for (let i = 0; i < card.id.length; i++) h = (h * 31 + card.id.charCodeAt(i)) % 100000;
      return h;
    };
  }, [tools]);

  const allNewsCards = useMemo(() => catalog.filter((c) => c.kind === 'news'), [catalog]);
  const newsCards = useMemo(() => {
    const pool = allNewsCards.slice(0, 4);
    return byHeat ? [...pool].sort((a, b) => heatOf(b) - heatOf(a)) : pool;
  }, [allNewsCards, byHeat, heatOf]);

  const allTrainingCards = useMemo(
    () => catalog.filter((c) => c.kind === 'training'),
    [catalog],
  );
  const trainingCards = useMemo(() => {
    const pool = allTrainingCards.slice(0, 4);
    return byHeat ? [...pool].sort((a, b) => heatOf(b) - heatOf(a)) : pool;
  }, [allTrainingCards, byHeat, heatOf]);

  const allCaseCards = useMemo(
    () => catalog.filter((c) => c.kind === 'case' || c.kind === 'insight'),
    [catalog],
  );
  const caseCards = useMemo(() => {
    const pool = byHeat
      ? [...allCaseCards].sort((a, b) => heatOf(b) - heatOf(a))
      : allCaseCards;
    return pool.slice(0, 4);
  }, [allCaseCards, byHeat, heatOf]);

  const handleCard = (card: PortalMapCard) => {
    openPortalCard(card, { onInvokeAgent, onInvokeSkill, showToast });
  };

  const openTool = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool?.homepageUrl) {
      showToast('暂无入口链接');
      return;
    }
    window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
    useMarketplaceStore.getState().bumpToolInvokes(toolId);
    showToast(`已打开：${tool.name}`);
  };

  const goPortalOps = (type: 'news' | 'training') => {
    focusPortalType(type);
    setAppView('portal-ops');
  };

  return (
    <div className="mt-1 space-y-3">
      <section>
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold text-zinc-900">常用 AI 工具</h2>
            <p className="text-[11px] text-zinc-400">按类型浏览 · 悬停或轻触查看简介</p>
          </div>
          <button
            type="button"
            onClick={() => setAppView('tools')}
            className="shrink-0 text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            查看更多
          </button>
        </div>

        <div className="mb-2 flex gap-1 overflow-x-auto pb-0.5 scroll-hidden">
          {AI_TOOL_NAV_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setToolCat(c.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                toolCat === c.id
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800',
              )}
            >
              <i className={cn('fa-solid text-[9px]', c.icon)} />
              {c.label}
            </button>
          ))}
        </div>

        <ToolIconRow tools={toolsInCategory} onOpen={openTool} showHoverTip />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setByHeat((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
              byHeat
                ? 'bg-claw-600/10 text-claw-700'
                : 'text-zinc-400 hover:bg-zinc-100 hover:text-claw-600',
            )}
          >
            <i className={cn('fa-solid text-[10px]', byHeat ? 'fa-fire' : 'fa-chart-simple')} />
            {byHeat ? '热度排名中 · 点击恢复默认' : '按热度统一排序'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Column
            title="前沿洞察"
            cards={newsCards}
            byHeat={byHeat}
            onCard={handleCard}
            onMore={() => goPortalOps('news')}
            moreLabel="查看更多"
            heatOf={heatOf}
          />
          <Column
            title="培训赋能"
            cards={trainingCards}
            byHeat={byHeat}
            onCard={handleCard}
            onMore={() => goPortalOps('training')}
            moreLabel="查看更多"
            heatOf={heatOf}
          />
          <Column
            title="场景案例"
            cards={caseCards}
            byHeat={byHeat}
            onCard={handleCard}
            onMore={() => setAppView('ai-map')}
            moreLabel="查看更多"
            heatOf={heatOf}
          />
        </div>
      </section>

      <div className="flex flex-col items-center gap-1 pt-0.5">
        <p className="text-[10px] text-zinc-400">场景导航是橱窗 · 案例是完整样板间</p>
        <button
          type="button"
          onClick={() => setAppView('ai-map')}
          className="text-[12px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
        >
          打开案例 →
        </button>
      </div>
    </div>
  );
}
