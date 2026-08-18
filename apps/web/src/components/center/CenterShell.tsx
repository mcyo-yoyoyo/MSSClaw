import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CenterModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** 弹层宽度：fullscreen 近全屏；2xl 适合 Skill 详情；xl 通用大弹层 */
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'fullscreen';
  /** 叠在其它弹层之上（如详情→编辑） */
  elevate?: boolean;
  /** 覆盖默认标题区（如自定义 Hero） */
  header?: ReactNode;
  /** 内容较少时让弹窗高度随内容收缩，超过视口后再滚动 */
  fitContent?: boolean;
}

export function CenterModal({
  open,
  title,
  onClose,
  children,
  actions,
  size = 'md',
  elevate = false,
  header,
  fitContent = false,
}: CenterModalProps) {
  if (!open) return null;

  const fullscreen = size === 'fullscreen';
  const wide = size === 'xl' || size === '2xl';
  const widthClass = fullscreen
    ? 'h-[min(96vh,calc(100%-1rem))] max-h-none max-w-none'
    : size === '2xl'
      ? fitContent
        ? 'max-h-[94vh] max-w-6xl'
        : 'h-[min(94vh,920px)] max-w-6xl'
      : size === 'xl'
        ? fitContent
          ? 'max-h-[92vh] max-w-5xl'
          : 'h-[min(92vh,880px)] max-w-5xl'
        : size === 'lg'
          ? 'max-h-[85vh] max-w-2xl'
          : 'max-h-[85vh] max-w-lg';

  return (
    <div
      className={cn(
        'modal-backdrop fixed inset-0 flex items-center justify-center',
        fullscreen ? 'bg-black/55 p-2 md:p-3' : 'p-4',
        elevate ? 'z-[120]' : 'z-[100]',
      )}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg',
          widthClass,
        )}
      >
        {header ?? (
          <div
            className={cn(
              'flex shrink-0 items-center justify-between border-b border-black/[0.06]',
              fullscreen || wide ? 'px-5 py-3' : 'px-5 py-4',
            )}
          >
            <h3 className="truncate text-[15px] font-semibold text-[#1d1d1f]">{title}</h3>
            <button type="button" onClick={onClose} className="text-[#86868b] transition hover:text-[#1d1d1f]">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
        <div
          className={cn(
            fullscreen
              ? 'min-h-0 flex-1 overflow-hidden p-3 md:p-4'
              : wide
                ? 'min-h-0 flex-1 overflow-y-auto p-0'
                : 'max-h-[60vh] overflow-y-auto p-5',
          )}
        >
          {children}
        </div>
        {actions && (
          <div
            className={cn(
              'flex w-full shrink-0 items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa]/50',
              fullscreen || wide ? 'px-5 py-3' : 'px-5 py-4',
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface CenterPageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  /** 标题旁的快速上手提示（悬停/点击展开） */
  tip?: ReactNode;
}

export function CenterPageHeader({ title, subtitle, actions, tip }: CenterPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div className="max-w-2xl">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">MSS Claw</p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]">{title}</h2>
          {tip ? <HeaderQuickTip>{tip}</HeaderQuickTip> : null}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function HeaderQuickTip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
          open
            ? 'border-claw-600/30 bg-claw-50 text-claw-700'
            : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800',
        )}
        aria-expanded={open}
        aria-label="快速上手"
      >
        <i className="fa-solid fa-lightbulb text-[9px]" />
        快速上手
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(320px,80vw)] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-zinc-600 shadow-lg">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-zinc-400">快速上手</p>
          <div className="learning-callout-inline">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

const EFFICIENCY_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'office', label: '办公提效' },
  { id: 'manage', label: '管理提效' },
  { id: 'process', label: '流程提效' },
  { id: 'experience', label: '体验提升' },
] as const;

export function EfficiencyFilterChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {EFFICIENCY_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={`filter-chip px-2.5 py-1 text-[11px] font-medium ${value === f.id ? 'active' : ''}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function CenterSearchInput({
  value,
  onChange,
  placeholder,
  className = 'w-full max-w-[12rem] sm:w-48',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`apple-input ${className}`}
    />
  );
}

export function LearningCallout({
  icon = 'fa-lightbulb',
  children,
}: {
  icon?: string;
  children: ReactNode;
}) {
  return (
    <div className="learning-callout">
      <div className="learning-callout-icon">
        <i className={cn('fa-solid', icon)} />
      </div>
      <div className="learning-callout-text">{children}</div>
    </div>
  );
}

/** 各页统计项 4~9 个不等，按最小宽度自适应列数，避免固定列数下末行参差 */
export function StatCardGrid({ items }: { items: [string, string | number][] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
      {items.map(([label, val]) => (
        <div key={label} className="apple-card p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900">{val}</p>
        </div>
      ))}
    </div>
  );
}
