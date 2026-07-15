import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CenterModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

export function CenterModal({ open, title, onClose, children, actions }: CenterModalProps) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-black/5 bg-white shadow-apple-lg">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#86868b] transition hover:text-[#1d1d1f]">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto scroll-hidden p-5">{children}</div>
        {actions && (
          <div className="flex justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa]/50 px-5 py-4">
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
  className = 'w-48',
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

export function StatCardGrid({ items }: { items: [string, string | number][] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map(([label, val]) => (
        <div key={label} className="apple-card p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900">{val}</p>
        </div>
      ))}
    </div>
  );
}
