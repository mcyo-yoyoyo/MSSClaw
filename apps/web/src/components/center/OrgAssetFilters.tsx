import type { ReactNode, SelectHTMLAttributes } from 'react';
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
import {
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';

type ScenarioScopeFilter = 'related' | 'all';

interface OrgAssetFilterBarProps {
  deptFilter: DeptFilter;
  regionFilter: RegionFilter;
  efficiencyFilter?: EfficiencyFilter;
  /** 业务场景分类（与业务用户 MSS 视角对齐） */
  businessFilter?: BusinessScenarioId | 'all';
  scopeFilter?: AssetScopeFilter;
  /** 覆盖默认范围选项（如技能页用可见范围口径） */
  scopeOptions?: { id: AssetScopeFilter; label: string }[];
  /** 场景列表范围：与我相关 / 全部场景（案例样板间） */
  scenarioFilter?: ScenarioScopeFilter;
  onDeptChange: (v: DeptFilter) => void;
  onRegionChange: (v: RegionFilter) => void;
  onEfficiencyChange?: (v: EfficiencyFilter) => void;
  onBusinessChange?: (v: BusinessScenarioId | 'all') => void;
  onScopeChange?: (v: AssetScopeFilter) => void;
  onScenarioFilterChange?: (v: ScenarioScopeFilter) => void;
  /** 是否展示「范围」行，默认不展示 */
  showScope?: boolean;
  /** 默认折叠为摘要，点击展开双轴筛选 */
  collapsible?: boolean;
  extra?: ReactNode;
}

/** 能力沉淀统一筛选：默认折叠摘要；业务场景对齐 MSS 业务用户视角 */
export function OrgAssetFilterBar({
  deptFilter,
  regionFilter,
  efficiencyFilter = 'all',
  businessFilter = 'all',
  scopeFilter = 'all',
  scopeOptions = ASSET_SCOPE_OPTIONS,
  scenarioFilter = 'all',
  onDeptChange,
  onRegionChange,
  onEfficiencyChange,
  onBusinessChange,
  onScopeChange,
  onScenarioFilterChange,
  showScope = false,
  collapsible = true,
  extra,
}: OrgAssetFilterBarProps) {
  // 默认展开：筛选是运营看板的主要操作，收起态需要多点一次才能看到可选项
  const [open, setOpen] = useState(true);
  const businessOptions = useMemo(() => listVisibleBusinessScenarioCategories(), []);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (onScenarioFilterChange) {
      parts.push(scenarioFilter === 'related' ? '与我相关' : '全部场景');
    }
    if (deptFilter !== 'all') {
      parts.push(HQ_DEPTS.find((d) => d.id === deptFilter)?.label ?? deptFilter);
    }
    if (regionFilter !== 'all') {
      parts.push(REGIONS.find((r) => r.id === regionFilter)?.label ?? regionFilter);
    }
    if (onBusinessChange && businessFilter !== 'all') {
      parts.push(
        businessOptions.find((o) => o.id === businessFilter)?.label ?? businessFilter,
      );
    }
    if (onEfficiencyChange && efficiencyFilter !== 'all') {
      parts.push(
        EFFICIENCY_FILTER_OPTIONS.find((o) => o.id === efficiencyFilter)?.label ?? efficiencyFilter,
      );
    }
    if (showScope && onScopeChange && scopeFilter !== 'all') {
      parts.push(scopeOptions.find((o) => o.id === scopeFilter)?.label ?? scopeFilter);
    }
    return parts.length ? parts.join(' · ') : '全部';
  }, [
    deptFilter,
    regionFilter,
    efficiencyFilter,
    businessFilter,
    businessOptions,
    scopeFilter,
    scopeOptions,
    scenarioFilter,
    onEfficiencyChange,
    onBusinessChange,
    onScenarioFilterChange,
    showScope,
    onScopeChange,
  ]);

  const filters = (
    <div className="space-y-2">
      {onScenarioFilterChange ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[10px] font-semibold text-zinc-400">场景</span>
          <button
            type="button"
            onClick={() => onScenarioFilterChange('related')}
            className={cn(
              'filter-chip px-2.5 py-1 text-[11px] font-medium',
              scenarioFilter === 'related' && 'active',
            )}
          >
            与我相关
          </button>
          <button
            type="button"
            onClick={() => onScenarioFilterChange('all')}
            className={cn(
              'filter-chip px-2.5 py-1 text-[11px] font-medium',
              scenarioFilter === 'all' && 'active',
            )}
          >
            全部场景
          </button>
        </div>
      ) : null}
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

      {(onBusinessChange || onEfficiencyChange || (showScope && onScopeChange) || extra) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {onBusinessChange ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[10px] font-semibold text-zinc-400">业务场景</span>
              <button
                type="button"
                onClick={() => onBusinessChange('all')}
                className={cn(
                  'filter-chip px-2.5 py-1 text-[11px] font-medium',
                  businessFilter === 'all' && 'active',
                )}
              >
                全部
              </button>
              {businessOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onBusinessChange(o.id)}
                  className={cn(
                    'filter-chip px-2.5 py-1 text-[11px] font-medium',
                    businessFilter === o.id && 'active',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : null}
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
              {onBusinessChange || onEfficiencyChange ? (
                <span className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-[10px] font-semibold text-zinc-400">范围</span>
                {scopeOptions.map((o) => (
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

function OwnershipSelect({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="group relative">
      <select
        {...props}
        className={cn(
          'w-full appearance-none rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 pr-9 text-[12px] text-zinc-700 shadow-sm outline-none transition',
          'hover:border-zinc-300 hover:bg-zinc-50/60 focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-900/[0.05]',
          className,
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400 transition group-hover:text-zinc-600">
        <i className="fa-solid fa-chevron-down text-[9px]" />
      </span>
    </div>
  );
}

/** 编辑表单：归属字段块 */
export function OwnershipFormFields({
  ownerDeptIds,
  ownerRegionId,
  sourceType,
  visibility,
  homepageUrl,
  alwaysShowHomepage = false,
  singleDept = false,
  lockSource = false,
  onChange,
}: {
  ownerDeptIds: DeptIdLike[];
  ownerRegionId: string | null;
  sourceType: 'internal' | 'external';
  visibility?: 'public' | 'org' | 'private';
  homepageUrl?: string;
  /** 非外部来源也需要访问链接时打开（如内部办公推荐，前台场景卡要跳转） */
  alwaysShowHomepage?: boolean;
  /**
   * 归属职能单选：点选即替换，再点当前项清空。
   * 用于只保留一个职能的场景（如 Skill 提报），避免多选后被截断导致新选项失效。
   */
  singleDept?: boolean;
  /** 来源由入口决定时隐藏来源选择（如“登记外部工具”） */
  lockSource?: boolean;
  onChange: (patch: {
    ownerDeptIds?: DeptIdLike[];
    ownerRegionId?: string | null;
    sourceType?: 'internal' | 'external';
    visibility?: 'public' | 'org' | 'private';
    homepageUrl?: string;
  }) => void;
}) {
  const toggleDept = (id: string) => {
    if (singleDept) {
      onChange({ ownerDeptIds: ownerDeptIds[0] === id ? [] : [id] });
      return;
    }
    const next = ownerDeptIds.includes(id)
      ? ownerDeptIds.filter((d) => d !== id)
      : [...ownerDeptIds, id];
    onChange({ ownerDeptIds: next });
  };

  return (
    <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#fafafa]/80 p-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-zinc-600">
          归属职能
          {singleDept ? (
            <span className="ml-1.5 font-normal text-zinc-400">单选 · 不选则不限</span>
          ) : null}
        </p>
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
        <OwnershipSelect
          value={ownerRegionId ?? ''}
          onChange={(e) => onChange({ ownerRegionId: e.target.value || null })}
        >
          <option value="">—请选择区域—</option>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </OwnershipSelect>
      </div>
      <div className={cn('grid gap-2', lockSource ? 'grid-cols-1' : 'grid-cols-2')}>
        {!lockSource ? (
          <label className="text-[11px] text-zinc-600">
            来源
            <OwnershipSelect
              value={sourceType}
              onChange={(e) =>
                onChange({ sourceType: e.target.value as 'internal' | 'external' })
              }
              className="mt-1"
            >
              <option value="internal">内部</option>
              <option value="external">外部</option>
            </OwnershipSelect>
          </label>
        ) : null}
        <label className="text-[11px] text-zinc-600">
          可见性
          <OwnershipSelect
            value={visibility ?? ''}
            onChange={(e) =>
              onChange({
                visibility: e.target.value as 'public' | 'org' | 'private',
              })
            }
            className="mt-1"
          >
            <option value="" disabled>请选择可见性</option>
            <option value="public">公开可见</option>
            <option value="org">组织内</option>
            <option value="private">仅发布方</option>
          </OwnershipSelect>
        </label>
      </div>
      {sourceType === 'external' || alwaysShowHomepage ? (
        <label className="block text-[11px] text-zinc-600">
          {sourceType === 'external' ? '官网 / 深链' : '访问链接（内网地址 / 深链）'}
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
