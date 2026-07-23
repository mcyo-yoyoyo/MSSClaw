import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EngagementActions } from '@/components/content/EngagementActions';

const PAGE_SIZE = 6;
/** 单卡固定高度；文案顶对齐 + 底部互动条，兼容长短文案 */
export const HOME_FEED_CARD_H = 'min-h-[108px] lg:h-[108px]';
/** 桌面端 2×3 固定视窗高度，翻页时区域不跳动 */
const DESKTOP_GRID_H = 'lg:h-[228px]';
/** AI广场场景工具 / AI任务对话框同高（原 72 × 1.3） */
export const HOME_SECONDARY_PANEL_H = 'h-[94px]';

interface CardPageCarouselProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  /** 切换筛选等时回到第一页 */
  resetKey?: string | number;
  emptyText?: string;
  className?: string;
}

/**
 * 内容区与上下区块同宽对齐；箭头绝对定位在内容区外侧，不参与宽度对齐。
 * 首页不显示左箭头；桌面端固定 2×3 高度。
 */
export function CardPageCarousel<T>({
  items,
  getKey,
  renderCard,
  resetKey,
  emptyText = '暂无内容',
  className,
}: CardPageCarouselProps<T>) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  if (!items.length) {
    return <p className="py-6 text-center text-[12px] text-zinc-400">{emptyText}</p>;
  }

  const start = page * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'grid grid-cols-1 content-start gap-2 sm:grid-cols-2 lg:grid-cols-3',
          DESKTOP_GRID_H,
        )}
      >
        {pageItems.map((item) => (
          <div key={getKey(item)} className={HOME_FEED_CARD_H}>
            {renderCard(item)}
          </div>
        ))}
      </div>

      {canPrev ? (
        <button
          type="button"
          aria-label="上一页"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="absolute -left-10 top-[calc(50%-10px)] z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 sm:flex lg:-left-11"
        >
          <i className="fa-solid fa-chevron-left text-[11px]" />
        </button>
      ) : null}

      {canNext ? (
        <button
          type="button"
          aria-label="下一页"
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          className="absolute -right-10 top-[calc(50%-10px)] z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 sm:flex lg:-right-11"
        >
          <i className="fa-solid fa-chevron-right text-[11px]" />
        </button>
      ) : null}

      {/* 始终占位，避免有/无翻页点时高度跳动 */}
      <div className="mt-2.5 flex h-1.5 items-center justify-center gap-1.5">
        {pageCount > 1
          ? Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 页`}
                onClick={() => setPage(i)}
                className={cn(
                  'h-1.5 rounded-full transition',
                  i === page ? 'w-4 bg-zinc-700' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400',
                )}
              />
            ))
          : null}
      </div>
    </div>
  );
}

/** 统一灰底标签（全球角色 / 区域 / 领域） */
export function OrgAxisTagRow({
  tags,
  className,
}: {
  tags: { axis: string; id: string; label: string }[];
  className?: string;
}) {
  if (!tags.length) return null;
  return (
    <span className={cn('inline-flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden', className)}>
      {tags.map((t) => (
        <span
          key={`${t.axis}-${t.id}`}
          className="inline-flex shrink-0 rounded bg-zinc-100 px-1.5 py-px text-[9px] font-medium text-zinc-500"
        >
          {t.label}
        </span>
      ))}
    </span>
  );
}

/** 标题与组织标签同一行：名称在左，灰底标签紧随右侧（不换行，避免卡片高度跳动） */
export function TitleWithOrgTags({
  title,
  tags,
  className,
}: {
  title: string;
  tags: { axis: string; id: string; label: string }[];
  className?: string;
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5 overflow-hidden', className)}>
      <span className="min-w-0 truncate text-[12px] font-semibold text-zinc-900">{title}</span>
      <OrgAxisTagRow tags={tags} className="shrink-0" />
    </span>
  );
}

type OrgTag = { axis: string; id: string; label: string };

/**
 * 广场案例 / 任务技能共用卡片骨架：
 * 文案顶对齐 → 副文案最多 2 行 → 互动条贴底；New/热度角标右下角缩小展示。
 */
export function HomeFeedCard({
  title,
  tags,
  description,
  active,
  onClick,
  contentId,
  baseUses,
  isNew,
  isHot,
  onAfterAction,
  onDownload,
  actionLabel,
  onAction,
}: {
  title: string;
  tags: OrgTag[];
  description: string;
  active?: boolean;
  onClick: () => void;
  contentId: string;
  baseUses?: number;
  isNew?: boolean;
  isHot?: boolean;
  onAfterAction?: (action: 'like' | 'dislike' | 'download') => void;
  /** 提供时走真实导出（案例包 / 技能包） */
  onDownload?: () => void;
  /** 次要动作（如案例卡「用技能」） */
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-xl border bg-white px-3 pb-2 pt-2.5 transition',
        active
          ? 'border-zinc-900/20 shadow-sm ring-1 ring-zinc-900/5'
          : 'border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/60',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-0 flex-1 flex-col justify-start gap-1 overflow-hidden pr-1 text-left"
      >
        <TitleWithOrgTags title={title} tags={tags} />
        <span className="line-clamp-2 text-[10px] leading-snug text-zinc-400">{description}</span>
      </button>

      <div className="mt-auto flex min-h-[22px] items-end justify-between gap-2 pr-7 pt-1">
        <EngagementActions
          contentId={contentId}
          compact
          baseUses={baseUses}
          onAfterAction={onAfterAction}
          onDownload={onDownload}
        />
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAction();
            }}
            className="shrink-0 text-[10px] font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            {actionLabel}
            <i className="fa-solid fa-arrow-right ml-0.5 text-[8px]" />
          </button>
        ) : null}
      </div>

      {isNew || isHot ? (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 flex items-center gap-0.5">
          {isNew ? (
            <span
              className="rounded px-0.5 py-px text-[7px] font-bold uppercase leading-none tracking-wide text-white"
              style={{ backgroundColor: '#C8102E' }}
              title="新品"
              aria-label="New"
            >
              New
            </span>
          ) : null}
          {isHot ? (
            <span
              className="flex h-3.5 w-3.5 items-center justify-center text-[#E85D04]"
              title="最火 Top3"
              aria-label="最火"
            >
              <i className="fa-solid fa-fire text-[9px]" />
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
