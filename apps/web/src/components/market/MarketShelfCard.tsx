import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import type { MarketShelfCard as MarketShelfCardModel } from '@/domain/marketShelf';

export function MarketShelfCard({
  card,
  variant = 'grid',
  onOpen,
  onPrimary,
  onHowTo,
  primaryLabel: primaryLabelOverride,
  howToLabel = '快速上手',
}: {
  card: MarketShelfCardModel;
  variant?: 'grid' | 'featured' | 'compact';
  onOpen: () => void;
  onPrimary?: () => void;
  onHowTo?: () => void;
  primaryLabel?: string;
  howToLabel?: string;
}) {
  const featured = variant === 'featured';
  const compact = variant === 'compact';
  const primaryLabel =
    primaryLabelOverride ??
    (card.kind === 'projects'
      ? '下载'
      : card.primaryAction === 'howto'
        ? '快速上手'
        : '立即体验');

  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white transition duration-200',
        'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_10px_28px_-16px_rgba(24,24,27,0.35)]',
        featured ? 'p-5' : compact ? 'p-3' : 'p-4',
      )}
    >
      <button type="button" onClick={onOpen} className="flex min-h-0 flex-1 flex-col text-left">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-100',
              featured ? 'h-14 w-14' : compact ? 'h-9 w-9' : 'h-11 w-11',
            )}
          >
            <ToolLogo
              name={card.productName || card.title}
              logoUrl={card.logoUrl}
              icon={card.icon}
              size={featured ? 40 : compact ? 26 : 32}
              className="rounded-xl"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3
                className={cn(
                  'truncate font-semibold tracking-tight text-zinc-900',
                  featured ? 'text-[16px]' : compact ? 'text-[13px]' : 'text-[14px]',
                )}
              >
                {card.title}
              </h3>
              {!compact && card.featured ? (
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
            {card.productName ? (
              <p className="mt-0.5 truncate text-[11px] text-zinc-400">{card.productName}</p>
            ) : null}
            <p
              className={cn(
                'leading-relaxed text-zinc-500',
                card.productName ? 'mt-1' : 'mt-1.5',
                compact
                  ? 'line-clamp-2 text-[11px]'
                  : card.kind === 'external' || card.productName
                    ? 'line-clamp-1 text-[12px]'
                    : featured
                      ? 'line-clamp-3 text-[12px]'
                      : 'line-clamp-2 text-[12px]',
              )}
            >
              {card.description}
            </p>
            {!compact && featured && card.hasHowto ? (
              <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                快速上手 · 含上手材料，可先预览再使用
              </p>
            ) : null}
            {card.kind === 'projects' && card.updatedAt ? (
              <p className="mt-1.5 text-[10px] text-zinc-400">更新 {card.updatedAt}</p>
            ) : null}
          </div>
        </div>
        {!compact ? (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {card.badges.slice(0, featured ? 4 : 3).map((b) => (
              <span
                key={`${b.tone}-${b.label}`}
                className="rounded-md bg-zinc-100/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
              >
                {b.label}
              </span>
            ))}
            {card.heat > 0 ? (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] tabular-nums text-zinc-400">
                <i className="fa-solid fa-fire text-[9px] text-amber-500/80" />
                {formatToolInvokes(card.heat)}
              </span>
            ) : null}
          </div>
        ) : null}
      </button>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 border-t border-zinc-100',
          compact ? 'mt-2.5 pt-2.5' : 'mt-3.5 pt-3',
        )}
      >
        {onHowTo ? (
          <button
            type="button"
            onClick={onHowTo}
            className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            {howToLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrimary ?? onOpen}
          className="ml-auto rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zinc-800"
        >
          {primaryLabel}
        </button>
      </div>
    </article>
  );
}
