import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { PageCanvas } from '@/components/layout/PageCanvas';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import { MARKET_SHELF_META, type MarketShelfKind } from '@/domain/marketShelf';
import { openMarketShelf, openMarketToolDetail } from '@/domain/openHomeJourney';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/domain/rbac';
import { AiTasksPage } from '@/features/ai-tasks/AiTasksPage';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { useSessionStore } from '@/stores/sessionStore';

type KindFilter = MarketShelfKind | 'all';
type MeTab = 'favorites' | 'recent' | 'tasks';

type RowItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
  at?: number;
};

function formatRelative(at?: number): string {
  if (!at) return '';
  const diff = Date.now() - at;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export function MePage() {
  const favorites = useMarketFavoriteStore((s) => s.items);
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);
  const setNote = useMarketFavoriteStore((s) => s.setNote);
  const recent = useRecentMarketStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const isViewEnabled = useNavPresentationStore((s) => s.isViewEnabled);
  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const user = useSessionStore((s) => s.user);
  const showTasks = isViewEnabled('ai-tasks');

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [tab, setTab] = useState<MeTab>(
    appView === 'ai-tasks' && showTasks ? 'tasks' : 'favorites',
  );

  useEffect(() => {
    if (appView === 'ai-tasks' && showTasks) setTab('tasks');
  }, [appView, showTasks]);

  const favRows = useMemo(
    () => (kindFilter === 'all' ? favorites : favorites.filter((x) => x.kind === kindFilter)),
    [favorites, kindFilter],
  );
  const recentRows = useMemo(
    () => (kindFilter === 'all' ? recent : recent.filter((x) => x.kind === kindFilter)),
    [recent, kindFilter],
  );

  const openItem = (item: RowItem) => {
    if (item.kind === 'projects') {
      openMarketShelf('projects');
      return;
    }
    openMarketToolDetail(item.id, item.kind);
  };

  const selectTab = (next: MeTab) => {
    if (next === 'tasks' && !showTasks) return;
    setTab(next);
    if (next === 'tasks') {
      writeAppRouteToLocation({ view: 'ai-tasks' });
      setAppView('ai-tasks');
      return;
    }
    if (appView === 'ai-tasks') {
      writeAppRouteToLocation({ view: 'me' });
      setAppView('me');
    }
  };

  const initial = (user?.name?.trim()?.[0] ?? 'U').toUpperCase();
  const roleLabel = user ? ROLE_LABELS[user.platformRole] : '';
  const roleDesc = user ? ROLE_DESCRIPTIONS[user.platformRole] : '';

  const tabs: { id: MeTab; label: string; count?: number; hidden?: boolean }[] = [
    { id: 'favorites', label: '我的收藏', count: favorites.length },
    { id: 'recent', label: '最近浏览', count: recent.length },
    { id: 'tasks', label: '任务记录', hidden: !showTasks },
  ];

  return (
    <div className="center-surface flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageCanvas className="flex min-h-0 flex-1 flex-col py-4 pb-5">
        <section className="mb-3 shrink-0 overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:gap-3 md:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold text-white',
                  user?.avatar || 'bg-zinc-900',
                )}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <h1 className="truncate text-[14px] font-semibold tracking-tight text-[#1d1d1f]">
                    {user?.name ?? '个人中心'}
                  </h1>
                  {roleLabel ? (
                    <span className="shrink-0 text-[11px] font-medium text-[#3f3f46]">{roleLabel}</span>
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-[#86868b]" title={roleDesc || user?.email}>
                  {roleDesc || user?.email || ''}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 md:justify-end">
              <button
                type="button"
                onClick={() => {
                  writeAppRouteToLocation({ view: 'home' });
                  setAppView('home');
                }}
                className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-100"
              >
                去逛货架
              </button>
              {tabs
                .filter((t) => !t.hidden)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTab(t.id)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[12px] font-medium transition',
                      tab === t.id
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100',
                    )}
                  >
                    {t.label}
                    {t.count != null ? (
                      <span className="ml-1 tabular-nums opacity-70">{t.count}</span>
                    ) : null}
                  </button>
                ))}
              {tab !== 'tasks' ? (
                <div className="ml-1 flex flex-wrap gap-1">
                  {(['all', 'external', 'internal', 'projects'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKindFilter(k)}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-medium transition',
                        kindFilter === k
                          ? 'bg-zinc-200 text-zinc-800'
                          : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600',
                      )}
                    >
                      {k === 'all' ? '全部' : MARKET_SHELF_META[k].shortLabel}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {tab === 'tasks' && showTasks ? (
            <AiTasksPage embedded />
          ) : tab === 'recent' ? (
            <MeShelfGrid
              empty="打开或试用过的能力会出现在这里。"
              count={recentRows.length}
            >
              {recentRows.map((item) => (
                <MeCard
                  key={`recent:${item.kind}:${item.id}`}
                  item={item}
                  meta={formatRelative(item.at)}
                  actionLabel="收藏"
                  actionTone="zinc"
                  onOpen={() => openItem(item)}
                  onAction={() => {
                    const on = toggleFavorite(item);
                    showToast(on ? `已收藏：${item.title}` : `已取消收藏：${item.title}`);
                  }}
                />
              ))}
            </MeShelfGrid>
          ) : (
            <MeShelfGrid
              empty="还没有收藏。在货架卡片点星标即可加入。"
              count={favRows.length}
            >
              {favRows.map((item) => (
                <MeCard
                  key={`fav:${item.kind}:${item.id}`}
                  item={item}
                  note={item.note}
                  actionLabel="取消"
                  actionTone="amber"
                  onOpen={() => openItem(item)}
                  onAction={() => {
                    const on = toggleFavorite(item);
                    showToast(on ? `已收藏：${item.title}` : `已取消收藏：${item.title}`);
                  }}
                  onSaveNote={(note) => {
                    setNote(item.id, item.kind, note);
                    showToast(note.trim() ? '已保存备注' : '已清空备注');
                  }}
                />
              ))}
            </MeShelfGrid>
          )}
        </div>
      </PageCanvas>
    </div>
  );
}

function MeShelfGrid({
  empty,
  count,
  children,
}: {
  empty: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white/70 px-4">
        <p className="text-center text-[13px] text-[#a1a1aa]">{empty}</p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto scroll-hidden">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</ul>
    </div>
  );
}

function MeCard({
  item,
  meta,
  note,
  actionLabel,
  actionTone,
  onOpen,
  onAction,
  onSaveNote,
}: {
  item: RowItem;
  meta?: string;
  note?: string;
  actionLabel: string;
  actionTone: 'amber' | 'zinc';
  onOpen: () => void;
  onAction: () => void;
  onSaveNote?: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? '');

  const saveNote = () => {
    onSaveNote?.(draft);
    setEditing(false);
  };

  return (
    <li className="rounded-2xl border border-black/[0.04] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <ToolLogo
            name={item.title}
            logoUrl={item.logoUrl}
            icon={item.icon ?? 'fa-cube'}
            size={36}
            className="mt-0.5 shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-zinc-900">{item.title}</span>
            <span className="text-[11px] text-zinc-400">
              {MARKET_SHELF_META[item.kind].label}
              {meta ? ` · ${meta}` : ''}
            </span>
            {!editing && note ? (
              <span className="mt-0.5 block truncate text-[11px] text-zinc-500">备注：{note}</span>
            ) : null}
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {onSaveNote ? (
            <button
              type="button"
              onClick={() => {
                setDraft(note ?? '');
                setEditing((v) => !v);
              }}
              className="rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50"
            >
              备注
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAction}
            className={cn(
              'rounded-lg px-2 py-1 text-[11px] font-medium',
              actionTone === 'amber' ? 'text-amber-700 hover:bg-amber-50' : 'text-zinc-500 hover:bg-zinc-50',
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
      {editing && onSaveNote ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNote();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder="写下为什么收藏，方便以后找"
            maxLength={80}
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[12px] text-zinc-700 outline-none focus:border-zinc-300"
          />
          <button
            type="button"
            onClick={saveNote}
            className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200/80"
          >
            保存
          </button>
        </div>
      ) : null}
    </li>
  );
}
