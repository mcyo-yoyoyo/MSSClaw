/**
 * [INPUT]: 接收栏目、当前选中项和切换回调。
 * [OUTPUT]: 导出 MarketDetailTabs 和 MarketDetailTab。
 * [POS]: Skill 与 Agent 详情共用文字标签、选中态和状态角标。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import { cn } from '@/lib/utils';

export interface MarketDetailTab<Id extends string> {
  id: Id;
  label: string;
  badge?: string;
}

export function MarketDetailTabs<Id extends string>({
  label, tabs, activeTab, onSelect, className,
}: {
  label: string;
  tabs: readonly MarketDetailTab<Id>[];
  activeTab: Id;
  onSelect: (id: Id) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn('flex min-w-0 shrink-0 gap-1 overflow-x-auto border-b border-zinc-100 px-4 pt-3 md:px-5', className)}
    >
      {tabs.map(({ id, label, badge }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-current={activeTab === id ? 'page' : undefined}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3.5 py-2 text-[12px] font-semibold transition',
            activeTab === id
              ? 'bg-white text-zinc-900 shadow-[inset_0_-2px_0_0_#18181b]'
              : 'text-zinc-400 hover:text-zinc-700',
          )}
        >
          {label}
          {badge && (
            <span className="rounded bg-zinc-100 px-1 py-px text-[9px] font-medium text-zinc-400">{badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
