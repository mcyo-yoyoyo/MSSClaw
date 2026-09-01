import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  fetchPortalAnalyticsApi,
  type PortalAnalyticsAssetRow,
  type PortalAnalyticsAssetSummary,
  type PortalAnalyticsBehaviorCounts,
  type PortalAnalyticsRange,
  type PortalAnalyticsReport,
  type PortalAnalyticsTrafficCounts,
} from '@/api/portalAnalyticsApi';
import { StatCardGrid } from '@/components/center/CenterShell';
import type { PortalToolInventory } from '@/domain/portalToolInventory';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspaceStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

type RangePreset = 1 | 7 | 30 | 'custom';
type VisitorType = 'all' | 'user' | 'guest';
type AssetTab = 'tool' | 'skill' | 'agent';

interface PortalTrafficPanelProps {
  inventory: PortalToolInventory;
  inventoryLoading: boolean;
  inventoryError?: string | null;
}

const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: 1, label: '今天' },
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
  { value: 'custom', label: '自定义' },
];

const VISITOR_TYPES: Array<{ value: VisitorType; label: string }> = [
  { value: 'all', label: '全部用户' },
  { value: 'user', label: '登录用户' },
  { value: 'guest', label: '游客' },
];

const ASSET_TABS: Array<{ value: AssetTab; label: string }> = [
  { value: 'tool', label: '工具' },
  { value: 'skill', label: 'Skill' },
  { value: 'agent', label: 'Agent' },
];

const ROUTE_LABELS: Record<string, string> = {
  home: '首页',
  me: '个人中心',
  'market-external': '外部工具精选',
  'market-internal': '内部办公推荐',
  'market-projects': 'AI 工具 Hub',
  'market-tool': '工具详情',
  'ai-brief': 'AI 快讯',
  'ai-tasks': 'AI 任务',
  'ai-map': '场景案例',
  task: '任务记录',
  messages: '我的消息',
};

const EMPTY_BEHAVIOR: PortalAnalyticsBehaviorCounts = {
  views: 0,
  favorites: 0,
  likes: 0,
  dislikes: 0,
  redirects: 0,
  downloads: 0,
};

const EMPTY_ASSET_SUMMARY: PortalAnalyticsAssetSummary = {
  total: 0,
  published: 0,
  unpublished: 0,
  external: 0,
  company: 0,
  officeScenes: 0,
  bound: 0,
};

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '未采集';
  return Math.max(0, value).toLocaleString('zh-CN');
}

function formatOptionalCount(value: number | null | undefined): string {
  return value === null || value === undefined ? '未采集' : formatCount(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '未采集';
  return `${(Math.max(0, value) * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '未采集';
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

function formatDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : value;
}

function shanghaiToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value ?? ''}-${parts.find((part) => part.type === 'month')?.value ?? ''}-${parts.find((part) => part.type === 'day')?.value ?? ''}`;
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function rangeDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000) + 1;
}

function visitorCounts(row: PortalAnalyticsTrafficCounts, type: VisitorType) {
  if (type === 'user') return { pv: row.userPv, uv: row.userUv };
  if (type === 'guest') return { pv: row.guestPv, uv: row.guestUv };
  return { pv: row.pv, uv: row.uv };
}

function assetTypeLabel(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes('skill')) return 'Skill';
  if (normalized.includes('agent')) return 'Agent';
  if (normalized.includes('office')) return '办公场景';
  if (normalized.includes('tool')) return '工具';
  return type || '未分类';
}

function matchesAssetTab(row: PortalAnalyticsAssetRow, tab: AssetTab): boolean {
  const type = row.assetType.toLowerCase();
  if (tab === 'skill') return type.includes('skill');
  if (tab === 'agent') return type.includes('agent');
  return type.includes('tool');
}

function DashboardLineChart({
  dates,
  series,
  ariaLabel,
}: {
  dates: string[];
  series: Array<{ label: string; values: Array<number | null>; color: string; fill?: boolean }>;
  ariaLabel: string;
}) {
  const data = useMemo(
    () => ({
      labels: dates.map(formatDate),
      datasets: series.map((item) => ({
        label: item.label,
        data: item.values,
        borderColor: item.color,
        backgroundColor: item.fill ? `${item.color}18` : item.color,
        fill: item.fill ? 'origin' : false,
        borderWidth: 2,
        pointRadius: dates.length <= 7 ? 2.5 : 0,
        pointHoverRadius: 4,
        tension: 0.3,
      })),
    }),
    [dates, series],
  );
  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 10 } } },
        tooltip: { callbacks: { title: (items) => dates[items[0]?.dataIndex ?? 0] ?? '' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0, font: { size: 10 }, color: '#71717a' }, border: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 }, color: '#71717a' }, grid: { color: '#f4f4f5' }, border: { display: false } },
      },
    }),
    [dates],
  );
  return <div className="h-[250px] w-full" role="img" aria-label={ariaLabel}><Line data={data} options={options} /></div>;
}

function Section({ title, description, badge, children }: { title: string; description: string; badge?: string; children: ReactNode }) {
  return (
    <section className="space-y-3" aria-labelledby={`portal-dashboard-${title}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`portal-dashboard-${title}`} className="text-[15px] font-semibold text-zinc-900">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{description}</p>
        </div>
        {badge ? <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4">
      <div className="mb-2">
        <h4 className="text-[13px] font-semibold text-zinc-800">{title}</h4>
        {subtitle ? <p className="mt-0.5 text-[10px] text-zinc-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-[11px] text-zinc-400">{label}</div>;
}

function LoadingCards({ count }: { count: number }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="数据读取中">{Array.from({ length: count }, (_, index) => <div key={index} className="apple-card animate-pulse p-3"><div className="h-2.5 w-16 rounded bg-zinc-100" /><div className="mt-3 h-6 w-24 rounded bg-zinc-100" /></div>)}</div>;
}

function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'error' }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-[11px]', tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900')}>{children}</div>;
}

function DetailTable({ title, children }: { title: string; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white"><div className="border-b border-zinc-100 px-4 py-3"><h4 className="text-[13px] font-semibold text-zinc-800">{title}</h4></div><div className="max-h-[26rem] overflow-auto">{children}</div></section>;
}

function Cell({ children, align = 'left', className }: { children: ReactNode; align?: 'left' | 'right'; className?: string }) {
  return <td className={cn('border-b border-zinc-50 px-3 py-2.5 text-[11px] text-zinc-700', align === 'right' && 'text-right tabular-nums', className)}>{children}</td>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return <tr><td colSpan={colSpan} className="px-3 py-10 text-center text-[11px] text-zinc-400">{label}</td></tr>;
}

export function PortalTrafficPanel({ inventory, inventoryLoading, inventoryError }: PortalTrafficPanelProps) {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const apiConnected = useWorkspaceStore((state) => state.apiConnected);
  const today = useMemo(shanghaiToday, []);
  const [rangePreset, setRangePreset] = useState<RangePreset>(7);
  const [appliedRange, setAppliedRange] = useState<PortalAnalyticsRange>({ days: 7 });
  const [customFrom, setCustomFrom] = useState(() => shiftDateKey(today, -6));
  const [customTo, setCustomTo] = useState(today);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [visitorType, setVisitorType] = useState<VisitorType>('all');
  const [assetTab, setAssetTab] = useState<AssetTab>('tool');
  const [department, setDepartment] = useState('all');
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
    void fetchPortalAnalyticsApi(workspaceId, appliedRange)
      .then((next) => { if (active) setReport(next); })
      .catch(() => { if (active) setError('看板数据读取失败，请稍后重试。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiConnected, appliedRange, reloadKey, workspaceId]);

  const applyPreset = (value: RangePreset) => {
    setRangePreset(value);
    setRangeError(null);
    if (value !== 'custom') setAppliedRange({ days: value });
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return setRangeError('请选择完整的开始和结束日期。');
    if (customFrom > customTo) return setRangeError('开始日期不能晚于结束日期。');
    if (customTo > today) return setRangeError('结束日期不能晚于今天。');
    if (rangeDays(customFrom, customTo) > 90) return setRangeError('单次最多查询 90 天。');
    setRangeError(null);
    setAppliedRange({ from: customFrom, to: customTo });
  };

  const trafficTotals = report ? visitorCounts(report.totals, visitorType) : { pv: 0, uv: 0 };
  const behavior = report?.behavior;
  const behaviorRangeTotals = behavior?.totals ?? EMPTY_BEHAVIOR;
  const rangeBehaviorTotals = behaviorRangeTotals;
  const behaviorSeries = behavior?.series ?? [];
  const assetSummary = report?.assets?.summary ?? EMPTY_ASSET_SUMMARY;
  const allAssetRows = report?.assets?.rows ?? [];
  const departments = useMemo(() => {
    const values = new Set<string>();
    (report?.users?.departmentRows ?? []).forEach((row) => row.department && values.add(row.department));
    (report?.users?.rows ?? []).forEach((row) => row.department && values.add(row.department));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [report?.users?.departmentRows, report?.users?.rows]);
  const userRows = useMemo(
    () =>
      (report?.users?.rows ?? []).filter(
        (row) => department === 'all' || row.department === department,
      ),
    [department, report?.users?.rows],
  );
  const departmentRows = useMemo(
    () =>
      (report?.users?.departmentRows ?? []).filter(
        (row) => department === 'all' || row.department === department,
      ),
    [department, report?.users?.departmentRows],
  );
  const assetRows = useMemo(
    () => allAssetRows.filter((row) => matchesAssetTab(row, assetTab)),
    [allAssetRows, assetTab],
  );
  const pageRows = useMemo(
    () => [...(report?.pages ?? [])].filter((row) => { const c = visitorCounts(row, visitorType); return c.pv > 0 || c.uv > 0; }).sort((a, b) => visitorCounts(b, visitorType).pv - visitorCounts(a, visitorType).pv),
    [report?.pages, visitorType],
  );
  const overview = report?.overview;
  const highDislike = [...assetRows].filter((row) => row.dislikeRate > 0).sort((a, b) => b.dislikeRate - a.dislikeRate).slice(0, 5);
  const highLikes = [...assetRows].filter((row) => row.likes > 0).sort((a, b) => b.likes - a.likes || b.likeRate - a.likeRate).slice(0, 10);
  const highSkillAgentDownloads = [...allAssetRows]
    .filter((row) => /^(skill|agent)$/i.test(row.assetType) && row.downloads > 0)
    .sort((a, b) => b.downloads - a.downloads || b.downloadUv - a.downloadUv)
    .slice(0, 10);
  const totalExposure = assetRows.reduce((sum, row) => sum + row.exposurePv, 0);
  const totalExposureUv = assetRows.reduce((sum, row) => sum + row.exposureUv, 0);
  const visitorLabel = VISITOR_TYPES.find((item) => item.value === visitorType)?.label ?? '全部用户';
  const rangeLabel = report ? `${formatDate(report.range.from)} 至 ${formatDate(report.range.to)}` : loading ? '读取中' : '暂无数据';

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4" aria-label="数据看板筛选">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-[14px] font-semibold text-zinc-900">统一筛选</h3><p className="mt-1 text-[11px] text-zinc-500">北京时间（UTC+8）；支持时间范围、资产类型和部门，页面访问可按访客身份切换。灰色指标暂不纳入。</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100/80 p-0.5" role="group" aria-label="访客身份">{VISITOR_TYPES.map((item) => <button key={item.value} type="button" onClick={() => setVisitorType(item.value)} aria-pressed={visitorType === item.value} className={cn('rounded-md px-2.5 py-1.5 text-[11px] font-semibold', visitorType === item.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800')}>{item.label}</button>)}</div>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100/80 p-0.5" role="group" aria-label="统计周期">{RANGE_PRESETS.map((item) => <button key={String(item.value)} type="button" onClick={() => applyPreset(item.value)} aria-pressed={rangePreset === item.value} className={cn('rounded-md px-2.5 py-1.5 text-[11px] font-semibold', rangePreset === item.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800')}>{item.label}</button>)}</div>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!apiConnected || loading} className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 disabled:opacity-45"><i className={cn('fa-solid fa-rotate-right mr-1 text-[9px]', loading && 'animate-spin')} />刷新</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
          <label className="text-[11px] text-zinc-600">资产类型<select value={assetTab} onChange={(event) => setAssetTab(event.target.value as AssetTab)} className="ml-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-800"><option value="tool">工具</option><option value="skill">Skill</option><option value="agent">Agent</option></select></label>
          <label className="text-[11px] text-zinc-600">部门<select value={department} onChange={(event) => setDepartment(event.target.value)} className="ml-1 max-w-[13rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-800"><option value="all">全部部门</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          {rangePreset === 'custom' ? <><label className="text-[11px] text-zinc-600">开始<input type="date" value={customFrom} max={customTo || today} onChange={(event) => setCustomFrom(event.target.value)} className="ml-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px]" /></label><label className="text-[11px] text-zinc-600">结束<input type="date" value={customTo} min={customFrom} max={today} onChange={(event) => setCustomTo(event.target.value)} className="ml-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px]" /></label><button type="button" onClick={applyCustomRange} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white">应用日期</button></> : null}
          {rangeError ? <span className="text-[11px] text-rose-600">{rangeError}</span> : null}
        </div>
      </section>

      {!apiConnected ? <Notice>共享 API 未连接，无法读取后台事实数据。</Notice> : null}
      {error ? <Notice tone="error"><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="ml-2 font-semibold underline">重试</button></Notice> : null}

      <Section title="平台总览" description={`统计区间：${rangeLabel} · ${visitorLabel}；行为总数按当前区间统计。`} badge="黑色指标">
        {loading ? <LoadingCards count={8} /> : report ? <>
          <StatCardGrid items={[
            ['总用户数', formatOptionalCount(overview?.totalUsers)],
            ['DAU', formatOptionalCount(overview?.dau)],
            ['WAU', formatOptionalCount(overview?.wau)],
            ['MAU', formatOptionalCount(overview?.mau)],
            ['新增用户数', formatOptionalCount(overview?.newUsers)],
            ['访问 PV', formatCount(trafficTotals.pv)],
            ['访问 UV', formatCount(trafficTotals.uv)],
            ['资产总数', formatOptionalCount(report.assets ? assetSummary.total : inventory.totalTools)],
            ['已上架工具数', formatOptionalCount(report.assets ? assetSummary.published : inventory.publishedTools)],
            ['外部工具', formatOptionalCount(report.assets ? assetSummary.external : inventory.externalTools)],
            ['公司工具', formatOptionalCount(report.assets ? assetSummary.company : inventory.companyTools)],
            ['办公场景', formatOptionalCount(report.assets ? assetSummary.officeScenes : inventory.officeScenes)],
            ['已绑定工具', formatOptionalCount(report.assets ? assetSummary.bound : inventory.boundTools)],
            ['浏览总数', formatCount(rangeBehaviorTotals.views)],
            ['收藏总数', formatCount(rangeBehaviorTotals.favorites)],
            ['点赞总数', formatCount(rangeBehaviorTotals.likes)],
            ['点踩总数', formatCount(rangeBehaviorTotals.dislikes)],
            ['工具跳转总数', formatCount(rangeBehaviorTotals.redirects)],
            ['Skill/Agent 下载总数', formatCount(rangeBehaviorTotals.downloads)],
          ]} />
          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="DAU / 访问趋势" subtitle="按日去重用户；缺少行为事实时不回填演示数据"><DashboardLineChart dates={(report.series ?? []).map((row) => row.date)} series={[{ label: '日活跃用户', values: report.series.map((row) => row.userUv), color: '#2563eb', fill: true }, { label: '访问 UV', values: report.series.map((row) => row.uv), color: '#14b8a6' }]} ariaLabel="DAU与访问UV趋势" /></Panel>
            <Panel title="资产状态" subtitle="工具、Skill、Agent 与办公场景库存"><div className="grid grid-cols-3 gap-2 text-center text-[11px]"><div className="rounded-xl bg-emerald-50 px-2 py-3"><b className="block text-lg text-emerald-700">{formatOptionalCount(assetSummary.published)}</b><span className="text-emerald-800/70">已上架</span></div><div className="rounded-xl bg-amber-50 px-2 py-3"><b className="block text-lg text-amber-700">{formatOptionalCount(assetSummary.unpublished)}</b><span className="text-amber-800/70">待处理</span></div><div className="rounded-xl bg-zinc-100 px-2 py-3"><b className="block text-lg text-zinc-700">{formatOptionalCount(assetSummary.total)}</b><span className="text-zinc-500">总资产</span></div></div></Panel>
          </div>
        </> : <Empty label="平台总览数据暂不可用" />}
      </Section>

      <Section title="用户分析" description="用户属性、活跃与留存按账号事实计算；未采集字段明确标记。" badge="用户维度">
        {loading ? <LoadingCards count={5} /> : report ? <>
          <StatCardGrid items={[
            ['新增用户', formatOptionalCount(overview?.newUsers)],
            ['DAU / MAU', overview && overview.mau > 0 ? formatPercent(overview.dau / overview.mau) : '未采集'],
            ['次日留存', formatPercent(overview?.d1Retention)],
            ['7 日留存', formatPercent(overview?.d7Retention)],
            ['30 日留存', formatPercent(overview?.d30Retention)],
          ]} />
          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="新增用户趋势" subtitle="按首次登录日期统计">{overview?.newUsersSeries?.some((row) => row.users > 0) ? <DashboardLineChart dates={overview.newUsersSeries.map((row) => row.date)} series={[{ label: '新增用户', values: overview.newUsersSeries.map((row) => row.users), color: '#2563eb', fill: true }]} ariaLabel="新增用户趋势" /> : <Empty label="新增用户趋势未采集" />}</Panel>
            <Panel title="用户留存曲线" subtitle="未到观察窗口的 cohort 保持未采集">{overview?.retentionSeries?.some((row) => row.d1 !== null || row.d7 !== null || row.d30 !== null) ? <DashboardLineChart dates={overview.retentionSeries.map((row) => row.date)} series={[{ label: '次日', values: overview.retentionSeries.map((row) => row.d1 === null ? null : row.d1 * 100), color: '#10b981' }, { label: '7日', values: overview.retentionSeries.map((row) => row.d7 === null ? null : row.d7 * 100), color: '#f59e0b' }, { label: '30日', values: overview.retentionSeries.map((row) => row.d30 === null ? null : row.d30 * 100), color: '#8b5cf6' }]} ariaLabel="用户留存曲线" /> : <Empty label="用户留存曲线未采集" />}</Panel>
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <DetailTable title={`用户明细 · ${rangeLabel}`}><table className="w-full min-w-[640px] text-left"><thead className="sticky top-0 border-b border-zinc-100 bg-zinc-50 text-[10px] text-zinc-500"><tr>{['用户 ID', '部门', '岗位', '首次使用时间', '最近活跃时间'].map((label) => <th key={label} className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead><tbody>{userRows.length ? userRows.map((row) => <tr key={row.userId}><Cell>{row.userId}</Cell><Cell>{row.department || '未采集'}</Cell><Cell>{row.role || '未采集'}</Cell><Cell>{formatDateTime(row.firstUseAt)}</Cell><Cell>{formatDateTime(row.lastActiveAt)}</Cell></tr>) : <EmptyRow colSpan={5} label="暂无用户行为事实" />}</tbody></table></DetailTable>
            <Panel title="部门活跃" subtitle="按部门查看活跃 UV"><div className="space-y-2">{departmentRows.length ? departmentRows.map((row) => <div key={row.department} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-[11px]"><span className="font-medium text-zinc-700">{row.department}</span><span className="tabular-nums text-zinc-500">活跃 UV {formatCount(row.activeUv)}</span></div>) : <Empty label="暂无部门事实" />}</div></Panel>
          </div>
        </> : <Empty label="用户分析数据暂不可用" />}
      </Section>

      <Section title="资产运营" description="工具、Skill、Agent 复用资产库存与交互指标；资产类型切换明细，部门筛选作用于用户与部门表。" badge="资产维度">
        {inventoryError ? <Notice tone="error">{inventoryError}</Notice> : null}
        {inventoryLoading ? <LoadingCards count={7} /> : <StatCardGrid items={[
          ['资产总数', formatOptionalCount(report?.assets ? assetSummary.total : inventory.totalTools)],
          ['已上架资产', formatOptionalCount(report?.assets ? assetSummary.published : inventory.publishedTools)],
          ['未上架资产', formatOptionalCount(report?.assets ? assetSummary.unpublished : undefined)],
          ['外部工具', formatOptionalCount(report?.assets ? assetSummary.external : inventory.externalTools)],
          ['公司工具', formatOptionalCount(report?.assets ? assetSummary.company : inventory.companyTools)],
          ['办公场景', formatOptionalCount(report?.assets ? assetSummary.officeScenes : inventory.officeScenes)],
          ['已绑定工具', formatOptionalCount(report?.assets ? assetSummary.bound : inventory.boundTools)],
          ['总曝光 PV', report?.assets ? formatCount(totalExposure) : '未采集'],
          ['资产曝光 UV 合计', report?.assets ? formatCount(totalExposureUv) : '未采集'],
        ]} />}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-zinc-100/80 p-1" role="tablist" aria-label="资产类型">{ASSET_TABS.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={assetTab === tab.value} onClick={() => setAssetTab(tab.value)} className={cn('rounded-lg px-3 py-1.5 text-[11px] font-semibold', assetTab === tab.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500')}>{tab.label}</button>)}</div>
        <DetailTable title={`${ASSET_TABS.find((tab) => tab.value === assetTab)?.label ?? '资产'}明细`}><table className="w-full min-w-[900px] text-left"><thead className="sticky top-0 border-b border-zinc-100 bg-zinc-50 text-[10px] text-zinc-500"><tr>{['资产', '类型', '曝光 PV', '曝光 UV', '详情 PV', '详情 UV', '下载', '下载 UV', '点赞', '点踩', '收藏', '跳转'].map((label) => <th key={label} className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead><tbody>{assetRows.length ? assetRows.map((row) => <tr key={`${row.assetType}:${row.contentId}`} className={row.dislikeRate >= 0.3 ? 'bg-rose-50/60' : undefined}><Cell className="font-medium">{row.name || row.contentId}</Cell><Cell>{assetTypeLabel(row.assetType)}</Cell><Cell align="right">{formatCount(row.exposurePv)}</Cell><Cell align="right">{formatCount(row.exposureUv)}</Cell><Cell align="right">{formatCount(row.detailPv)}</Cell><Cell align="right">{formatCount(row.detailUv)}</Cell><Cell align="right">{formatCount(row.downloads)}</Cell><Cell align="right">{formatCount(row.downloadUv)}</Cell><Cell align="right">{formatCount(row.likes)}</Cell><Cell align="right">{formatCount(row.dislikes)}</Cell><Cell align="right">{formatCount(row.favorites)}</Cell><Cell align="right">{formatCount(row.redirects)}</Cell></tr>) : <EmptyRow colSpan={12} label={report?.assets ? '当前筛选暂无资产事实' : '资产明细未采集'} />}</tbody></table></DetailTable>
      </Section>

      <Section title="交互行为" description={`浏览、点赞、点踩、收藏、下载、跳转均按事件事实统计；区间：${rangeLabel}。`} badge="行为维度">
        {loading ? <LoadingCards count={6} /> : report ? <>
          <StatCardGrid items={[
            ['浏览总数', formatCount(rangeBehaviorTotals.views)],
            ['总点赞', formatCount(rangeBehaviorTotals.likes)],
            ['总点踩', formatCount(rangeBehaviorTotals.dislikes)],
            ['总收藏', formatCount(rangeBehaviorTotals.favorites)],
            ['Skill/Agent 下载', formatCount(rangeBehaviorTotals.downloads ?? behavior?.downloads?.count)],
            ['官网跳转', formatCount(rangeBehaviorTotals.redirects)],
          ]} />
          <div className="grid gap-3 xl:grid-cols-2"><Panel title="行为趋势" subtitle="取消收藏不计为新的收藏"><DashboardLineChart dates={behaviorSeries.map((row) => row.date)} series={[{ label: '点赞', values: behaviorSeries.map((row) => row.likes), color: '#10b981' }, { label: '点踩', values: behaviorSeries.map((row) => row.dislikes), color: '#ef4444' }, { label: '收藏', values: behaviorSeries.map((row) => row.favorites), color: '#f59e0b' }, { label: '下载', values: behaviorSeries.map((row) => row.downloads ?? 0), color: '#2563eb' }]} ariaLabel="点赞点踩收藏下载趋势" /></Panel><Panel title="互动口碑散点" subtitle="X=收藏率，Y=点赞率"><div className="relative h-[250px] rounded-xl border border-zinc-100 bg-zinc-50"><span className="absolute bottom-1 left-1/2 text-[9px] text-zinc-400">收藏率 →</span><span className="absolute left-1 top-1/2 -rotate-90 text-[9px] text-zinc-400">点赞率 →</span>{assetRows.filter((row) => row.favoriteRate > 0 || row.likeRate > 0).slice(0, 40).map((row) => <span key={`${row.assetType}:${row.contentId}`} title={`${row.name || row.contentId} · 赞${formatPercent(row.likeRate)} · 藏${formatPercent(row.favoriteRate)}`} className="absolute h-2.5 w-2.5 rounded-full bg-teal-500" style={{ left: `${Math.min(96, Math.max(2, row.favoriteRate * 100))}%`, bottom: `${Math.min(96, Math.max(2, row.likeRate * 100))}%` }} />)}</div></Panel></div>
          <DetailTable title="资产交互明细"><table className="w-full min-w-[920px] text-left"><thead className="sticky top-0 border-b border-zinc-100 bg-zinc-50 text-[10px] text-zinc-500"><tr>{['资产', '点赞', '点踩', '点赞率', '点踩率', '收藏', '收藏率', '下载', '下载 UV', '官网跳转', '跳转 UV', '健康度'].map((label) => <th key={label} className="px-3 py-2 font-semibold">{label}</th>)}</tr></thead><tbody>{assetRows.length ? assetRows.map((row) => <tr key={`interaction:${row.assetType}:${row.contentId}`} className={row.dislikeRate >= 0.3 ? 'bg-rose-50/60' : undefined}><Cell className="font-medium">{row.name || row.contentId}</Cell><Cell align="right">{formatCount(row.likes)}</Cell><Cell align="right">{formatCount(row.dislikes)}</Cell><Cell align="right">{formatPercent(row.likeRate)}</Cell><Cell align="right">{formatPercent(row.dislikeRate)}</Cell><Cell align="right">{formatCount(row.favorites)}</Cell><Cell align="right">{formatPercent(row.favoriteRate)}</Cell><Cell align="right">{formatCount(row.downloads)}</Cell><Cell align="right">{formatCount(row.downloadUv)}</Cell><Cell align="right">{formatCount(row.redirects)}</Cell><Cell align="right">{formatCount(row.redirectUv)}</Cell><Cell align="right">{formatPercent(row.health)}</Cell></tr>) : <EmptyRow colSpan={12} label="暂无交互事实" />}</tbody></table></DetailTable>
          <div className="grid gap-3 xl:grid-cols-3">
            <Panel title="高点赞 TOP 资产"><ol className="space-y-1.5">{highLikes.length ? highLikes.map((row, index) => <li key={`likes:${row.assetType}:${row.contentId}`} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-[11px]"><span><b className="mr-2 text-zinc-400">{index + 1}</b>{row.name || row.contentId}</span><span className="tabular-nums text-zinc-600">{formatCount(row.likes)}</span></li>) : <Empty label="点赞事实未采集" />}</ol></Panel>
            <Panel title="高下载 Skill / Agent"><ol className="space-y-1.5">{highSkillAgentDownloads.length ? highSkillAgentDownloads.map((row, index) => <li key={`downloads:${row.assetType}:${row.contentId}`} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-[11px]"><span><b className="mr-2 text-zinc-400">{index + 1}</b>{row.name || row.contentId}</span><span className="tabular-nums text-zinc-600">{formatCount(row.downloads)}</span></li>) : <Empty label="Skill/Agent 下载事实未采集" />}</ol></Panel>
            <Panel title="高踩率预警"><div className="space-y-1.5">{highDislike.length ? highDislike.map((row) => <p key={`dislike:${row.assetType}:${row.contentId}`} className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{row.name || row.contentId} · {formatPercent(row.dislikeRate)}</p>) : <Empty label="暂无高踩率资产" />}</div></Panel>
          </div>
          <p className="text-[10px] text-zinc-400">下载 UV：{formatOptionalCount(behavior?.downloads?.uv)}；资产曝光与详情点击分开记录，未采集字段不会以 0 伪造。</p>
        </> : <Empty label="交互行为数据暂不可用" />}
      </Section>

      {report ? <section><DetailTable title={`页面访问明细 · ${visitorLabel}`}><table className="w-full min-w-[420px] text-left"><thead className="border-b border-zinc-100 bg-zinc-50 text-[10px] text-zinc-500"><tr><th className="px-3 py-2 font-semibold">页面</th><th className="px-3 py-2 text-right font-semibold">PV</th><th className="px-3 py-2 text-right font-semibold">UV</th></tr></thead><tbody>{pageRows.length ? pageRows.map((row) => { const c = visitorCounts(row, visitorType); return <tr key={row.routeKey}><Cell>{ROUTE_LABELS[row.routeKey] ?? row.routeKey}</Cell><Cell align="right">{formatCount(c.pv)}</Cell><Cell align="right">{formatCount(c.uv)}</Cell></tr>; }) : <EmptyRow colSpan={3} label="当前区间暂无页面访问" />}</tbody></table></DetailTable></section> : null}
      {report ? <p className="text-right text-[10px] text-zinc-400">页面数据更新时间：{formatDateTime(report.updatedAt)} · 行为事实更新时间：{formatDateTime(behavior?.updatedAt)} · 统计时区：Asia/Shanghai</p> : null}
    </div>
  );
}
