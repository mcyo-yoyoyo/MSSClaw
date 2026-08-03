import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { listVisibleBusinessScenarioCategories } from '@/domain/businessScenarios';
import { getDeptLabel, getRegionLabel, type DeptId, type RegionId } from '@/domain/orgTaxonomy';
import {
  clampOrgPerspectiveSelection,
  emptyOrgPerspectiveSelection,
  getScopedDeptFilterOptions,
  getScopedRegionFilterOptions,
  isOrgPerspectiveEmpty,
} from '@/domain/orgAxisTags';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';

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
        'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] font-medium transition',
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
 * 市场面左栏：领域 · 区域 · 场景（数据维度，非导航菜单）
 * 三者均为单选，默认「全部」
 */
export function SidebarMarketFilters({ collapsed }: { collapsed: boolean }) {
  const user = useSessionStore((s) => s.user);
  const orgSelection = useMarketFilterStore((s) => s.orgSelection);
  const businessFilter = useMarketFilterStore((s) => s.businessFilter);
  const setOrgSelection = useMarketFilterStore((s) => s.setOrgSelection);
  const setBusinessFilter = useMarketFilterStore((s) => s.setBusinessFilter);
  const reset = useMarketFilterStore((s) => s.reset);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const favoriteCount = useMarketFavoriteStore((s) => s.items.length);
  const hydrateFavorites = useMarketFavoriteStore((s) => s.hydrate);

  useEffect(() => {
    hydrateFavorites();
  }, [hydrateFavorites]);

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
  const scenarios = listVisibleBusinessScenarioCategories();

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

  const filtersActive =
    !isOrgPerspectiveEmpty(orgSelection) || businessFilter !== 'all';

  const selectedDept = orgSelection.dept[0] ?? null;
  const selectedRegion = orgSelection.region[0] ?? null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={reset}
        className={cn('wb-nav-item', filtersActive && 'active')}
        title={filtersActive ? '筛选中 · 点击重置为全部' : '领域 / 区域 / 场景'}
      >
        <i className="fa-solid fa-layer-group w-5 text-center text-[15px]" />
        <span className="nav-label">维度</span>
      </button>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-semibold tracking-[0.06em] text-zinc-400">
          维度
        </p>
        {filtersActive ? (
          <button
            type="button"
            onClick={() => {
              setOrgSelection(emptyOrgPerspectiveSelection());
              setBusinessFilter('all');
            }}
            className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            重置
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-hidden pb-2">
        <section>
          <p className="mb-1 px-2 text-[11px] font-semibold text-zinc-500">领域</p>
          <div className="space-y-0.5">
            <DimRow
              label="全部"
              active={!selectedDept}
              onClick={() => setOrgSelection({ ...orgSelection, dept: [] })}
            />
            {deptOptions.map((id) => (
              <DimRow
                key={id}
                label={getDeptLabel(id)}
                active={selectedDept === id}
                onClick={() =>
                  setOrgSelection({ ...orgSelection, dept: [id as DeptId] })
                }
              />
            ))}
          </div>
        </section>

        {regionOptions.length > 0 ? (
          <section>
            <p className="mb-1 px-2 text-[11px] font-semibold text-zinc-500">区域</p>
            <div className="space-y-0.5">
              <DimRow
                label="全部"
                active={!selectedRegion}
                onClick={() => setOrgSelection({ ...orgSelection, region: [] })}
              />
              {regionOptions.map((id) => (
                <DimRow
                  key={id}
                  label={getRegionLabel(id)}
                  active={selectedRegion === id}
                  onClick={() =>
                    setOrgSelection({ ...orgSelection, region: [id as RegionId] })
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <p className="mb-1 px-2 text-[11px] font-semibold text-zinc-500">场景</p>
          <div className="space-y-0.5">
            <DimRow
              label="全部"
              active={businessFilter === 'all'}
              onClick={() => setBusinessFilter('all')}
            />
            {scenarios.map((c) => (
              <DimRow
                key={c.id}
                label={c.label}
                title={c.blurb}
                active={businessFilter === c.id}
                onClick={() => setBusinessFilter(c.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => {
          useHomeStore.getState().setHomeMode('portal');
          setAppView('home');
          // 滚动到收藏区由首页锚点承接
          window.requestAnimationFrame(() => {
            document.getElementById('home-favorites')?.scrollIntoView({ behavior: 'smooth' });
          });
        }}
        className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-2 py-1.5 text-left text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50"
      >
        <i className="fa-solid fa-bookmark text-[10px] text-zinc-400" />
        <span className="min-w-0 flex-1 truncate">收藏</span>
        {favoriteCount > 0 ? (
          <span className="tabular-nums text-[10px] text-zinc-400">{favoriteCount}</span>
        ) : null}
      </button>
    </div>
  );
}
