import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { SKILL_ROLE_CATEGORIES } from '@/domain/skillRoles';
import {
  clampOrgPerspectiveSelection,
  emptyOrgPerspectiveSelection,
  getScopedDeptFilterOptions,
  getScopedRegionFilterOptions,
  isOrgPerspectiveEmpty,
  selectionSummaryLabel,
  type OrgPerspectiveSelection,
} from '@/domain/orgAxisTags';
import { HOME_FILTER_TRIGGER_CLASS } from '@/components/home/homeFilterChrome';
import { useSessionStore } from '@/stores/sessionStore';

type AxisKey = 'global' | 'region' | 'dept';

/** 从左到右：领域 → 区域 → 全球 */
const AXIS_META: { key: AxisKey; label: string }[] = [
  { key: 'dept', label: '领域' },
  { key: 'region', label: '区域' },
  { key: 'global', label: '全球' },
];

interface OrgPerspectiveFilterProps {
  value: OrgPerspectiveSelection;
  onChange: (next: OrgPerspectiveSelection) => void;
}

export function OrgPerspectiveFilter({ value, onChange }: OrgPerspectiveFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const user = useSessionStore((s) => s.user);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const deptOptions = useMemo(
    () => getScopedDeptFilterOptions(affiliation, user?.platformRole),
    [affiliation, user?.platformRole],
  );
  const regionOptions = useMemo(
    () => getScopedRegionFilterOptions(affiliation, user?.platformRole),
    [affiliation, user?.platformRole],
  );

  const valueRef = useRef(value);
  valueRef.current = value;

  // 登录归属变化时，裁掉越权勾选（全球轴由父级在换账号时清空）
  useEffect(() => {
    const current = valueRef.current;
    const next = clampOrgPerspectiveSelection(current, affiliation, user?.platformRole);
    if (
      next.dept.join() !== current.dept.join() ||
      next.region.join() !== current.region.join()
    ) {
      onChange(next);
    }
  }, [
    affiliation.deptIds.join(','),
    affiliation.regionId,
    user?.platformRole,
    onChange,
  ]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

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
      return regionOptions.map((id) => ({ id, label: getRegionLabel(id) }));
    }
    return deptOptions.map((id) => ({ id, label: getDeptLabel(id) }));
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
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-max max-w-[min(92vw,300px)] overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-lg shadow-zinc-900/8">
          <div className="flex items-center justify-between border-b border-zinc-100 px-2 py-1.5">
            <span className="text-[12px] font-semibold text-zinc-800">视角筛选</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700"
            >
              清空
            </button>
          </div>
          <div className="flex divide-x divide-zinc-100">
            {AXIS_META.map((axis) => {
              const kids = childrenOf(axis.key);
              const selected = selectedIds(axis.key);
              return (
                <div key={axis.key} className="w-[88px] shrink-0 px-1 py-1">
                  <div className="mb-0.5 flex items-center gap-0.5">
                    <span className="text-[12px] font-semibold text-zinc-800">{axis.label}</span>
                    {selected.length ? (
                      <span className="rounded-full bg-zinc-100 px-1 py-px text-[9px] font-medium text-zinc-500">
                        {selected.length}
                      </span>
                    ) : null}
                  </div>
                  {kids.length === 0 ? (
                    <p className="text-[11px] leading-snug text-zinc-400">
                      {axis.key === 'region'
                        ? '机关岗'
                        : axis.key === 'dept'
                          ? '无所属领域'
                          : '暂无'}
                    </p>
                  ) : (
                    <div className="space-y-0">
                      {kids.map((item) => {
                        const checked = selected.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-center gap-1 rounded py-px transition hover:bg-zinc-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleItem(axis.key, item.id)}
                              className="h-3 w-3 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                            />
                            <span className="truncate text-[11px] leading-tight text-zinc-700">
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="border-t border-zinc-50 px-2 py-1 text-[10px] leading-snug text-zinc-400">
            空选=全部；领域/区域为浏览筛选（短期不做数据权限裁剪）
          </p>
        </div>
      ) : null}
    </div>
  );
}
