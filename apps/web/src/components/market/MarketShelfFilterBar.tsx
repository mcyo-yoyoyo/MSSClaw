import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';

/** 货架页工具条：搜索 + 我的收藏 + trailing（提报等） */
export function MarketShelfFilterBar({
  className,
  trailing,
}: {
  className?: string;
  trailing?: ReactNode;
}) {
  const search = useMarketFilterStore((s) => s.search);
  const setSearch = useMarketFilterStore((s) => s.setSearch);
  const favoritesOnly = useMarketFilterStore((s) => s.favoritesOnly);
  const setFavoritesOnly = useMarketFilterStore((s) => s.setFavoritesOnly);
  const favCount = useMarketFavoriteStore((s) => s.items.length);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <label className="relative min-w-0 flex-1 basis-[200px]">
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="在权限范围内搜索…"
          className="w-full rounded-xl border border-zinc-200/90 bg-white py-2.5 pl-9 pr-3 text-[13px] text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100"
        />
      </label>
      <button
        type="button"
        onClick={() => setFavoritesOnly(!favoritesOnly)}
        aria-pressed={favoritesOnly}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition',
          favoritesOnly
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-zinc-200/90 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
        )}
      >
        <i className={cn('text-[11px]', favoritesOnly ? 'fa-solid fa-star' : 'fa-regular fa-star')} />
        我的收藏
        {favCount > 0 ? (
          <span className="tabular-nums text-[11px] opacity-70">{favCount}</span>
        ) : null}
      </button>
      {trailing}
    </div>
  );
}
