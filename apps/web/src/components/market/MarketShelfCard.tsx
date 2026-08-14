import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import type { MarketShelfCard as MarketShelfCardModel } from '@/domain/marketShelf';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

export function MarketShelfCard({
  card,
  variant = 'grid',
  showHot = false,
  className,
  onOpen,
  onPrimary,
  onHowTo,
  primaryLabel: primaryLabelOverride,
  howToLabel = '快速上手',
}: {
  card: MarketShelfCardModel;
  variant?: 'grid' | 'featured' | 'compact';
  /** 精选区右上角 HOT 角标 */
  showHot?: boolean;
  className?: string;
  onOpen: () => void;
  onPrimary?: () => void;
  onHowTo?: () => void;
  primaryLabel?: string;
  howToLabel?: string;
}) {
  const featured = variant === 'featured';
  const compact = variant === 'compact';
  const homeDense = Boolean(className?.includes('home-channel-card'));
  const isSkillMetrics = card.likes != null || card.downloads != null || card.dislikes != null;
  const primaryLabel =
    primaryLabelOverride ??
    (card.kind === 'projects'
      ? '详情'
      : card.primaryAction === 'howto'
        ? '快速上手'
        : '立即体验');

  const regionTone =
    card.kind === 'external' && card.region === 'overseas'
      ? 'overseas'
      : card.kind === 'external' && card.region === 'domestic'
        ? 'domestic'
        : null;

  const favorited = useMarketFavoriteStore((s) => s.isFavorite(card.id, card.kind));
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);
  const showToast = useMarketplaceStore((s) => s.showToast);

  const onToggleFavorite = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const on = toggleFavorite({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
    showToast(on ? `已收藏：${card.title}` : `已取消收藏：${card.title}`);
  };

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white transition duration-200',
        'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_10px_28px_-16px_rgba(24,24,27,0.35)]',
        featured ? 'p-5' : compact ? 'p-3' : homeDense ? 'p-3.5' : 'p-4',
        regionTone === 'overseas' && 'market-card-region-overseas hover:border-transparent',
        regionTone === 'domestic' && 'market-card-region-domestic hover:border-transparent',
        card.kind === 'projects' && 'market-card-mss hover:border-transparent',
        className,
      )}
    >
      {showHot ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1 -top-1 z-10 inline-flex items-center gap-0.5 rounded-md bg-gradient-to-br from-[#E11D48] via-[#F43F5E] to-[#FB923C] px-1.5 py-[3px] text-[9px] font-extrabold tracking-[0.08em] text-white shadow-[0_4px_10px_-3px_rgba(225,29,72,0.55)] ring-1 ring-white/70"
        >
          HOT
        </span>
      ) : null}
      {card.scopeBadge && !showHot ? (
        <span
          className={cn(
            'absolute right-3 top-3 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
            card.scopeBadge === 'public'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
              : 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
          )}
        >
          {card.scopeBadge === 'public' ? '公开' : '领域'}
        </span>
      ) : null}
      {card.scopeBadge && showHot ? (
        <span
          className={cn(
            'absolute right-3 top-7 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
            card.scopeBadge === 'public'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
              : 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
          )}
        >
          {card.scopeBadge === 'public' ? '公开' : '领域'}
        </span>
      ) : null}
      <button type="button" onClick={onOpen} className="flex min-h-0 flex-1 flex-col text-left">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-2xl bg-white/80 ring-1 ring-black/[0.04]',
              featured ? 'h-14 w-14' : compact || homeDense ? 'h-10 w-10' : 'h-11 w-11',
            )}
          >
            <ToolLogo
              name={card.productName || card.title}
              logoUrl={card.logoUrl}
              icon={card.icon}
              size={featured ? 40 : compact || homeDense ? 28 : 32}
              className="rounded-xl"
            />
          </div>
          <div className={cn('min-w-0 flex-1', card.scopeBadge && 'pr-10')}>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3
                className={cn(
                  'truncate font-semibold tracking-tight text-[#1d1d1f]',
                  featured ? 'text-[17px]' : compact ? 'text-[13px]' : homeDense ? 'text-[14px]' : 'text-[15px]',
                )}
              >
                {card.title}
              </h3>
              {!compact && card.featured && card.kind !== 'projects' ? (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                  精选
                </span>
              ) : null}
              {!compact && card.runnable ? (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                  可执行
                </span>
              ) : null}
            </div>
            {/* Skill 卡弱化技术名，避免与 Skill ID 冗余感 */}
            {card.productName && !card.scopeBadge ? (
              <p className="mt-0.5 truncate text-[11px] text-[#86868b]">{card.productName}</p>
            ) : null}
            <p
              className={cn(
                'leading-relaxed text-[#6e6e73]',
                card.productName && !card.scopeBadge ? 'mt-1' : 'mt-1.5',
                compact
                  ? 'line-clamp-2 text-[11px]'
                  : card.kind === 'external' || (card.productName && !card.scopeBadge)
                    ? 'line-clamp-1 text-[12px]'
                    : featured
                      ? 'line-clamp-3 text-[13px]'
                      : 'line-clamp-2 text-[12px]',
              )}
            >
              {card.description}
            </p>
            {!compact && featured && card.hasHowto ? (
              <p className="mt-2 text-[11px] leading-snug text-[#86868b]">
                快速上手 · 含上手材料，可先预览再使用
              </p>
            ) : null}
          </div>
        </div>
        {!compact ? (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              homeDense ? 'mt-2.5' : 'mt-3.5',
            )}
          >
            {card.badges.slice(0, featured ? 4 : 3).map((b) => (
              <span
                key={`${b.tone}-${b.label}`}
                className={cn(
                  'rounded-md bg-zinc-100/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600',
                  b.label === '海外' && 'market-badge-overseas',
                  b.label === '国内' && 'market-badge-domestic',
                  // 与 Skill Hub 一致：领域 / 区域 / 场景
                  b.tone === 'dept' && 'bg-violet-50 text-violet-800',
                  b.tone === 'region' && 'bg-teal-50 text-teal-800',
                  b.tone === 'type' && 'bg-amber-50 text-amber-800',
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        ) : null}
      </button>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 border-t border-black/[0.04]',
          compact ? 'mt-2.5 pt-2.5' : homeDense ? 'mt-2.5 pt-2.5' : 'mt-3.5 pt-3',
        )}
      >
        {isSkillMetrics ? (
          <span className="mr-auto inline-flex items-center gap-2.5 text-[10px] tabular-nums text-[#86868b]">
            <span className="inline-flex items-center gap-1" title="下载量">
              <i className="fa-solid fa-download text-[9px] text-[#86868b]" />
              {formatToolInvokes(card.downloads ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1" title="点赞">
              <i className="fa-solid fa-thumbs-up text-[9px] text-sky-500/80" />
              {formatToolInvokes(card.likes ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1" title="点踩">
              <i className="fa-solid fa-thumbs-down text-[9px] text-zinc-400" />
              {formatToolInvokes(card.dislikes ?? 0)}
            </span>
          </span>
        ) : card.heat > 0 && !compact ? (
          <span className="mr-auto inline-flex items-center gap-1 text-[10px] tabular-nums text-[#86868b]">
            <i className="fa-solid fa-fire text-[9px] text-amber-500/80" />
            {formatToolInvokes(card.heat)}
          </span>
        ) : (
          <span className="mr-auto" />
        )}
        <button
          type="button"
          onClick={onToggleFavorite}
          title={favorited ? '取消收藏' : '加入收藏'}
          aria-label={favorited ? '取消收藏' : '加入收藏'}
          aria-pressed={favorited}
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
            favorited
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'bg-black/[0.04] text-zinc-400 hover:bg-black/[0.07] hover:text-zinc-600',
          )}
        >
          <i className={cn('text-[12px]', favorited ? 'fa-solid fa-star' : 'fa-regular fa-star')} />
        </button>
        {onHowTo ? (
          <button
            type="button"
            onClick={onHowTo}
            className="shrink-0 rounded-lg border-0 bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-[#3f3f46] transition hover:bg-black/[0.07]"
          >
            {howToLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrimary ?? onOpen}
          className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
            card.kind === 'projects'
              ? 'bg-[#1d1d1f] text-white hover:bg-[#2c2c2e]'
              : 'border-0 bg-black/[0.04] text-[#3f3f46] hover:bg-black/[0.07]',
          )}
        >
          {primaryLabel}
        </button>
      </div>
    </article>
  );
}
