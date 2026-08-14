import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { MarketFavoriteItem } from '@/stores/marketFavoriteStore';
import type { RecentMarketItem } from '@/stores/recentMarketStore';
import { MARKET_SHELF_META, type MarketShelfKind } from '@/domain/marketShelf';
import { openMarketShelf } from '@/domain/openHomeJourney';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { ToolLogo } from '@/components/brand/ToolLogo';

type WorkItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
};

type TabId = 'favorites' | 'recent';

/**
 * 首页「我的」：Tab 切换 + 横向卡片条，控制纵向占高
 */
export function HomeMyWorkbench({
  favorites,
  recent,
  onOpen,
  className,
}: {
  favorites: MarketFavoriteItem[];
  recent: RecentMarketItem[];
  onOpen: (item: WorkItem) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<TabId>('favorites');
  const setFavoritesOnly = useMarketFilterStore((s) => s.setFavoritesOnly);

  const items = (tab === 'favorites' ? favorites : recent).slice(0, 12);
  const empty =
    tab === 'favorites'
      ? '还没有收藏。在货架卡片点星标即可加入。'
      : '打开或体验过的工具会出现在这里。';

  const openAllFavorites = () => {
    setFavoritesOnly(true);
    openMarketShelf(favorites[0]?.kind ?? 'external');
  };

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col rounded-[18px] border border-black/[0.04] bg-white/95 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.04)]',
        className,
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="shrink-0 text-[13px] font-semibold tracking-tight text-[#1d1d1f]">我的</h2>
          <div
            className="inline-flex rounded-full bg-black/[0.04] p-0.5"
            role="tablist"
            aria-label="我的内容切换"
          >
            {(
              [
                { id: 'favorites' as const, label: '我的收藏', count: favorites.length },
                { id: 'recent' as const, label: '最近使用', count: recent.length },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                  tab === t.id
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#86868b] hover:text-[#3f3f46]',
                )}
              >
                {t.label}
                {t.count > 0 ? (
                  <span className="ml-1 tabular-nums opacity-60">{t.count}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
        {tab === 'favorites' ? (
          <button
            type="button"
            onClick={openAllFavorites}
            className="shrink-0 text-[11px] font-semibold text-[#0071e3] transition hover:underline"
          >
            全部
            <i className="fa-solid fa-arrow-right ml-0.5 text-[8px]" />
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="flex flex-1 items-center rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/70 px-3 py-3 text-[12px] leading-relaxed text-zinc-500">
          {empty}
        </p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="w-[112px] shrink-0">
              <button
                type="button"
                onClick={() => onOpen(item)}
                title={item.title}
                className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-transparent px-1.5 py-2 text-center transition hover:border-zinc-200 hover:bg-zinc-50"
              >
                <ToolLogo
                  name={item.title}
                  logoUrl={item.logoUrl}
                  icon={item.icon ?? 'fa-solid fa-star'}
                  size={36}
                  className="shrink-0"
                />
                <span className="line-clamp-2 w-full text-[11px] font-medium leading-snug text-[#1d1d1f]">
                  {item.title}
                </span>
                <span className="text-[10px] text-[#86868b]">
                  {MARKET_SHELF_META[item.kind].shortLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
