import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 专家平台页（Tool / Memory / Workflow / Studio）统一外壳 */
export function StudioPage({
  tip,
  children,
}: {
  tip?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="studio-page">
      {tip && <div className="studio-tip-banner">{tip}</div>}
      <div className="studio-workspace">{children}</div>
    </div>
  );
}

export function StudioListPanelHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="studio-list-panel-header">
      <h2 className="studio-list-panel-title">{title}</h2>
      {subtitle && <p className="studio-list-panel-subtitle">{subtitle}</p>}
    </div>
  );
}

export function StudioEmptyState({
  icon = 'fa-layer-group',
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="studio-empty">
      <div className="studio-empty-icon">
        <i className={cn('fa-solid text-lg text-zinc-600', icon)} />
      </div>
      <p className="text-[14px] font-medium text-zinc-900">{title}</p>
      {hint && <p className="max-w-xs text-center text-[12px] leading-relaxed text-zinc-500">{hint}</p>}
    </div>
  );
}

export function StudioFilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('studio-filter-chip', active && 'active')}
    >
      {label}
    </button>
  );
}

export function StudioToolbar({
  icon,
  title,
  badge,
  actions,
}: {
  icon?: string;
  title: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="studio-toolbar">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <i className={cn('fa-solid text-zinc-600', icon)} />}
        <span className="truncate text-[13px] font-semibold text-zinc-900">{title}</span>
        {badge && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
            {badge}
          </span>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StudioCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('apple-card p-4', className)}>{children}</div>;
}
