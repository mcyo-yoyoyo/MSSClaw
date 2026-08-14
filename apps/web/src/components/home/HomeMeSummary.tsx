import { cn } from '@/lib/utils';
import type { MarketFavoriteItem } from '@/stores/marketFavoriteStore';
import type { RecentMarketItem } from '@/stores/recentMarketStore';
import { openMeCenter } from '@/domain/openHomeJourney';
import { ToolLogo } from '@/components/brand/ToolLogo';

/** 首页个人中心摘要：最多 6 个芯片 + 进入个人中心 */
export function HomeMeSummary({
  favorites,
  recent,
  onOpen,
  className,
}: {
  favorites: MarketFavoriteItem[];
  recent: RecentMarketItem[];
  onOpen: (item: { id: string; kind: MarketFavoriteItem['kind']; title: string; icon?: string; logoUrl?: string }) => void;
  className?: string;
}) {
  const chips = (favorites.length ? favorites : recent).slice(0, 6);

  return (
    <section
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-[16px] border border-black/[0.04] bg-white/90 px-3.5 py-2.5',
        className,
      )}
    >
      <h2 className="shrink-0 text-[13px] font-semibold tracking-tight text-[#1d1d1f]">个人中心</h2>
      {chips.length === 0 ? (
        <p className="min-w-0 flex-1 text-[12px] text-[#86868b]">
          收藏或打开过的能力会出现在这里
        </p>
      ) : (
        <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="shrink-0">
              <button
                type="button"
                title={item.title}
                onClick={() => onOpen(item)}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-2 py-1 text-[11px] font-medium text-[#3f3f46] transition hover:bg-zinc-100"
              >
                <ToolLogo name={item.title} logoUrl={item.logoUrl} icon={item.icon} size={16} />
                <span className="max-w-[88px] truncate">{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => openMeCenter()}
        className="shrink-0 text-[11px] font-semibold text-[#0071e3] hover:underline"
      >
        进入个人中心
        <i className="fa-solid fa-arrow-right ml-0.5 text-[8px]" />
      </button>
    </section>
  );
}
