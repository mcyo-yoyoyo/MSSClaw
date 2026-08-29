import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchPortalAnalyticsApi,
  type PortalAnalyticsReport,
  type PortalAnalyticsTrafficCounts,
} from '@/api/portalAnalyticsApi';
import { StatCardGrid } from '@/components/center/CenterShell';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type TrafficRangeDays = 1 | 7 | 30;
type TrafficVisitorType = 'all' | 'user' | 'guest';

const TRAFFIC_RANGES: Array<{ days: TrafficRangeDays; label: string }> = [
  { days: 1, label: '今天' },
  { days: 7, label: '近 7 天' },
  { days: 30, label: '近 30 天' },
];

const TRAFFIC_VISITOR_TYPES: Array<{ type: TrafficVisitorType; label: string }> = [
  { type: 'all', label: '全部' },
  { type: 'user', label: '登录' },
  { type: 'guest', label: '游客' },
];

const ROUTE_LABELS: Record<string, string> = {
  home: '首页',
  'ai-brief': 'AI快讯',
  'market-external': '外部工具精选',
  'market-internal': '内部办公推荐',
  'market-projects': 'AI工具Hub',
  'market-tool': '工具详情',
  'ai-map': '场景案例',
  me: '个人中心',
  'ai-tasks': 'AI任务',
  task: '任务记录',
  messages: '我的消息',
  agents: '配置Agent',
  skills: '配置Skill',
  tools: '配置工具',
  'portal-ops': '门户运营',
};

const GATE_ACTION_LABELS: Record<string, string> = {
  like: '点赞',
  dislike: '点踩',
  favorite: '收藏',
  download: '下载',
  'submit-tool': '提交工具',
  'submit-skill': '提交 Skill',
  'submit-agent': '提交 Agent',
  chat: '发起任务',
  account: '进入个人工作台',
};

function formatCount(value: number) {
  return Math.max(0, value).toLocaleString('zh-CN');
}

function formatAverage(pv: number, uv: number) {
  if (uv <= 0) return '—';
  return (pv / uv).toFixed(2);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function formatRangeDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : value;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return '暂无上报';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function routeLabel(routeKey: string) {
  const normalized = routeKey.replace(/^#?\/?/, '');
  return ROUTE_LABELS[normalized] ?? routeKey;
}

function trafficCounts(
  value: PortalAnalyticsTrafficCounts,
  visitorType: TrafficVisitorType,
): { pv: number; uv: number } {
  if (visitorType === 'user') return { pv: value.userPv, uv: value.userUv };
  if (visitorType === 'guest') return { pv: value.guestPv, uv: value.guestUv };
  return { pv: value.pv, uv: value.uv };
}

function trafficLabel(visitorType: TrafficVisitorType): string {
  return TRAFFIC_VISITOR_TYPES.find((item) => item.type === visitorType)?.label ?? '全部';
}

export function PortalTrafficPanel() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);
  const [days, setDays] = useState<TrafficRangeDays>(7);
  const [visitorType, setVisitorType] = useState<TrafficVisitorType>('all');
  const [report, setReport] = useState<PortalAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!apiConnected) {
      setLoading(false);
      setReport(null);
      setError(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setReport(null);

    void fetchPortalAnalyticsApi(workspaceId, days)
      .then((next) => {
        if (active) setReport(next);
      })
      .catch(() => {
        if (active) setError('访问数据读取失败，请稍后重试。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiConnected, days, reloadKey, workspaceId]);

  const dailyRows = useMemo(
    () => [...(report?.series ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [report?.series],
  );
  const pageRows = useMemo(
    () =>
      [...(report?.pages ?? [])]
        .filter((row) => {
          const counts = trafficCounts(row, visitorType);
          return counts.pv > 0 || counts.uv > 0;
        })
        .sort((a, b) => {
          const aCounts = trafficCounts(a, visitorType);
          const bCounts = trafficCounts(b, visitorType);
          return (
            bCounts.pv - aCounts.pv ||
            bCounts.uv - aCounts.uv ||
            a.routeKey.localeCompare(b.routeKey)
          );
        }),
    [report?.pages, visitorType],
  );
  const selectedTotals = report ? trafficCounts(report.totals, visitorType) : null;
  const hasTraffic = Boolean(
    report &&
      (Boolean(selectedTotals && (selectedTotals.pv > 0 || selectedTotals.uv > 0)) ||
        (visitorType !== 'guest' && report.totals.todayLoginUsers > 0) ||
        dailyRows.some((row) => {
          const counts = trafficCounts(row, visitorType);
          return counts.pv > 0 || counts.uv > 0;
        }) ||
        pageRows.some((row) => {
          const counts = trafficCounts(row, visitorType);
          return counts.pv > 0 || counts.uv > 0;
        })),
  );
  const selectedLabel = trafficLabel(visitorType);
  const statItems: [string, string][] = [
    ['登录用户 PV', formatCount(report?.totals.userPv ?? 0)],
    ['登录用户 UV', formatCount(report?.totals.userUv ?? 0)],
    ['游客 PV', formatCount(report?.totals.guestPv ?? 0)],
    ['游客 UV', formatCount(report?.totals.guestUv ?? 0)],
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
        <div>
          <h3 className="text-[14px] font-semibold text-zinc-900">门户访问数据</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            按北京时间（UTC+8）统计，数据自功能上线日起记录。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg bg-zinc-100/80 p-0.5"
            role="group"
            aria-label="选择访客类型"
          >
            {TRAFFIC_VISITOR_TYPES.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setVisitorType(item.type)}
                aria-pressed={visitorType === item.type}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition',
                  visitorType === item.type
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1 rounded-lg bg-zinc-100/80 p-0.5"
            role="group"
            aria-label="选择访问数据统计周期"
          >
            {TRAFFIC_RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                onClick={() => setDays(range.days)}
                aria-pressed={days === range.days}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition',
                  days === range.days
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={!apiConnected || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <i className={cn('fa-solid fa-rotate-right text-[9px]', loading && 'animate-spin')} />
            {loading ? '读取中' : '刷新'}
          </button>
        </div>
      </div>

      {!apiConnected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <i className="fa-solid fa-cloud-arrow-down mr-2 text-[11px]" />
          共享 API 未连接，暂时无法读取门户访问数据。
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-800"
        >
          <span>
            <i className="fa-solid fa-triangle-exclamation mr-2 text-[11px]" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100/60"
          >
            重试
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="访问数据读取中">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="apple-card animate-pulse p-3">
              <div className="h-2.5 w-16 rounded bg-zinc-100" />
              <div className="mt-3 h-6 w-24 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : null}

      {report && !loading ? (
        <>
          <StatCardGrid items={statItems} />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-[11px] text-zinc-500">
            <span>
              全部 PV <strong className="ml-1 font-semibold tabular-nums text-zinc-800">{formatCount(report.totals.pv)}</strong>
            </span>
            <span>
              全部 UV <strong className="ml-1 font-semibold tabular-nums text-zinc-800">{formatCount(report.totals.uv)}</strong>
            </span>
            <span>
              今日登录人数 <strong className="ml-1 font-semibold tabular-nums text-zinc-800">{formatCount(report.totals.todayLoginUsers)}</strong>
            </span>
            <span>
              当前筛选人均浏览 <strong className="ml-1 font-semibold tabular-nums text-zinc-800">{formatAverage(selectedTotals?.pv ?? 0, selectedTotals?.uv ?? 0)}</strong>
            </span>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[11px] leading-relaxed text-blue-900">
            <p>
              统计区间：{formatRangeDate(report.range.from)} 至 {formatRangeDate(report.range.to)} ·
              更新时间：{formatUpdatedAt(report.updatedAt)}（北京时间）
            </p>
            <p className="mt-1 text-blue-800/80">
              区间 UV 按整个统计周期去重，不等于每日 UV 相加；历史数据自功能上线日起累计。
            </p>
            <p className="mt-1 text-blue-800/80">
              登录与游客口径按访问发生时的身份拆分；今日登录人数为账号登录指标，不计游客。
            </p>
          </div>

          {!hasTraffic ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-12 text-center">
              <i className="fa-regular fa-chart-bar text-xl text-zinc-300" />
              <p className="mt-2 text-[12px] font-medium text-zinc-600">当前周期暂无访问数据</p>
              <p className="mt-1 text-[11px] text-zinc-400">用户访问门户页面后，这里会显示 PV、UV 和页面明细。</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <TrafficTable title={`日趋势 · ${selectedLabel}`}>
                <table className="w-full min-w-[500px] text-left text-[12px]">
                  <thead className="sticky top-0 z-10 border-b border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">日期</th>
                      <th className="px-3 py-2 text-right font-semibold">PV</th>
                      <th className="px-3 py-2 text-right font-semibold">UV</th>
                      <th className="px-3 py-2 text-right font-semibold">人均浏览</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.length ? (
                      dailyRows.map((row) => {
                        const counts = trafficCounts(row, visitorType);
                        return (
                          <tr key={row.date} className="border-b border-zinc-50 last:border-0">
                            <td className="whitespace-nowrap px-3 py-2.5 font-medium text-zinc-700">
                              {formatRangeDate(row.date)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                              {formatCount(counts.pv)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                              {formatCount(counts.uv)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">
                              {formatAverage(counts.pv, counts.uv)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <EmptyTableRow colSpan={4} label="暂无日趋势数据" />
                    )}
                  </tbody>
                </table>
              </TrafficTable>

              <TrafficTable title={`页面明细 · ${selectedLabel}`}>
                <table className="w-full min-w-[500px] text-left text-[12px]">
                  <thead className="sticky top-0 z-10 border-b border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">页面</th>
                      <th className="px-3 py-2 text-right font-semibold">PV</th>
                      <th className="px-3 py-2 text-right font-semibold">UV</th>
                      <th className="px-3 py-2 text-right font-semibold">人均浏览</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length ? (
                      pageRows.map((row) => {
                        const counts = trafficCounts(row, visitorType);
                        return (
                          <tr key={row.routeKey} className="border-b border-zinc-50 last:border-0">
                            <td className="max-w-[16rem] px-3 py-2.5">
                              <p
                                className="truncate font-medium text-zinc-700"
                                title={row.routeKey}
                              >
                                {routeLabel(row.routeKey)}
                              </p>
                              {routeLabel(row.routeKey) !== row.routeKey ? (
                                <p className="mt-0.5 truncate font-mono text-[9px] text-zinc-400">
                                  {row.routeKey}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                              {formatCount(counts.pv)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                              {formatCount(counts.uv)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">
                              {formatAverage(counts.pv, counts.uv)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <EmptyTableRow colSpan={4} label="暂无页面明细数据" />
                    )}
                  </tbody>
                </table>
              </TrafficTable>
            </div>
          )}

          {(report.gateFunnel ?? []).length ? (
            <TrafficTable title="游客登录转化">
              <table className="w-full min-w-[620px] text-left text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">触发动作</th>
                    <th className="px-3 py-2 text-right font-semibold">触发次数</th>
                    <th className="px-3 py-2 text-right font-semibold">触发游客</th>
                    <th className="px-3 py-2 text-right font-semibold">登录游客</th>
                    <th className="px-3 py-2 text-right font-semibold">转化率</th>
                  </tr>
                </thead>
                <tbody>
                  {report.gateFunnel.map((row) => (
                    <tr key={row.action} className="border-b border-zinc-50 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-zinc-700">
                        {GATE_ACTION_LABELS[row.action] ?? row.action}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                        {formatCount(row.hits)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                        {formatCount(row.guestUv)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                        {formatCount(row.convertedUv)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                        {formatPercent(row.conversionRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TrafficTable>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function TrafficTable({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h4 className="text-[13px] font-semibold text-zinc-800">{title}</h4>
      </div>
      <div className="max-h-[28rem] overflow-auto">{children}</div>
    </section>
  );
}

function EmptyTableRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-[11px] text-zinc-400">
        {label}
      </td>
    </tr>
  );
}
