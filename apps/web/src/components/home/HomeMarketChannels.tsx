import { cn } from '@/lib/utils';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { ShineBorder } from '@/components/ui/shine-border';
import {
  MARKET_SHELF_META,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';

const CHANNEL_ORDER: MarketShelfKind[] = ['external', 'internal', 'projects'];
const CHANNEL_BLURB: Record<MarketShelfKind, string | null> = {
  external: '禁止将公司内部信息上传到外部AI网站',
  internal: '写报告、查制度、个人问答等',
  projects: '高价值场景沉淀的 Skill 和 Agent',
};

const TITLE_COLOR: Record<MarketShelfKind, string> = {
  external: '#2563eb',
  internal: '#0d9488',
  projects: '#c45b5f',
};

const TOP_N = 3;

export function HomeMarketChannels({
  cardsByKind,
  onOpen,
  onOpenChannel,
  searchActive,
}: {
  cardsByKind: Record<MarketShelfKind, MarketShelfCardModel[]>;
  onOpen: (card: MarketShelfCardModel) => void;
  onOpenChannel: (kind: MarketShelfKind) => void;
  searchActive?: boolean;
}) {
  return (
    <section className="grid gap-3 lg:grid-cols-3 lg:gap-3.5">
      {CHANNEL_ORDER.map((kind) => {
        const meta = MARKET_SHELF_META[kind];
        const cards = cardsByKind[kind].slice(0, TOP_N);
        return (
          <article
            key={kind}
            className={cn(
              'market-channel-panel flex min-h-0 flex-col rounded-[20px]',
              `market-channel-panel--${kind}`,
            )}
          >
            <ShineBorder shineColor={['#A07CFE', '#FE8FB5', '#FFBE7B']} />
            <header className="market-channel-head min-h-[77px] border-b border-black/[0.04] px-3.5 py-3.5">
              <div className="flex min-h-8 items-start justify-center">
                <div className="min-w-0 text-center">
                  <h2
                    className="market-channel-title truncate"
                    style={{ color: TITLE_COLOR[kind] }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenChannel(kind)}
                      className="rounded-md transition hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
                      aria-label={`进入${meta.label}`}
                    >
                      {meta.label}
                    </button>
                  </h2>
                  {CHANNEL_BLURB[kind] ? (
                    <p
                      className={cn(
                        'mt-1.5 truncate text-[12px] leading-snug',
                        kind === 'external'
                          ? 'font-medium text-red-600'
                          : 'text-[#6e6e73]',
                      )}
                    >
                      {CHANNEL_BLURB[kind]}
                    </p>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2.5">
              {cards.length ? (
                cards.map((c) => (
                  <MarketShelfCard
                    key={`${c.kind}-${c.id}`}
                    card={c}
                    className="home-channel-card"
                    enableCompare={false}
                    showTags={false}
                    onOpen={() => onOpen(c)}
                    onPrimary={() => onOpen(c)}
                  />
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-[12px] text-[#86868b]">
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
