import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import type { MarketShelfCard as MarketShelfCardModel } from '@/domain/marketShelf';

export function MarketShelfCard({
  card,
  variant = 'grid',
  favorited,
  onOpen,
  onPrimary,
  onHowTo,
  onRun,
  onFavorite,
}: {
  card: MarketShelfCardModel;
  variant?: 'grid' | 'featured';
  favorited?: boolean;
  onOpen: () => void;
  onPrimary?: () => void;
  onHowTo?: () => void;
  onRun?: () => void;
  onFavorite?: () => void;
}) {
  const featured = variant === 'featured';
  const primaryLabel =
    card.kind === 'projects'
      ? '\u67e5\u770b\u8be6\u60c5'
      : card.primaryAction === 'howto'
        ? '\u67e5\u770b How to'
        : '\u7acb\u5373\u4f7f\u7528';

  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white transition duration-200',
        'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_10px_28px_-16px_rgba(24,24,27,0.35)]',
        featured ? 'p-5' : 'p-4',
      )}
    >
      <button type="button" onClick={onOpen} className="flex min-h-0 flex-1 flex-col text-left">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-2xl bg-zinc-50 ring-1 ring-zinc-100',
              featured ? 'h-14 w-14' : 'h-11 w-11',
            )}
          >
            <ToolLogo
              name={card.title}
              logoUrl={card.logoUrl}
              icon={card.icon}
              size={featured ? 40 : 32}
              className="rounded-xl"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3
                className={cn(
                  'truncate font-semibold tracking-tight text-zinc-900',
                  featured ? 'text-[16px]' : 'text-[14px]',
                )}
              >
                {card.title}
              </h3>
              {card.featured ? (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                  {'\u7cbe\u9009'}
                </span>
              ) : null}
              {card.runnable ? (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                  {'\u53ef\u6267\u884c'}
                </span>
              ) : null}
            </div>
            <p
              className={cn(
                'mt-1.5 leading-relaxed text-zinc-500',
                featured ? 'line-clamp-3 text-[12px]' : 'line-clamp-2 text-[12px]',
              )}
            >
              {card.description}
            </p>
            {featured && card.hasHowto ? (
              <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                How to {'\u00b7'} {'\u542b\u5feb\u901f\u4e0a\u624b\u6750\u6599\uff0c\u53ef\u5148\u9884\u89c8\u518d\u4f7f\u7528'}
              </p>
            ) : null}
            {card.kind === 'projects' && card.updatedAt ? (
              <p className="mt-1.5 text-[10px] text-zinc-400">
                {'\u66f4\u65b0'} {card.updatedAt}
              </p>
            ) : null}
          </div>
        </div>
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
      </button>
      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        {onHowTo ? (
          <button
            type="button"
            onClick={onHowTo}
            className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            How to
          </button>
        ) : null}
        {onFavorite ? (
          <button
            type="button"
            onClick={onFavorite}
            title={favorited ? '\u53d6\u6d88\u6536\u85cf' : '\u6536\u85cf'}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition',
              favorited
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
            )}
          >
            <i
              className={cn(
                'mr-1 text-[10px]',
                favorited ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark',
              )}
            />
            {favorited ? '\u5df2\u6536\u85cf' : '\u6536\u85cf'}
          </button>
        ) : null}
        {onRun && card.runnable ? (
          <button
            type="button"
            onClick={onRun}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-100"
          >
            {'\u6267\u884c'}
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
