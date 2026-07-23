import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { SKILL_ROLE_CATEGORIES } from '@/domain/skillRoles';
import {
  DEPT_FILTER_OPTIONS,
  emptyOrgPerspectiveSelection,
  isOrgPerspectiveEmpty,
  REGION_FILTER_OPTIONS,
  selectionSummaryLabel,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { HOME_FILTER_TRIGGER_CLASS } from '@/components/home/homeFilterChrome';

type AxisKey = 'global' | 'region' | 'dept';

const AXIS_META: { key: AxisKey; label: string }[] = [
  { key: 'region', label: '区域' },
  { key: 'dept', label: '领域' },
  { key: 'global', label: '数字员工' },
];

interface OrgPerspectiveFilterProps {
  value: OrgPerspectiveSelection;
  onChange: (next: OrgPerspectiveSelection) => void;
}

export function OrgPerspectiveFilter({ value, onChange }: OrgPerspectiveFilterProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<AxisKey, boolean>>({
    region: true,
    dept: false,
    global: false,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggleAxis = (axis: AxisKey) => {
    setExpanded((s) => ({ ...s, [axis]: !s[axis] }));
  };

  const toggleItem = (axis: AxisKey, id: string) => {
    const key = axis === 'global' ? 'global' : axis === 'region' ? 'region' : 'dept';
    const list = value[key] as string[];
    const nextList = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    onChange({ ...value, [key]: nextList } as OrgPerspectiveSelection);
  };

  const clearAll = () => onChange(emptyOrgPerspectiveSelection());

  const childrenOf = (axis: AxisKey): { id: string; label: string }[] => {
    if (axis === 'global') {
      return SKILL_ROLE_CATEGORIES.map((r) => ({ id: r.id, label: r.label }));
    }
    if (axis === 'region') {
      return REGION_FILTER_OPTIONS.map((id) => ({ id, label: getRegionLabel(id) }));
    }
    return DEPT_FILTER_OPTIONS.map((id) => ({ id, label: getDeptLabel(id) }));
  };

  const selectedIds = (axis: AxisKey): string[] => {
    if (axis === 'global') return value.global;
    if (axis === 'region') return value.region;
    return value.dept;
  };

  const summary = selectionSummaryLabel(value);
  const empty = isOrgPerspectiveEmpty(value);

  return (
    <div ref={rootRef} className="relative w-[112px] shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          HOME_FILTER_TRIGGER_CLASS,
          open || !empty
            ? 'border-zinc-300 text-zinc-800'
            : 'border-zinc-200/90 text-zinc-700 hover:border-zinc-300',
        )}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <i
          className={cn(
            'fa-solid fa-chevron-down shrink-0 text-[8px] text-zinc-400 transition',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-lg shadow-zinc-900/8">
          <div className="flex items-center justify-between border-b border-zinc-100 px-2.5 py-2">
            <span className="text-[11px] font-semibold text-zinc-800">视角筛选</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-medium text-zinc-400 transition hover:text-zinc-700"
            >
              清空
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {AXIS_META.map((axis) => {
              const kids = childrenOf(axis.key);
              const selected = selectedIds(axis.key);
              const isOpen = expanded[axis.key];
              return (
                <div key={axis.key} className="border-b border-zinc-50 last:border-0">
                  <button
                    type="button"
                    onClick={() => toggleAxis(axis.key)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-zinc-50"
                  >
                    <i
                      className={cn(
                        'fa-solid text-[8px] text-zinc-400 transition',
                        isOpen ? 'fa-chevron-down' : 'fa-chevron-right',
                      )}
                    />
                    <span className="text-[11px] font-semibold text-zinc-800">{axis.label}</span>
                    {selected.length ? (
                      <span className="ml-auto rounded-full bg-zinc-100 px-1.5 py-px text-[9px] font-medium text-zinc-500">
                        {selected.length}
                      </span>
                    ) : null}
                  </button>
                  {isOpen ? (
                    <div className="space-y-0.5 px-2 pb-1.5 pl-7">
                      {kids.map((item) => {
                        const checked = selected.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-zinc-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleItem(axis.key, item.id)}
                              className="h-3 w-3 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                            />
                            <span className="text-[11px] text-zinc-700">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
