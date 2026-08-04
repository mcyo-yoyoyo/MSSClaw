import { cn } from '@/lib/utils';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { HOME_RANK_TABS, type RankMode } from '@/domain/contentEngagement';
import {
  MARKET_SHELF_META,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { openMarketShelf } from '@/domain/openHomeJourney';

const CHANNEL_ORDER: MarketShelfKind[] = ['external', 'internal', 'projects'];
const CHANNEL_BLURB: Record<MarketShelfKind, string> = {
  external: '外链 / SaaS 精选，即开即用',
  internal: '公司办公工具，权限范围可见',
  projects: 'MSS 建设成果，按场景深潜',
};

const TOP_N = 4;

export function HomeMarketChannels({
  cardsByKind,
  rankByKind,
  onRankChange,
  onOpen,
  onPrimary,
  onHowTo,
  searchActive,
}: {
  cardsByKind: Record<MarketShelfKind, MarketShelfCardModel[]>;
  rankByKind: Record<MarketShelfKind, RankMode>;
  onRankChange: (kind: MarketShelfKind, mode: RankMode) => void;
  onOpen: (card: MarketShelfCardModel) => void;
  onPrimary: (card: MarketShelfCardModel) => void;
  onHowTo: (card: MarketShelfCardModel) => void;
  searchActive?: boolean;
}) {
  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {CHANNEL_ORDER.map((kind) => {
        const meta = MARKET_SHELF_META[kind];
        const total = cardsByKind[kind].length;
        const cards = cardsByKind[kind].slice(0, TOP_N);
        const rank = rankByKind[kind];
        return (
          <article
            key={kind}
            className="flex min-h-0 flex-col rounded-2xl border border-zinc-200/90 bg-white/90 shadow-[0_8px_22px_-20px_rgba(24,24,27,0.35)]"
          >
            <header className="border-b border-zinc-100 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h2 className="truncate text-[18px] font-semibold tracking-tight text-zinc-900 md:text-[20px]">
                      {meta.label}
                    </h2>
                    <span
                      className="inline-flex shrink-0 items-baseline gap-0.5 rounded-full bg-zinc-900/[0.06] px-2 py-0.5 ring-1 ring-inset ring-zinc-900/[0.06]"
                      title={`共 ${total} 项`}
                    >
                      <span className="text-[15px] font-semibold tabular-nums tracking-tight text-zinc-800 md:text-[16px]">
                        {total}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400">项</span>
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12px] leading-snug text-zinc-400">
                    {CHANNEL_BLURB[kind]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openMarketShelf(kind)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
                >
                  进入 <i className="fa-solid fa-arrow-right text-[9px]" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {HOME_RANK_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onRankChange(kind, tab.id)}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-medium transition',
                      rank === tab.id
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2.5">
              {cards.length ? (
                cards.map((c) => (
                  <MarketShelfCard
                    key={`${c.kind}-${c.id}`}
                    card={c}
                    onOpen={() => onOpen(c)}
                    onPrimary={() => onPrimary(c)}
                    onHowTo={() => onHowTo(c)}
                  />
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-zinc-400">
                  {searchActive ? '当前搜索下暂无内容' : '暂无上架内容'}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
