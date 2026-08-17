import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SHELF_RANK_TABS, type RankMode } from '@/domain/contentEngagement';

export function ShelfRankSelect({
  value,
  onChange,
  className,
  showExcelOrder = false,
  options,
}: {
  value: RankMode;
  onChange: (next: RankMode) => void;
  className?: string;
  showExcelOrder?: boolean;
  /** 覆盖默认排序项（如 Agent Hub 用 AGENT_HUB_RANK_TABS） */
  options?: { id: RankMode; label: string; icon: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabs =
    options ??
    (showExcelOrder
      ? SHELF_RANK_TABS
      : SHELF_RANK_TABS.filter((tab) => tab.id !== 'excel_order'));
  const current = tabs.find((t) => t.id === value) ?? tabs[0]!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`排序：${current.label}`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium transition',
          'text-[#6e6e73] hover:bg-black/[0.04] hover:text-[#1d1d1f]',
          open && 'bg-black/[0.04] text-[#1d1d1f]',
        )}
      >
        <i className={cn(current.icon, 'text-[11px] text-[#86868b]')} />
        <span>{current.label}</span>
        <i
          className={cn(
            'fa-solid fa-chevron-down text-[8px] text-[#a1a1aa] transition',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1 min-w-[7.5rem] overflow-hidden rounded-xl border border-zinc-200/90 bg-white py-1 shadow-[0_10px_28px_-16px_rgba(24,24,27,0.45)]"
        >
          {tabs.map((t) => {
            const active = t.id === value;
            return (
              <li key={t.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition',
                    active
                      ? 'bg-zinc-50 font-medium text-[#1d1d1f]'
                      : 'text-[#6e6e73] hover:bg-zinc-50 hover:text-[#1d1d1f]',
                  )}
                >
                  <i className={cn(t.icon, 'w-3.5 text-center text-[11px] text-[#86868b]')} />
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function ShelfSectionHead({
  title,
  count,
  rankMode,
  onRankChange,
  className,
  showExcelOrder = false,
  rankOptions,
}: {
  title: string;
  count?: number;
  rankMode: RankMode;
  onRankChange: (next: RankMode) => void;
  className?: string;
  showExcelOrder?: boolean;
  rankOptions?: { id: RankMode; label: string; icon: string }[];
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="min-w-0 text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
        {title}
        {count != null ? (
          <span className="ml-1.5 font-normal text-[#86868b]">{count}</span>
        ) : null}
      </h2>
      <ShelfRankSelect
        value={rankMode}
        onChange={onRankChange}
        showExcelOrder={showExcelOrder}
        options={rankOptions}
      />
    </div>
  );
}
