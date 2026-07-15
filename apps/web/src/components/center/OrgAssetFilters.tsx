import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { HQ_DEPTS, REGIONS } from '@/domain/orgTaxonomy';
import {
  ASSET_SCOPE_OPTIONS,
  type AssetScopeFilter,
  type DeptFilter,
  type EfficiencyFilter,
  type RegionFilter,
  EFFICIENCY_FILTER_OPTIONS,
} from '@/domain/assetFilters';

interface OrgAssetFilterBarProps {
  deptFilter: DeptFilter;
  regionFilter: RegionFilter;
  efficiencyFilter?: EfficiencyFilter;
  scopeFilter?: AssetScopeFilter;
  onDeptChange: (v: DeptFilter) => void;
  onRegionChange: (v: RegionFilter) => void;
  onEfficiencyChange?: (v: EfficiencyFilter) => void;
  onScopeChange?: (v: AssetScopeFilter) => void;
  /** 是否展示「范围」行（外部/内部等），默认不展示 */
  showScope?: boolean;
  /** 默认折叠为摘要，点击展开双轴筛选 */
  collapsible?: boolean;
  extra?: ReactNode;
}

/** 能力沉淀统一筛选：默认折叠摘要，展开后职能+区域一行，提效场景+范围一行 */
export function OrgAssetFilterBar({
  deptFilter,
  regionFilter,
  efficiencyFilter = 'all',
  scopeFilter = 'all',
  onDeptChange,
  onRegionChange,
  onEfficiencyChange,
  onScopeChange,
  showScope = false,
  collapsible = true,
  extra,
}: OrgAssetFilterBarProps) {
  const [open, setOpen] = useState(!collapsible);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (deptFilter !== 'all') {
      parts.push(HQ_DEPTS.find((d) => d.id === deptFilter)?.label ?? deptFilter);
    }
    if (regionFilter !== 'all') {
      parts.push(REGIONS.find((r) => r.id === regionFilter)?.label ?? regionFilter);
    }
    if (onEfficiencyChange && efficiencyFilter !== 'all') {
      parts.push(
        EFFICIENCY_FILTER_OPTIONS.find((o) => o.id === efficiencyFilter)?.label ?? efficiencyFilter,
      );
    }
    if (showScope && onScopeChange && scopeFilter !== 'all') {
      parts.push(ASSET_SCOPE_OPTIONS.find((o) => o.id === scopeFilter)?.label ?? scopeFilter);
    }
    return parts.length ? parts.join(' · ') : '全部';
  }, [
    deptFilter,
    regionFilter,
    efficiencyFilter,
    scopeFilter,
    onEfficiencyChange,
    showScope,
    onScopeChange,
  ]);

  const filters = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[10px] font-semibold text-zinc-400">职能</span>
          <button
            type="button"
            onClick={() => onDeptChange('all')}
            className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', deptFilter === 'all' && 'active')}
          >
            全部
          </button>
          {HQ_DEPTS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDeptChange(d.id)}
              className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', deptFilter === d.id && 'active')}
            >
              {d.label}
            </button>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[10px] font-semibold text-zinc-400">区域</span>
          <button
            type="button"
            onClick={() => onRegionChange('all')}
            className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', regionFilter === 'all' && 'active')}
          >
            全部
          </button>
          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRegionChange(r.id)}
              className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', regionFilter === r.id && 'active')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {(onEfficiencyChange || (showScope && onScopeChange) || extra) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {onEfficiencyChange ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[10px] font-semibold text-zinc-400">提效场景</span>
              {EFFICIENCY_FILTER_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onEfficiencyChange(o.id)}
                  className={cn(
                    'filter-chip px-2.5 py-1 text-[11px] font-medium',
                    efficiencyFilter === o.id && 'active',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : null}
          {showScope && onScopeChange ? (
            <>
              {onEfficiencyChange ? (
                <span className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-[10px] font-semibold text-zinc-400">范围</span>
                {ASSET_SCOPE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onScopeChange(o.id)}
                    className={cn(
                      'filter-chip px-2.5 py-1 text-[11px] font-medium',
                      scopeFilter === o.id && 'active',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {extra}
        </div>
      )}
    </div>
  );

  if (!collapsible) {
    return <div className="mb-4">{filters}</div>;
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 text-left text-[12px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
      >
        <i className="fa-solid fa-sliders text-[10px] text-zinc-400" />
        <span className="truncate">
          筛选 · <span className="text-zinc-500">{summary}</span>
        </span>
        <i
          className={cn(
            'fa-solid text-[9px] text-zinc-400',
            open ? 'fa-chevron-up' : 'fa-chevron-down',
          )}
        />
      </button>
      {open ? <div className="mt-2">{filters}</div> : null}
    </div>
  );
}

type DeptIdLike = string;

/** 编辑表单：归属字段块 */
export function OwnershipFormFields({
  ownerDeptIds,
  ownerRegionId,
  sourceType,
  visibility,
  homepageUrl,
  onChange,
}: {
  ownerDeptIds: DeptIdLike[];
  ownerRegionId: string | null;
  sourceType: 'internal' | 'external';
  visibility: 'public' | 'org' | 'private';
  homepageUrl?: string;
  onChange: (patch: {
    ownerDeptIds?: DeptIdLike[];
    ownerRegionId?: string | null;
    sourceType?: 'internal' | 'external';
    visibility?: 'public' | 'org' | 'private';
    homepageUrl?: string;
  }) => void;
}) {
  const toggleDept = (id: string) => {
    const next = ownerDeptIds.includes(id)
      ? ownerDeptIds.filter((d) => d !== id)
      : [...ownerDeptIds, id];
    onChange({ ownerDeptIds: next });
  };

  return (
    <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#fafafa]/80 p-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-zinc-600">归属职能</p>
        <div className="flex flex-wrap gap-1.5">
          {HQ_DEPTS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDept(d.id)}
              className={cn(
                'rounded-lg border px-2 py-1 text-[11px]',
                ownerDeptIds.includes(d.id)
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-zinc-600">归属区域</p>
        <select
          value={ownerRegionId ?? ''}
          onChange={(e) => onChange({ ownerRegionId: e.target.value || null })}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px]"
        >
          <option value="">不限区域</option>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-zinc-600">
          来源
          <select
            value={sourceType}
            onChange={(e) =>
              onChange({ sourceType: e.target.value as 'internal' | 'external' })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[12px]"
          >
            <option value="internal">内部</option>
            <option value="external">外部</option>
          </select>
        </label>
        <label className="text-[11px] text-zinc-600">
          可见性
          <select
            value={visibility}
            onChange={(e) =>
              onChange({
                visibility: e.target.value as 'public' | 'org' | 'private',
              })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[12px]"
          >
            <option value="public">公开</option>
            <option value="org">组织内</option>
            <option value="private">私有</option>
          </select>
        </label>
      </div>
      {sourceType === 'external' ? (
        <label className="block text-[11px] text-zinc-600">
          官网 / 深链
          <input
            value={homepageUrl ?? ''}
            onChange={(e) => onChange({ homepageUrl: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-[12px]"
            placeholder="https://"
          />
        </label>
      ) : null}
    </div>
  );
}
