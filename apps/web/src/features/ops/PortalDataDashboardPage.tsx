import { useEffect, useMemo } from 'react';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { isSystemAdmin } from '@/domain/currentUser';
import { buildPortalToolInventory } from '@/domain/portalToolInventory';
import { PortalTrafficPanel } from '@/features/ops/PortalTrafficPanel';
import { useAppViewStore } from '@/stores/appViewStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function DashboardAccessDenied() {
  const setAppView = useAppViewStore((state) => state.setAppView);
  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
          <i className="fa-solid fa-lock text-xl" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900">无权访问数据看板</h2>
        <p className="mt-2 text-[13px] text-zinc-500">仅系统管理员可查看门户与内容运营数据。</p>
        <button
          type="button"
          onClick={() => setAppView('home')}
          className="apple-btn-secondary mt-6 rounded-lg px-4 py-2 text-[12px] font-semibold"
        >
          返回工作台
        </button>
      </div>
    </div>
  );
}

function PortalDataDashboardContent() {
  const tools = useMarketplaceStore((state) => state.tools);
  const marketplaceReady = useMarketplaceStore((state) => state.ready);
  const marketplaceLoadError = useMarketplaceStore((state) => state.loadError);
  const officeScenes = useInternalOfficeSceneCatalogStore((state) => state.entries);
  const officeScenesLoaded = useInternalOfficeSceneCatalogStore((state) => state.loaded);
  const officeScenesLoading = useInternalOfficeSceneCatalogStore((state) => state.loading);
  const officeScenesToast = useInternalOfficeSceneCatalogStore((state) => state.toast);
  const officeScenesToastTone = useInternalOfficeSceneCatalogStore((state) => state.toastTone);
  const hydrateOfficeScenes = useInternalOfficeSceneCatalogStore((state) => state.hydrate);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);

  useEffect(() => {
    void hydrateOfficeScenes(workspaceId);
  }, [hydrateOfficeScenes, workspaceId]);

  const inventory = useMemo(
    () => buildPortalToolInventory(tools, officeScenes),
    [officeScenes, tools],
  );

  const inventoryError =
    marketplaceLoadError ||
    (officeScenesToastTone === 'error' ? officeScenesToast : null);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl pb-8">
        <CenterPageHeader
          title="数据看板"
          subtitle="平台总览、用户分析、工具 / Skill / Agent 资产与交互行为"
          tip={
            <>
              按黑色指标展示平台、用户、资产、交互与调用事实；灰色指标暂不纳入，未采集字段明确标记。
            </>
          }
        />

        <PortalTrafficPanel
          inventory={inventory}
          inventoryLoading={
            !inventoryError && (!marketplaceReady || officeScenesLoading || !officeScenesLoaded)
          }
          inventoryError={inventoryError}
        />
      </div>
    </div>
  );
}

export function PortalDataDashboardPage() {
  if (!isSystemAdmin()) return <DashboardAccessDenied />;
  return <PortalDataDashboardContent />;
}
