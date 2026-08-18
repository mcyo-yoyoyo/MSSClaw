import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getDeptLabel, getRegionLabel, type DeptId, type RegionId } from '@/domain/orgTaxonomy';
import {
  clampOrgPerspectiveSelection,
  getScopedDeptFilterOptions,
  getScopedRegionFilterOptions,
  isOrgPerspectiveEmpty,
} from '@/domain/orgAxisTags';
import { openMssMarketHub } from '@/domain/openHomeJourney';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import type { AppView } from '@/domain/appView';

/** 这些页面上，领域/区域不筛本页，而是跳转 MSS 工具集市 */
const ORG_NAV_JUMP_VIEWS: AppView[] = [
  'home',
  'market-external',
  'market-internal',
];

function DimRow({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[13px] font-medium leading-snug transition',
        active
          ? 'bg-zinc-100 text-zinc-800'
          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          active ? 'bg-zinc-400' : 'bg-transparent',
        )}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * 市场面左栏：领域 · 区域（数据轴）
 * - 首页 / 外部精选 / 公司推荐：点击具体项 → 跳转 AI工具Hub
 * - AI工具Hub：页内筛选
 * 场景已迁入 MSS 页面分类卡
 */
export function SidebarMarketFilters({ collapsed }: { collapsed: boolean }) {
  const user = useSessionStore((s) => s.user);
  const appView = useAppViewStore((s) => s.appView);
  const toggleSidebar = useAppViewStore((s) => s.toggleSidebar);
  const orgSelection = useMarketFilterStore((s) => s.orgSelection);
  const setOrgSelection = useMarketFilterStore((s) => s.setOrgSelection);

  const jumpToMss = ORG_NAV_JUMP_VIEWS.includes(appView);

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

  useEffect(() => {
    const next = clampOrgPerspectiveSelection(orgSelection, affiliation, user?.platformRole);
    if (
      next.dept.join() !== orgSelection.dept.join() ||
      next.region.join() !== orgSelection.region.join()
    ) {
      setOrgSelection(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliation.deptIds.join(','), affiliation.regionId, user?.platformRole]);

  const filtersActive = !isOrgPerspectiveEmpty(orgSelection);
  const selectedDept = orgSelection.dept[0] ?? null;
  const selectedRegion = orgSelection.region[0] ?? null;

  const selectDept = (deptId: DeptId | null) => {
    if (jumpToMss) {
      if (!deptId) {
        setOrgSelection({ ...orgSelection, dept: [] });
        return;
      }
      openMssMarketHub({ deptId, regionId: null });
      return;
    }
    setOrgSelection({
      ...orgSelection,
      dept: deptId ? [deptId] : [],
    });
  };

  const selectRegion = (regionId: RegionId | null) => {
    if (jumpToMss) {
      if (!regionId) {
        setOrgSelection({ ...orgSelection, region: [] });
        return;
      }
      openMssMarketHub({ deptId: null, regionId });
      return;
    }
    setOrgSelection({
      ...orgSelection,
      region: regionId ? [regionId] : [],
    });
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn('wb-nav-item', filtersActive && 'active')}
        title={filtersActive ? '筛选中 · 点击展开筛选' : '展开领域 / 区域筛选'}
      >
        <i className="fa-solid fa-layer-group w-5 text-center text-[15px]" />
        <span className="nav-label">筛选</span>
      </button>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col justify-start gap-3 overflow-hidden pt-1">
        <section className="shrink-0">
          <div className="space-y-0.5">
            <DimRow
              label="全部领域"
              active={!selectedDept}
              onClick={() => selectDept(null)}
            />
            {deptOptions.map((id) => (
              <DimRow
                key={id}
                label={getDeptLabel(id)}
                active={selectedDept === id}
                onClick={() => selectDept(id as DeptId)}
              />
            ))}
          </div>
        </section>

        <section className="shrink-0 border-t border-zinc-100 pt-3">
          <div className="space-y-0.5">
            <DimRow
              label="全部区域"
              active={!selectedRegion}
              onClick={() => selectRegion(null)}
            />
            {regionOptions.map((id) => (
              <DimRow
                key={id}
                label={getRegionLabel(id)}
                active={selectedRegion === id}
                onClick={() => selectRegion(id as RegionId)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
