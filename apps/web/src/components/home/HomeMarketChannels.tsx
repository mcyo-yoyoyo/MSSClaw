import { cn } from '@/lib/utils';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { ShineBorder } from '@/components/ui/shine-border';
import {
  MARKET_SHELF_META,
  type MarketShelfCard as MarketShelfCardModel,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { openMarketShelf } from '@/domain/openHomeJourney';

const CHANNEL_ORDER: MarketShelfKind[] = ['external', 'internal', 'projects'];
const CHANNEL_BLURB: Record<MarketShelfKind, string> = {
  external: '海外 / 国内对照 · 场景与类型筛选',
  internal: '写报告、查制度、个人问答，对上再打开',
  projects: 'Skill Hub · Agent Hub 分列统计',
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
  searchActive,
  projectsBreakdown,
}: {
  cardsByKind: Record<MarketShelfKind, MarketShelfCardModel[]>;
  onOpen: (card: MarketShelfCardModel) => void;
  searchActive?: boolean;
  /** AI工具Hub：Skill / Agent 分列数量 */
  projectsBreakdown?: { skill: number; agent: number };
}) {
  return (
    <section className="grid gap-3 lg:grid-cols-3 lg:gap-3.5">
      {CHANNEL_ORDER.map((kind) => {
        const meta = MARKET_SHELF_META[kind];
        const total = cardsByKind[kind].length;
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
            <header className="market-channel-head border-b border-black/[0.04] px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                    <h2
                      className="market-channel-title truncate"
                      style={{ color: TITLE_COLOR[kind] }}
                    >
                      {meta.label}
                    </h2>
                    {kind === 'projects' && projectsBreakdown ? (
                      <div className="home-channel-stats" aria-label="Skill 与 Agent 数量">
                        <span className="home-channel-stats__item" title={`Skill Hub ${projectsBreakdown.skill} 项`}>
                          <span className="home-channel-stats__label">Skill</span>
                          <span className="home-channel-stats__value">{projectsBreakdown.skill}</span>
                        </span>
                        <span className="home-channel-stats__divider" aria-hidden />
                        <span className="home-channel-stats__item" title={`Agent Hub ${projectsBreakdown.agent} 项`}>
                          <span className="home-channel-stats__label">Agent</span>
                          <span className="home-channel-stats__value">{projectsBreakdown.agent}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="home-channel-stats__solo" title={`共 ${total} 项`}>
                        <span className="home-channel-stats__value">{total}</span>
                        <span className="home-channel-stats__unit">项</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[12px] leading-snug text-[#6e6e73]">
                    {CHANNEL_BLURB[kind]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openMarketShelf(kind)}
                  className="mt-0.5 shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#0071e3] transition hover:bg-[#0071e3] hover:text-white"
                >
                  进入 <i className="fa-solid fa-arrow-right text-[9px]" />
                </button>
              </div>
              {kind !== 'projects' ? (
                <p
                  className={cn(
                    'mt-2 text-[10px]',
                    kind === 'external' ? 'font-medium text-red-600' : 'text-[#86868b]',
                  )}
                >
                  {kind === 'external'
                    ? '外部工具为第三方服务，禁止将公司内部信息上传到外部AI网站'
                    : '与货架办公场景同源 · 点击进入工具详情'}
                </p>
              ) : null}
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2.5">
              {cards.length ? (
                cards.map((c) => (
                  <MarketShelfCard
                    key={`${c.kind}-${c.id}`}
                    card={c}
                    className="home-channel-card"
                    enableCompare={false}
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
