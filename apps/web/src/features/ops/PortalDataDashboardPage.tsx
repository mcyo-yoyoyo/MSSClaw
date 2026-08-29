import { useEffect, useMemo } from 'react';
import { CenterPageHeader, StatCardGrid } from '@/components/center/CenterShell';
import { isSystemAdmin } from '@/domain/currentUser';
import { buildPortalEngagementMetrics } from '@/domain/portalEngagementMetrics';
import { PortalTrafficPanel } from '@/features/ops/PortalTrafficPanel';
import { useAppViewStore } from '@/stores/appViewStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function formatCount(value: number): string {
  return Math.max(0, value).toLocaleString('zh-CN');
}

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
  const skills = useMarketplaceStore((state) => state.skills);
  const agents = useMarketplaceStore((state) => state.agents);
  const marketplaceReady = useMarketplaceStore((state) => state.ready);
  const marketplaceLoadError = useMarketplaceStore((state) => state.loadError);
  const engagementById = useContentEngagementStore((state) => state.byId);
  const engagementHydrated = useContentEngagementStore((state) => state.hydrated);
  const hydrateEngagement = useContentEngagementStore((state) => state.hydrate);
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);

  useEffect(() => {
    hydrateEngagement();
  }, [hydrateEngagement, workspaceId]);

  const engagementMetrics = useMemo(
    () =>
      buildPortalEngagementMetrics(
        {
          tools: tools.filter((item) => item.published !== false).map((item) => item.id),
          skills: skills.filter((item) => item.published !== false).map((item) => item.id),
          agents: agents.filter((item) => item.published !== false).map((item) => item.id),
        },
        engagementById,
      ),
    [agents, engagementById, skills, tools],
  );

  const engagementLoading = !marketplaceReady || !engagementHydrated;

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="数据看板"
          subtitle="门户访问与工具、Skill、Agent 内容互动概览"
          tip={
            <>
              PV / UV 可按统计周期和访客身份切换；内容互动统计当前工作区已发布资产，展示上线以来累计值。
            </>
          }
        />

        <PortalTrafficPanel />

        <section className="mt-6 space-y-4" aria-labelledby="portal-engagement-title">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
            <div>
              <h3 id="portal-engagement-title" className="text-[14px] font-semibold text-zinc-900">
                内容互动（累计）
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                统计当前工作区已发布的工具、Skill 与 Agent；不随上方访问统计周期切换。
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
              累计口径
            </span>
          </div>

          {marketplaceLoadError ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-800"
            >
              <i className="fa-solid fa-triangle-exclamation mr-2 text-[11px]" />
              内容目录读取失败，互动汇总可能不完整。
            </div>
          ) : null}

          {engagementLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="内容互动数据读取中">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="apple-card animate-pulse p-3">
                  <div className="h-2.5 w-16 rounded bg-zinc-100" />
                  <div className="mt-3 h-6 w-24 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <StatCardGrid
                items={[
                  ['已发布资产', formatCount(engagementMetrics.total.assetCount)],
                  ['累计点赞', formatCount(engagementMetrics.total.likes)],
                  ['累计点踩', formatCount(engagementMetrics.total.dislikes)],
                  ['累计收藏', formatCount(engagementMetrics.total.favorites)],
                ]}
              />

              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[12px]">
                    <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">内容类型</th>
                        <th className="px-4 py-2.5 text-right font-semibold">已发布</th>
                        <th className="px-4 py-2.5 text-right font-semibold">点赞</th>
                        <th className="px-4 py-2.5 text-right font-semibold">点踩</th>
                        <th className="px-4 py-2.5 text-right font-semibold">收藏</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engagementMetrics.rows.map((row) => (
                        <tr key={row.kind} className="border-b border-zinc-50 last:border-0">
                          <td className="px-4 py-3 font-semibold text-zinc-800">{row.label}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                            {formatCount(row.assetCount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                            {formatCount(row.likes)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                            {formatCount(row.dislikes)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                            {formatCount(row.favorites)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-zinc-100 bg-zinc-50/70 font-semibold text-zinc-800">
                      <tr>
                        <td className="px-4 py-2.5">合计</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCount(engagementMetrics.total.assetCount)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCount(engagementMetrics.total.likes)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCount(engagementMetrics.total.dislikes)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCount(engagementMetrics.total.favorites)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function PortalDataDashboardPage() {
  if (!isSystemAdmin()) return <DashboardAccessDenied />;
  return <PortalDataDashboardContent />;
}
