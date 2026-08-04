import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useMarketFilterStore } from '@/stores/marketFilterStore';

/** 货架页工具条：仅搜索（维度筛选在左栏）+ trailing（提报等） */
export function MarketShelfFilterBar({
  className,
  trailing,
}: {
  className?: string;
  trailing?: ReactNode;
}) {
  const search = useMarketFilterStore((s) => s.search);
  const setSearch = useMarketFilterStore((s) => s.setSearch);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="relative min-w-0 flex-1">
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="在权限范围内搜索…"
          className="w-full rounded-xl border border-zinc-200/90 bg-white py-2.5 pl-9 pr-3 text-[13px] text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100"
        />
      </label>
      {trailing}
    </div>
  );
}
