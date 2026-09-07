import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  fetchPortalAnalyticsApi,
  type PortalAnalyticsAssetRow,
  type PortalAnalyticsAssetSummary,
  type PortalAnalyticsRange,
  type PortalAnalyticsReport,
  type PortalAnalyticsTrafficCounts,
} from '@/api/portalAnalyticsApi';
import type { PortalToolInventory } from '@/domain/portalToolInventory';
import { downloadBlob } from '@/lib/download';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/*
 * 看板结构对齐《工具数据指标 1.0.4》：平台总览、用户分析、资产、交互行为四个模块。
 * 文档第 1 节还列了「消耗 & 性能看板」，但正文没有给出口径定义，暂不渲染。
 *
 * 每个模块自带时间筛选、自己取数。相同区间的请求按签名去重，四块默认同为近 7 天
 * 时只发一次；某块单独换区间才会多发一次。
 */

type AssetTab = 'tool' | 'skill' | 'agent';
type RangeKey = 'today' | 'last7Days' | 'last30Days' | 'custom';
type TrendKey = 'pv' | 'userPv' | 'guestPv' | 'userUv' | 'redirects' | 'downloads';
type ModuleId = 'overview' | 'users' | 'assets' | 'behavior';
/** 文档要求行为指标按这四类分别统计。 */
type AssetClass = 'externalTool' | 'companyTool' | 'skill' | 'agent';

interface RangeSpec {
  key: RangeKey;
  from?: string;
  to?: string;
}

interface ReportState {
  loading: boolean;
  report: PortalAnalyticsReport | null;
  error: string | null;
}

interface PortalTrafficPanelProps {
  inventory: PortalToolInventory;
  inventoryLoading: boolean;
  inventoryError?: string | null;
}

interface BehaviorCounts {
  views: number;
  favorites: number;
  likes: number;
  dislikes: number;
  redirects: number;
  downloads: number;
}

const MODULES: Array<{ id: ModuleId; label: string }> = [
  { id: 'overview', label: '平台总览' },
  { id: 'users', label: '用户分析' },
  { id: 'assets', label: '资产' },
  { id: 'behavior', label: '交互行为' },
];

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string; days?: number }> = [
  { value: 'today', label: '今天', days: 1 },
  { value: 'last7Days', label: '近 7 天', days: 7 },
  { value: 'last30Days', label: '近 30 天', days: 30 },
  { value: 'custom', label: '自定义' },
];

const ASSET_TABS: Array<{ value: AssetTab; label: string }> = [
  { value: 'tool', label: '工具' },
  { value: 'skill', label: 'Skill' },
  { value: 'agent', label: 'Agent' },
];

const TREND_METRICS: Array<{ value: TrendKey; label: string; unit: string }> = [
  { value: 'pv', label: '页面浏览数 PV', unit: '次' },
  { value: 'userPv', label: '登录用户 PV', unit: '次' },
  { value: 'guestPv', label: '游客 PV', unit: '次' },
  { value: 'userUv', label: '用户数 UV', unit: '人次' },
  { value: 'redirects', label: '工具跳转数', unit: '次' },
  { value: 'downloads', label: '资产下载数', unit: '次' },
];

const PAGE_METRICS: Array<{ routeKey: string; label: string }> = [
  { routeKey: 'home', label: '首页' },
  { routeKey: 'ai-brief', label: 'AI快讯' },
  { routeKey: 'market-external', label: '外部工具精选' },
  { routeKey: 'market-internal', label: '内部办公场景' },
  { routeKey: 'market-projects', label: 'AI工具Hub' },
];

const ASSET_CLASSES: Array<{ value: AssetClass; label: string }> = [
  { value: 'externalTool', label: '外部工具' },
  { value: 'companyTool', label: '公司工具' },
  { value: 'skill', label: 'Skill' },
  { value: 'agent', label: 'Agent' },
];

const PAGE_SIZES = [10, 20, 50, 100];
const ASSET_PAGE_SIZE = 20;
const USER_PAGE_SIZE = 10;

const DEFAULT_RANGE: RangeSpec = { key: 'last7Days' };

const EMPTY_ASSET_SUMMARY: PortalAnalyticsAssetSummary = {
  total: 0,
  published: 0,
  unpublished: 0,
  external: 0,
  company: 0,
  officeScenes: 0,
  bound: 0,
};

const EMPTY_TRAFFIC: PortalAnalyticsTrafficCounts = {
  pv: 0,
  uv: 0,
  guestPv: 0,
  guestUv: 0,
  userPv: 0,
  userUv: 0,
};

const EMPTY_BEHAVIOR: BehaviorCounts = {
  views: 0,
  favorites: 0,
  likes: 0,
  dislikes: 0,
  redirects: 0,
  downloads: 0,
};

const PENDING_STATE: ReportState = { loading: true, report: null, error: null };
const IDLE_STATE: ReportState = { loading: false, report: null, error: null };

/* ── 区间 ── */

/** 与服务端 MAX_REPORT_DAYS 保持一致。 */
const MAX_CUSTOM_DAYS = 90;

/** 服务端按 Asia/Shanghai 判断「今天」，本地时区不同也不能让用户选出未来日期。 */
function shanghaiToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000) + 1;
}

/** 前置校验，规则与服务端 normalizedReportRange 一一对应，请求发出前就给出具体原因。 */
function validateRange(spec: RangeSpec, today: string): string | null {
  if (spec.key !== 'custom') return null;
  if (!spec.from || !spec.to) return '请同时选择开始与结束日期。';
  if (spec.from > spec.to) return '开始日期不能晚于结束日期。';
  if (spec.to > today) return `结束日期不能晚于今天（${formatDate(today)}）。`;
  const span = daysBetween(spec.from, spec.to);
  if (span > MAX_CUSTOM_DAYS) return `自定义区间最长 ${MAX_CUSTOM_DAYS} 天，当前选了 ${span} 天。`;
  return null;
}

/** 服务端拒绝码 → 中文说明；未收录的码原样透出，便于排查。 */
const RANGE_ERROR_MESSAGES: Record<string, string> = {
  from_and_to_are_required_together: '请同时选择开始与结束日期。',
  from_must_not_be_after_to: '开始日期不能晚于结束日期。',
  to_must_not_be_in_the_future: '结束日期不能晚于今天。',
  from_must_be_yyyy_mm_dd: '开始日期格式不正确。',
  to_must_be_yyyy_mm_dd: '结束日期格式不正确。',
  from_must_be_valid_date: '开始日期无效。',
  to_must_be_valid_date: '结束日期无效。',
  [`date_range_must_not_exceed_${MAX_CUSTOM_DAYS}_days`]: `自定义区间最长 ${MAX_CUSTOM_DAYS} 天。`,
};

function describeFetchError(reason: string): string {
  return RANGE_ERROR_MESSAGES[reason] ?? `看板数据读取失败（${reason}），请稍后重试。`;
}

function rangeSignature(spec: RangeSpec): string {
  if (spec.key === 'custom') return `c:${spec.from ?? ''}~${spec.to ?? ''}`;
  return `d:${RANGE_OPTIONS.find((option) => option.value === spec.key)?.days ?? 7}`;
}

function toApiRange(spec: RangeSpec, today: string): PortalAnalyticsRange | null {
  if (validateRange(spec, today)) return null;
  if (spec.key === 'custom') return { from: spec.from as string, to: spec.to as string };
  return { days: RANGE_OPTIONS.find((option) => option.value === spec.key)?.days ?? 7 };
}

/* ── 格式化 ── */

const NOT_COLLECTED = '未采集';

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_COLLECTED;
  return Math.max(0, value).toLocaleString('zh-CN');
}

function formatOptionalCount(value: number | null | undefined): string {
  return value === null || value === undefined ? NOT_COLLECTED : formatCount(value);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return NOT_COLLECTED;
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

function formatShortDate(value: string): string {
  const match = value.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}` : value;
}

function formatShare(part: number, whole: number): string {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function regionLabel(region: PortalAnalyticsAssetRow['region']): string {
  return region === 'overseas' ? '海外' : region === 'domestic' ? '国内' : '未标注';
}

/* ── 分类与汇总 ── */

function matchesAssetTab(row: PortalAnalyticsAssetRow, tab: AssetTab): boolean {
  const type = row.assetType.toLowerCase();
  if (tab === 'skill') return type.includes('skill');
  if (tab === 'agent') return type.includes('agent');
  return type.includes('tool');
}

/** 办公场景不计入行为统计（文档 2.3 行为指标只列了这四类）。 */
function classifyAsset(row: PortalAnalyticsAssetRow): AssetClass | null {
  const type = row.assetType.toLowerCase();
  if (type.includes('office-scene')) return null;
  if (type.includes('skill')) return 'skill';
  if (type.includes('agent')) return 'agent';
  if (!type.includes('tool')) return null;
  if (row.source === 'external') return 'externalTool';
  if (row.source === 'company') return 'companyTool';
  return null;
}

function addBehavior(target: BehaviorCounts, row: PortalAnalyticsAssetRow): BehaviorCounts {
  return {
    views: target.views + row.detailPv,
    favorites: target.favorites + row.favorites,
    likes: target.likes + row.likes,
    dislikes: target.dislikes + row.dislikes,
    redirects: target.redirects + row.redirects,
    downloads: target.downloads + row.downloads,
  };
}

interface BehaviorBreakdown {
  byClass: Record<AssetClass, BehaviorCounts>;
  total: BehaviorCounts;
  /** 服务端未返回货架来源时，工具无法拆成外部/公司，据实标记而不是补零。 */
  toolSourceKnown: boolean;
  unclassifiedTools: BehaviorCounts;
}

function buildBehaviorBreakdown(rows: PortalAnalyticsAssetRow[]): BehaviorBreakdown {
  const byClass: Record<AssetClass, BehaviorCounts> = {
    externalTool: { ...EMPTY_BEHAVIOR },
    companyTool: { ...EMPTY_BEHAVIOR },
    skill: { ...EMPTY_BEHAVIOR },
    agent: { ...EMPTY_BEHAVIOR },
  };
  let total = { ...EMPTY_BEHAVIOR };
  let unclassifiedTools = { ...EMPTY_BEHAVIOR };
  let toolSourceKnown = false;

  for (const row of rows) {
    const type = row.assetType.toLowerCase();
    if (type.includes('office-scene')) continue;
    const assetClass = classifyAsset(row);
    if (assetClass) {
      if (assetClass === 'externalTool' || assetClass === 'companyTool') toolSourceKnown = true;
      byClass[assetClass] = addBehavior(byClass[assetClass], row);
      total = addBehavior(total, row);
    } else if (type.includes('tool')) {
      unclassifiedTools = addBehavior(unclassifiedTools, row);
      total = addBehavior(total, row);
    }
  }
  return { byClass, total, toolSourceKnown, unclassifiedTools };
}

function toCsv(rows: string[][]): string {
  return rows
    .map((cells) =>
      cells.map((cell) => (/[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','),
    )
    .join('\r\n');
}

function niceScale(max: number, divisions = 3): { max: number; step: number } {
  if (!Number.isFinite(max) || max <= 0) return { max: divisions, step: 1 };
  const raw = max / divisions;
  const exponent = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / exponent;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * exponent;
  return { max: step * divisions, step };
}

/* ── 基础块 ── */

function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'error' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl border px-4 py-3 text-[11.5px] leading-relaxed',
        tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-amber-200 bg-amber-50/80 text-amber-900',
      )}
    >
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-[11px] text-zinc-400">
      {label}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-white/70', className)} />;
}

/** 模块自己的时间筛选。 */
function RangePicker({
  value,
  today,
  onChange,
}: {
  value: RangeSpec;
  today: string;
  onChange: (next: RangeSpec) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-zinc-200/80" role="tablist" aria-label="时间范围">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={value.key === option.value}
            onClick={() => onChange({ ...value, key: option.value })}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
              value.key === option.value ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {value.key === 'custom' ? (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <input
            type="date"
            value={value.from ?? ''}
            min={value.to ? shiftDateKey(value.to, -(MAX_CUSTOM_DAYS - 1)) : undefined}
            max={value.to && value.to < today ? value.to : today}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            aria-label="开始日期"
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-700"
          />
          <span>至</span>
          <input
            type="date"
            value={value.to ?? ''}
            min={value.from || undefined}
            max={
              value.from && shiftDateKey(value.from, MAX_CUSTOM_DAYS - 1) < today
                ? shiftDateKey(value.from, MAX_CUSTOM_DAYS - 1)
                : today
            }
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            aria-label="结束日期"
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-700"
          />
        </div>
      ) : null}
    </div>
  );
}

/** 模块外框：浅底 + 圆角，把四块彼此隔开；内部的白卡再落在这层浅底上。 */
function Module({
  id,
  title,
  range,
  today,
  onRangeChange,
  children,
}: {
  id: ModuleId;
  title: string;
  range: RangeSpec;
  today: string;
  onRangeChange: (next: RangeSpec) => void;
  children: ReactNode;
}) {
  return (
    <section
      id={`dashboard-module-${id}`}
      aria-labelledby={`dashboard-heading-${id}`}
      className="scroll-mt-20 rounded-[20px] border border-zinc-200/70 bg-zinc-50/70 p-4 sm:p-5"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-zinc-200/80 pb-3.5">
        <h3 id={`dashboard-heading-${id}`} className="text-[17px] font-semibold tracking-tight text-zinc-900">
          {title}
        </h3>
        <RangePicker value={range} today={today} onChange={onRangeChange} />
      </header>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

/** 主指标：每块 2~3 个，字号最大，唯一带投影的一层。 */
function HeroStat({ label, value, note }: { label: string; value: string; note?: string }) {
  const missing = value === NOT_COLLECTED;
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white px-5 py-4 shadow-apple">
      <p className="text-[11.5px] font-medium text-zinc-500">{label}</p>
      <p
        className={cn(
          'mt-2.5 tabular-nums',
          missing
            ? 'text-[13px] font-medium text-zinc-400'
            : 'text-[30px] font-semibold leading-none tracking-[-0.025em] text-zinc-900',
        )}
      >
        {value}
      </p>
      {note ? <p className="mt-2.5 text-[10.5px] leading-snug text-zinc-400">{note}</p> : null}
    </div>
  );
}

function HeroRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-3">{children}</div>;
}

/**
 * 次要指标带：一个外框 + 内部发丝网格，而不是 N 个各自带边框的小卡。
 * 负外边距把最后一行/列的分隔线顶出裁剪区，指标数量凑不满整行也不会留下断线。
 */
function StatBand({ columns, children }: { columns: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/60 bg-white">
      <div className={cn('-mb-px -mr-px grid', columns)}>{children}</div>
    </div>
  );
}

function BandItem({ label, value, note }: { label: string; value: string; note?: string }) {
  const missing = value === NOT_COLLECTED;
  return (
    <div className="border-b border-r border-zinc-100 px-4 py-3.5">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p
        className={cn(
          'mt-1.5 tabular-nums',
          missing
            ? 'text-[12px] font-medium text-zinc-400'
            : 'text-[20px] font-semibold leading-none tracking-[-0.02em] text-zinc-900',
        )}
      >
        {value}
      </p>
      {note ? <p className="mt-1.5 text-[10px] leading-snug text-zinc-400">{note}</p> : null}
    </div>
  );
}

function Card({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/60 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pb-2.5 pt-3.5">
        <h4 className="text-[13px] font-semibold tracking-tight text-zinc-800">{title}</h4>
        {subtitle ? <p className="text-[11px] tabular-nums text-zinc-400">{subtitle}</p> : null}
        {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
            value === option.value
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── 图表 ── */

const TREND_GRADIENT_ID = 'portal-dashboard-trend-fill';

function TrendChart({
  points,
  metricLabel,
  unit,
}: {
  points: Array<{ date: string; value: number }>;
  metricLabel: string;
  unit: string;
}) {
  if (points.length < 2) return <Empty label="趋势数据未采集" />;

  const width = 760;
  const height = 210;
  const padLeft = 52;
  const padRight = 18;
  const padTop = 26;
  const padBottom = 38;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const values = points.map((point) => point.value);
  const { max: scaleMax, step } = niceScale(Math.max(...values));
  const x = (index: number) => padLeft + (index / (points.length - 1)) * innerWidth;
  const y = (value: number) => padTop + innerHeight - (value / scaleMax) * innerHeight;

  const ticks: number[] = [];
  for (let tick = 0; tick <= scaleMax + step / 2; tick += step) ticks.push(tick);

  const line = points.map((point, index) => `${x(index).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ');
  const area = `${padLeft},${y(0).toFixed(2)} ${line} ${x(points.length - 1).toFixed(2)},${y(0).toFixed(2)}`;

  const peakIndex = values.indexOf(Math.max(...values));
  const lastIndex = points.length - 1;
  const total = values.reduce((sum, value) => sum + value, 0);
  const labelIndexes =
    points.length <= 8
      ? points.map((_, index) => index)
      : [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(ratio * lastIndex));
  const showDots = points.length <= 12;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        role="img"
        aria-label={`${metricLabel}趋势，合计 ${formatCount(total)}${unit}，峰值 ${formatCount(values[peakIndex])} 出现在 ${formatDate(points[peakIndex].date)}`}
      >
        <defs>
          <linearGradient id={TREND_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181b" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padLeft}
              y1={y(tick)}
              x2={width - padRight}
              y2={y(tick)}
              stroke={tick === 0 ? '#e4e4e7' : '#f1f1f3'}
              strokeWidth="1"
            />
            <text x={padLeft - 10} y={y(tick) + 3.5} textAnchor="end" fontSize="10" fill="#a1a1aa">
              {tick.toLocaleString('zh-CN')}
            </text>
          </g>
        ))}

        <polygon points={area} fill={`url(#${TREND_GRADIENT_ID})`} />
        <polyline
          points={line}
          fill="none"
          stroke="#18181b"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {showDots
          ? points.map((point, index) =>
              index === lastIndex ? null : (
                <circle
                  key={point.date}
                  cx={x(index)}
                  cy={y(point.value)}
                  r="2.4"
                  fill="#ffffff"
                  stroke="#18181b"
                  strokeWidth="1.4"
                />
              ),
            )
          : null}

        {peakIndex !== lastIndex ? (
          <text
            x={x(peakIndex)}
            y={y(values[peakIndex]) - 10}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            fill="#52525b"
          >
            {formatCount(values[peakIndex])}
          </text>
        ) : null}

        <circle cx={x(lastIndex)} cy={y(values[lastIndex])} r="7.5" fill="#18181b" fillOpacity="0.1" />
        <circle cx={x(lastIndex)} cy={y(values[lastIndex])} r="4" fill="#18181b" />
        <text
          x={x(lastIndex)}
          y={y(values[lastIndex]) - 13}
          textAnchor="end"
          fontSize="11"
          fontWeight="600"
          fill="#18181b"
        >
          {formatCount(values[lastIndex])}
        </text>

        {labelIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 18}
            textAnchor={index === 0 ? 'start' : index === lastIndex ? 'end' : 'middle'}
            fontSize="10"
            fill="#a1a1aa"
          >
            {formatShortDate(points[index].date)}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-400">
        <span>
          合计 <span className="text-[13px] font-semibold tabular-nums text-zinc-900">{formatCount(total)}</span>{' '}
          {unit}
        </span>
        <span>
          日均{' '}
          <span className="text-[13px] font-semibold tabular-nums text-zinc-900">
            {formatCount(Math.round(total / points.length))}
          </span>
        </span>
        <span>
          峰值{' '}
          <span className="text-[13px] font-semibold tabular-nums text-zinc-900">
            {formatCount(values[peakIndex])}
          </span>{' '}
          · {formatDate(points[peakIndex].date)}
        </span>
      </div>
    </div>
  );
}

const STACK_SHADES = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

function StackedBar({
  segments,
  emptyLabel,
}: {
  segments: Array<{ key: string; label: string; value: number }>;
  emptyLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  if (!total) return <Empty label={emptyLabel} />;
  return (
    <div>
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`构成合计 ${formatCount(total)}`}
      >
        {segments.map((segment, index) => (
          <span
            key={segment.key}
            className="first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(Math.max(0, segment.value) / total) * 100}%`,
              background: STACK_SHADES[index % STACK_SHADES.length],
            }}
          />
        ))}
      </div>
      <dl className="mt-3.5 flex flex-col">
        {segments.map((segment, index) => (
          <div
            key={segment.key}
            className={cn('flex items-center gap-2.5 py-2 text-[12px]', index > 0 && 'border-t border-zinc-100')}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: STACK_SHADES[index % STACK_SHADES.length] }}
            />
            <dt className="min-w-0 truncate text-zinc-600">{segment.label}</dt>
            <dd className="ml-auto flex items-baseline gap-3">
              <span className="w-11 text-right text-[11px] tabular-nums text-zinc-400">
                {formatShare(segment.value, total)}
              </span>
              <span className="w-16 text-right text-[14px] font-semibold tabular-nums text-zinc-900">
                {formatCount(segment.value)}
              </span>
            </dd>
          </div>
        ))}
        <div className="flex items-center gap-2.5 border-t border-zinc-200 py-2 text-[12px]">
          <span className="h-2.5 w-2.5 shrink-0" />
          <dt className="font-medium text-zinc-500">合计</dt>
          <dd className="ml-auto flex items-baseline gap-3">
            <span className="w-11" />
            <span className="w-16 text-right text-[14px] font-semibold tabular-nums text-zinc-900">
              {formatCount(total)}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

/* ── 表格 ── */

function TableShell({
  title,
  subtitle,
  actions,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** 翻页条放在横向滚动区外面，横滚时不会跟着跑掉。 */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/60 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pb-3 pt-3.5">
        <h4 className="text-[13px] font-semibold tracking-tight text-zinc-800">{title}</h4>
        {subtitle ? <p className="text-[11px] tabular-nums text-zinc-400">{subtitle}</p> : null}
        {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
      </div>
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (next: number) => void;
  onPageSize: (next: number) => void;
}) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const stepButton =
    'rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-300';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-2.5">
      <p className="text-[11px] tabular-nums text-zinc-400">
        第 {formatCount(from)}–{formatCount(to)} 条 · 共 {formatCount(total)} 条
      </p>
      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          每页
          <select
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-1.5 py-1 text-[11px] tabular-nums text-zinc-600"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={stepButton}>
            上一页
          </button>
          <span className="min-w-[3.5rem] text-center text-[11px] tabular-nums text-zinc-500">
            {page} / {pageCount}
          </span>
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} className={stepButton}>
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-y border-zinc-100 bg-zinc-50/70 px-3.5 py-2.5 text-[10.5px] font-semibold tracking-wide text-zinc-500',
        align === 'right' && 'text-right',
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'border-b border-zinc-100/70 px-3.5 py-2.5 text-[11.5px] text-zinc-600',
        align === 'right' && 'text-right tabular-nums',
        className,
      )}
    >
      {children}
    </td>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-zinc-50/70', className)}>{children}</tr>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3.5 py-12 text-center text-[11px] text-zinc-400">
        {label}
      </td>
    </tr>
  );
}

/* ── 面板 ── */

export function PortalTrafficPanel({ inventory, inventoryLoading, inventoryError }: PortalTrafficPanelProps) {
  const workspaceId = useWorkspaceStore((state) => state.workspaceId);
  const apiConnected = useWorkspaceStore((state) => state.apiConnected);

  const [ranges, setRanges] = useState<Record<ModuleId, RangeSpec>>({
    overview: DEFAULT_RANGE,
    users: DEFAULT_RANGE,
    assets: DEFAULT_RANGE,
    behavior: DEFAULT_RANGE,
  });
  const [cache, setCache] = useState<Record<string, ReportState>>({});
  const [revision, setRevision] = useState(0);
  const requested = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [assetTab, setAssetTab] = useState<AssetTab>('tool');
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(ASSET_PAGE_SIZE);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(USER_PAGE_SIZE);
  const [trendKey, setTrendKey] = useState<TrendKey>('pv');
  const [activeModule, setActiveModule] = useState<ModuleId>('overview');
  const today = useMemo(shanghaiToday, []);

  // 换工作区或断连后，之前那批区间的结果不再适用，整体作废。
  useEffect(() => {
    requested.current.clear();
    setCache({});
  }, [workspaceId, apiConnected]);

  // 按区间签名去重取数：四块默认同为近 7 天时只发一次请求。
  useEffect(() => {
    if (!apiConnected) return undefined;
    const pending: Array<{ signature: string; range: PortalAnalyticsRange }> = [];
    const seen = new Set<string>();
    for (const module of MODULES) {
      const spec = ranges[module.id];
      const range = toApiRange(spec, today);
      if (!range) continue;
      const signature = rangeSignature(spec);
      if (seen.has(signature) || requested.current.has(signature)) continue;
      seen.add(signature);
      pending.push({ signature, range });
    }
    if (!pending.length) return undefined;

    for (const item of pending) requested.current.add(item.signature);
    setCache((previous) => {
      const next = { ...previous };
      for (const item of pending) next[item.signature] = PENDING_STATE;
      return next;
    });

    // 结果按区间签名入缓存，晚到也照样正确，所以只在卸载后才丢弃：
    // 若改用「effect 重跑就作废」的写法，别的模块换区间会把在途请求的结果扔掉，
    // 而签名仍留在 requested 里不会重发，那一块就永远停在读取中。
    for (const item of pending) {
      void fetchPortalAnalyticsApi(workspaceId, item.range)
        .then((report) => {
          if (!mounted.current) return;
          setCache((previous) => ({ ...previous, [item.signature]: { loading: false, report, error: null } }));
        })
        .catch((error: unknown) => {
          if (!mounted.current) return;
          // 允许重试同一个区间。
          requested.current.delete(item.signature);
          setCache((previous) => ({
            ...previous,
            [item.signature]: {
              loading: false,
              report: null,
              error: describeFetchError(error instanceof Error ? error.message : 'unknown'),
            },
          }));
        });
    }
    return undefined;
  }, [apiConnected, ranges, revision, today, workspaceId]);

  const stateOf = useCallback(
    (id: ModuleId): ReportState => {
      const spec = ranges[id];
      if (!apiConnected) return IDLE_STATE;
      if (!toApiRange(spec, today)) return IDLE_STATE;
      return cache[rangeSignature(spec)] ?? PENDING_STATE;
    },
    [apiConnected, cache, ranges, today],
  );

  const setRange = useCallback(
    (id: ModuleId, next: RangeSpec, state: ReportState) => {
      // 切到自定义时用该模块已加载的区间做初值，日期框不会是空的，
      // 也就不会落到「from/to 必须成对」这条校验上。
      if (next.key === 'custom' && !next.from && !next.to) {
        const from = state.report?.range.from ?? shiftDateKey(today, -6);
        const to = state.report?.range.to ?? today;
        setRanges((previous) => ({ ...previous, [id]: { key: 'custom', from, to } }));
        return;
      }
      setRanges((previous) => ({ ...previous, [id]: next }));
    },
    [today],
  );

  const retry = useCallback(
    (id: ModuleId) => {
      requested.current.delete(rangeSignature(ranges[id]));
      setRevision((value) => value + 1);
    },
    [ranges],
  );

  // 模块锚点跟随滚动高亮。
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        setActiveModule(visible.target.id.replace('dashboard-module-', '') as ModuleId);
      },
      { rootMargin: '-88px 0px -60% 0px', threshold: 0 },
    );
    for (const module of MODULES) {
      const node = document.getElementById(`dashboard-module-${module.id}`);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  const overviewState = stateOf('overview');
  const usersState = stateOf('users');
  const assetsState = stateOf('assets');
  const behaviorState = stateOf('behavior');

  /** 区间本身不合法时显示具体原因；否则显示服务端返回的失败原因。 */
  const renderRangeIssue = useCallback(
    (id: ModuleId, state: ReportState) => {
      const invalid = validateRange(ranges[id], today);
      if (invalid) return <Notice>{invalid}</Notice>;
      if (!state.error) return null;
      return (
        <Notice tone="error">
          <span>{state.error}</span>
          <button type="button" onClick={() => retry(id)} className="ml-2 font-semibold underline">
            重试
          </button>
        </Notice>
      );
    },
    [ranges, retry, today],
  );

  /* 01 平台总览 */
  const overviewTraffic = overviewState.report?.totals ?? EMPTY_TRAFFIC;
  const overviewSummary = overviewState.report?.assets?.summary ?? EMPTY_ASSET_SUMMARY;
  const overviewHasAssets = Boolean(overviewState.report?.assets);
  const overviewToolTotal = overviewSummary.tool ?? overviewSummary.external + overviewSummary.company;
  const overviewDaily = useMemo(() => {
    const report = overviewState.report;
    const behaviorByDate = new Map((report?.behavior?.series ?? []).map((row) => [row.date, row]));
    return (report?.series ?? []).map((row) => {
      const behaviorRow = behaviorByDate.get(row.date);
      return {
        date: row.date,
        pv: row.pv,
        userPv: row.userPv,
        guestPv: row.guestPv,
        userUv: row.userUv,
        redirects: behaviorRow?.redirects ?? 0,
        downloads: behaviorRow?.downloads ?? 0,
      };
    });
  }, [overviewState.report]);
  const trendMetric = TREND_METRICS.find((metric) => metric.value === trendKey) ?? TREND_METRICS[0];
  const trendPoints = useMemo(
    () => overviewDaily.map((row) => ({ date: row.date, value: row[trendKey] })),
    [overviewDaily, trendKey],
  );

  /* 02 用户分析 */
  const usersTraffic = usersState.report?.totals ?? EMPTY_TRAFFIC;
  const pageMetrics = useMemo(() => {
    const pages = new Map((usersState.report?.pages ?? []).map((page) => [page.routeKey, page]));
    return PAGE_METRICS.map((page) => ({ ...page, ...pages.get(page.routeKey) }));
  }, [usersState.report?.pages]);
  const userRows = usersState.report?.users?.rows ?? [];
  // activeUv 是服务端按所选区间过滤后的活跃人数（见 portal-analytics.service 里
  // memberActivity 对 from/to 的裁剪），所以这里直接跟随本模块的时间筛选。
  // 不过滤零活跃：没人来过的部门也是结论，隐藏它会让人误以为名册里没有这个部门。
  const departmentRows = useMemo(
    () =>
      [...(usersState.report?.users?.departmentRows ?? [])].sort(
        (a, b) => (b.activeUv ?? 0) - (a.activeUv ?? 0) || a.department.localeCompare(b.department),
      ),
    [usersState.report?.users?.departmentRows],
  );
  const activeDepartmentCount = departmentRows.filter((row) => (row.activeUv ?? 0) > 0).length;
  const departmentMax = Math.max(1, ...departmentRows.map((row) => row.activeUv ?? 0));
  const usersRangeLabel = usersState.report
    ? `${formatDate(usersState.report.range.from)} 至 ${formatDate(usersState.report.range.to)}`
    : '暂无数据';

  useEffect(() => {
    setUserPage(1);
  }, [userPageSize, usersState.report]);
  const userPageCount = Math.max(1, Math.ceil(userRows.length / userPageSize));
  const userCurrentPage = Math.min(userPage, userPageCount);
  const pagedUserRows = useMemo(
    () => userRows.slice((userCurrentPage - 1) * userPageSize, userCurrentPage * userPageSize),
    [userCurrentPage, userPageSize, userRows],
  );

  /* 03 资产 */
  const assetsSummary = assetsState.report?.assets?.summary ?? EMPTY_ASSET_SUMMARY;
  const assetsHasFacts = Boolean(assetsState.report?.assets);
  const assetsToolTotal = assetsSummary.tool ?? assetsSummary.external + assetsSummary.company;
  const allAssetRows = useMemo(() => assetsState.report?.assets?.rows ?? [], [assetsState.report?.assets?.rows]);
  const assetRows = useMemo(
    () => allAssetRows.filter((row) => matchesAssetTab(row, assetTab)),
    [allAssetRows, assetTab],
  );
  useEffect(() => {
    setAssetPage(1);
  }, [assetTab, assetPageSize, assetsState.report]);
  const assetPageCount = Math.max(1, Math.ceil(assetRows.length / assetPageSize));
  const assetCurrentPage = Math.min(assetPage, assetPageCount);
  const pagedAssetRows = useMemo(
    () => assetRows.slice((assetCurrentPage - 1) * assetPageSize, assetCurrentPage * assetPageSize),
    [assetCurrentPage, assetPageSize, assetRows],
  );

  /* 04 交互行为 */
  const behaviorAssetRows = useMemo(
    () => behaviorState.report?.assets?.rows ?? [],
    [behaviorState.report?.assets?.rows],
  );
  const behaviorHasFacts = Boolean(behaviorState.report?.assets);
  const behavior = useMemo(() => buildBehaviorBreakdown(behaviorAssetRows), [behaviorAssetRows]);
  const behaviorRows: Array<{ key: string; label: string; counts: BehaviorCounts; muted?: boolean }> =
    ASSET_CLASSES.map((assetClass) => ({
      key: assetClass.value,
      label: assetClass.label,
      counts: behavior.byClass[assetClass.value],
    }));
  if (!behavior.toolSourceKnown && behaviorHasFacts) {
    behaviorRows.splice(0, 2, {
      key: 'toolUnclassified',
      label: '工具（未区分来源）',
      counts: behavior.unclassifiedTools,
      muted: true,
    });
  }
  const toolRedirects =
    behavior.byClass.externalTool.redirects +
    behavior.byClass.companyTool.redirects +
    behavior.unclassifiedTools.redirects;

  const handleExport = useCallback(() => {
    const report = assetsState.report;
    if (!report) return;
    const header = [
      '资产类型',
      '货架来源',
      '资产名称',
      '资产 ID',
      '地区',
      '浏览数',
      '收藏数',
      '点赞数',
      '点踩数',
      '跳转数',
      '下载数',
    ];
    const body = allAssetRows.map((row) => [
      row.assetType,
      row.source === 'external' ? '外部工具' : row.source === 'company' ? '公司工具' : '—',
      row.name || row.contentId,
      row.contentId,
      regionLabel(row.region),
      String(row.detailPv),
      String(row.favorites),
      String(row.likes),
      String(row.dislikes),
      String(row.redirects),
      String(row.downloads),
    ]);
    downloadBlob(
      `数据看板_资产明细_${report.range.from}_${report.range.to}.csv`,
      `﻿${toCsv([header, ...body])}`,
      'text/csv;charset=utf-8',
    );
  }, [allAssetRows, assetsState.report]);

  const assetsRangeLabel = assetsState.report
    ? `${formatDate(assetsState.report.range.from)} 至 ${formatDate(assetsState.report.range.to)}`
    : '暂无数据';
  const behaviorRangeLabel = behaviorState.report
    ? `${formatDate(behaviorState.report.range.from)} 至 ${formatDate(behaviorState.report.range.to)}`
    : '暂无数据';

  return (
    <div className="space-y-5 pb-6">
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200/70 bg-white/90 px-1 py-2.5 backdrop-blur-md">
        <nav aria-label="看板模块" className="flex flex-wrap items-center gap-0.5">
          {MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => {
                document
                  .getElementById(`dashboard-module-${module.id}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveModule(module.id);
              }}
              aria-current={activeModule === module.id ? 'true' : undefined}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11.5px] font-medium transition',
                activeModule === module.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800',
              )}
            >
              {module.label}
            </button>
          ))}
        </nav>
      </div>

      {!apiConnected ? <Notice>共享 API 未连接，无法读取后台事实数据。</Notice> : null}

      {/* ══ 01 平台总览 ══ */}
      <Module
        id="overview"
        title="平台总览"
        range={ranges.overview}
        onRangeChange={(next) => setRange('overview', next, overviewState)}
        today={today}
      >
        {renderRangeIssue('overview', overviewState)}

        {overviewState.loading ? (
          <Skeleton className="h-[116px]" />
        ) : (
          <HeroRow>
            <HeroStat label="页面浏览数 PV" value={formatCount(overviewTraffic.pv)} note="含游客与登录用户，不去重" />
            <HeroStat label="用户数 UV" value={formatCount(overviewTraffic.userUv)} note="登录用户，按用户 ID 去重" />
            <HeroStat label="游客数" value={formatCount(overviewTraffic.guestUv)} note="未登录访客" />
          </HeroRow>
        )}

        <Card
          title="访问趋势"
          actions={<ChipGroup label="趋势指标" options={TREND_METRICS} value={trendKey} onChange={setTrendKey} />}
        >
          {overviewState.loading ? (
            <Skeleton className="h-[240px]" />
          ) : overviewState.report ? (
            <TrendChart points={trendPoints} metricLabel={trendMetric.label} unit={trendMetric.unit} />
          ) : (
            <Empty label="趋势数据暂不可用" />
          )}
        </Card>

        <StatBand columns="grid-cols-2 sm:grid-cols-4">
          <BandItem
            label="工具总数"
            value={formatOptionalCount(overviewHasAssets ? overviewToolTotal : inventory.totalTools)}
            note="已上架外部工具 + 公司工具"
          />
          <BandItem
            label="办公场景数"
            value={formatOptionalCount(overviewHasAssets ? overviewSummary.officeScenes : inventory.officeScenes)}
            note="已上架办公场景"
          />
          <BandItem label="Skill 数" value={formatOptionalCount(overviewSummary.skill)} note="已上架 Skill" />
          <BandItem label="Agent 数" value={formatOptionalCount(overviewSummary.agent)} note="已上架 Agent" />
        </StatBand>
      </Module>

      {/* ══ 02 用户分析 ══ */}
      <Module
        id="users"
        title="用户分析"
        range={ranges.users}
        onRangeChange={(next) => setRange('users', next, usersState)}
        today={today}
      >
        {renderRangeIssue('users', usersState)}

        {usersState.loading ? (
          <Skeleton className="h-[116px]" />
        ) : (
          <HeroRow>
            <HeroStat
              label="页面浏览数 PV"
              value={formatCount(usersTraffic.pv)}
              note="页面浏览数据，包含访客和登录用户浏览数"
            />
            <HeroStat
              label="登录用户页面浏览数 PV"
              value={formatCount(usersTraffic.userPv)}
              note="登录用户浏览数"
            />
            <HeroStat
              label="游客页面浏览数 PV"
              value={formatCount(usersTraffic.guestPv)}
              note="游客浏览数"
            />
          </HeroRow>
        )}

        <TableShell title="页面浏览明细" subtitle={`${usersRangeLabel} · 首页、AI快讯、外部工具精选、内部办公场景、AI工具Hub`}>
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr>
                <Th>页面</Th>
                <Th align="right">页面浏览数 PV</Th>
                <Th align="right">登录用户页面浏览数 PV</Th>
                <Th align="right">游客页面浏览数 PV</Th>
              </tr>
            </thead>
            <tbody>
              {pageMetrics.map((page) => (
                <Row key={page.routeKey}>
                  <Td className="font-medium text-zinc-900">{page.label}</Td>
                  <Td align="right" className="font-semibold text-zinc-900">{formatCount(page.pv)}</Td>
                  <Td align="right">{formatCount(page.userPv)}</Td>
                  <Td align="right">{formatCount(page.guestPv)}</Td>
                </Row>
              ))}
            </tbody>
          </table>
        </TableShell>

        <TableShell
          title="部门活跃"
          subtitle={`${usersRangeLabel} · 共 ${formatCount(departmentRows.length)} 个部门，${formatCount(activeDepartmentCount)} 个有活跃`}
        >
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr>
                <Th>部门</Th>
                <Th>分布</Th>
                <Th align="right">活跃人数</Th>
              </tr>
            </thead>
            <tbody>
              {departmentRows.length ? (
                departmentRows.map((row) => (
                  <Row key={row.department}>
                    <Td className="font-medium text-zinc-900">{row.department}</Td>
                    <Td>
                      <span className="block h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-zinc-100">
                        {(row.activeUv ?? 0) > 0 ? (
                          <span
                            className="block h-full rounded-full bg-zinc-800"
                            style={{ width: `${Math.max(3, ((row.activeUv ?? 0) / departmentMax) * 100)}%` }}
                          />
                        ) : null}
                      </span>
                    </Td>
                    <Td
                      align="right"
                      className={(row.activeUv ?? 0) > 0 ? 'font-semibold text-zinc-900' : 'text-zinc-400'}
                    >
                      {formatCount(row.activeUv)}
                    </Td>
                  </Row>
                ))
              ) : (
                <EmptyRow colSpan={3} label={usersState.loading ? '读取中' : '暂无部门数据'} />
              )}
            </tbody>
          </table>
        </TableShell>

        <TableShell
          title="用户明细"
          subtitle={`${formatCount(userRows.length)} 名登录用户 · 自 2026/08/21 起，不随时间范围变化`}
          footer={
            <Pagination
              page={userCurrentPage}
              pageCount={userPageCount}
              pageSize={userPageSize}
              total={userRows.length}
              onPage={setUserPage}
              onPageSize={setUserPageSize}
            />
          }
        >
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr>
                <Th>用户 ID</Th>
                <Th>所属部门</Th>
                <Th>岗位</Th>
                <Th>首次使用时间</Th>
                <Th>最近活跃时间</Th>
              </tr>
            </thead>
            <tbody>
              {pagedUserRows.length ? (
                pagedUserRows.map((row) => (
                  <Row key={row.userId}>
                    <Td className="font-medium text-zinc-900">{row.userId}</Td>
                    <Td>{row.department || NOT_COLLECTED}</Td>
                    <Td>{row.role || NOT_COLLECTED}</Td>
                    <Td>{formatDateTime(row.firstUseAt)}</Td>
                    <Td>{formatDateTime(row.lastActiveAt)}</Td>
                  </Row>
                ))
              ) : (
                <EmptyRow colSpan={5} label={usersState.loading ? '读取中' : '暂无登录用户事实'} />
              )}
            </tbody>
          </table>
        </TableShell>
      </Module>

      {/* ══ 03 资产 ══ */}
      <Module
        id="assets"
        title="资产"
        range={ranges.assets}
        onRangeChange={(next) => setRange('assets', next, assetsState)}
        today={today}
      >
        {renderRangeIssue('assets', assetsState)}
        {inventoryError ? <Notice tone="error">{inventoryError}</Notice> : null}

        {inventoryLoading || assetsState.loading ? (
          <Skeleton className="h-[116px]" />
        ) : (
          <HeroRow>
            <HeroStat
              label="资产总数"
              value={formatOptionalCount(assetsHasFacts ? assetsSummary.total : inventory.totalTools)}
              note="外部工具 + 公司工具 + 办公场景 + Skill + Agent"
            />
            <HeroStat
              label="工具总数"
              value={formatOptionalCount(assetsHasFacts ? assetsToolTotal : inventory.totalTools)}
              note="外部工具 + 公司工具"
            />
            <HeroStat
              label="办公场景数"
              value={formatOptionalCount(assetsHasFacts ? assetsSummary.officeScenes : inventory.officeScenes)}
              note="已上架办公场景"
            />
          </HeroRow>
        )}

        <StatBand columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          <BandItem
            label="外部工具数"
            value={formatOptionalCount(assetsHasFacts ? assetsSummary.external : inventory.externalTools)}
          />
          <BandItem label="海外工具数" value={formatOptionalCount(assetsSummary.externalOverseas)} note="外部工具中" />
          <BandItem label="国内工具数" value={formatOptionalCount(assetsSummary.externalDomestic)} note="外部工具中" />
          <BandItem
            label="公司工具数"
            value={formatOptionalCount(assetsHasFacts ? assetsSummary.company : inventory.companyTools)}
          />
          <BandItem label="Skill 数" value={formatOptionalCount(assetsSummary.skill)} />
          <BandItem label="Agent 数" value={formatOptionalCount(assetsSummary.agent)} />
        </StatBand>

        <div className="grid gap-3.5 xl:grid-cols-2">
          <Card title="资产构成" subtitle="已上架资产按类型拆分">
            {inventoryLoading || assetsState.loading ? (
              <Skeleton className="h-40" />
            ) : (
              <StackedBar
                segments={[
                  { key: 'external', label: '外部工具', value: assetsSummary.external },
                  { key: 'company', label: '公司工具', value: assetsSummary.company },
                  { key: 'officeScene', label: '办公场景', value: assetsSummary.officeScenes },
                  { key: 'skill', label: 'Skill', value: assetsSummary.skill ?? 0 },
                  { key: 'agent', label: 'Agent', value: assetsSummary.agent ?? 0 },
                ]}
                emptyLabel="资产库存未采集"
              />
            )}
          </Card>

          <Card title="外部工具地区分布" subtitle="海外 / 国内">
            {inventoryLoading || assetsState.loading ? (
              <Skeleton className="h-40" />
            ) : (
              <StackedBar
                segments={[
                  { key: 'overseas', label: '海外工具数', value: assetsSummary.externalOverseas ?? 0 },
                  { key: 'domestic', label: '国内工具数', value: assetsSummary.externalDomestic ?? 0 },
                  { key: 'unknown', label: '未标注地区', value: assetsSummary.unknown ?? 0 },
                ]}
                emptyLabel="外部工具地区未采集"
              />
            )}
          </Card>
        </div>

        <TableShell
          title="资产明细"
          subtitle={`${formatCount(assetRows.length)} 条 · ${assetsRangeLabel}`}
          actions={
            <>
              <ChipGroup label="资产类型" options={ASSET_TABS} value={assetTab} onChange={setAssetTab} />
              <button
                type="button"
                onClick={handleExport}
                disabled={!assetsState.report || !allAssetRows.length}
                className="apple-btn-secondary ml-1 rounded-full px-3 py-1 text-[11px] font-semibold disabled:opacity-40"
              >
                导出 CSV
              </button>
            </>
          }
          footer={
            <Pagination
              page={assetCurrentPage}
              pageCount={assetPageCount}
              pageSize={assetPageSize}
              total={assetRows.length}
              onPage={setAssetPage}
              onPageSize={setAssetPageSize}
            />
          }
        >
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr>
                <Th>名称</Th>
                {assetTab === 'tool' ? <Th>海外 / 国内</Th> : null}
                <Th align="right">浏览数</Th>
                <Th align="right">收藏数</Th>
                <Th align="right">点赞数</Th>
                <Th align="right">点踩数</Th>
                <Th align="right">{assetTab === 'tool' ? '跳转数' : '下载数'}</Th>
              </tr>
            </thead>
            <tbody>
              {pagedAssetRows.length ? (
                pagedAssetRows.map((row) => (
                  <Row key={`${row.assetType}:${row.contentId}`}>
                    <Td className="font-medium text-zinc-900">{row.name || row.contentId}</Td>
                    {assetTab === 'tool' ? (
                      <Td>
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10.5px] font-medium text-zinc-600">
                          {regionLabel(row.region)}
                        </span>
                      </Td>
                    ) : null}
                    <Td align="right" className="font-semibold text-zinc-900">
                      {formatCount(row.detailPv)}
                    </Td>
                    <Td align="right">{formatCount(row.favorites)}</Td>
                    <Td align="right">{formatCount(row.likes)}</Td>
                    <Td align="right">{formatCount(row.dislikes)}</Td>
                    <Td align="right" className="font-semibold text-zinc-900">
                      {assetTab === 'tool' ? formatCount(row.redirects) : formatCount(row.downloads)}
                    </Td>
                  </Row>
                ))
              ) : (
                <EmptyRow
                  colSpan={assetTab === 'tool' ? 7 : 6}
                  label={assetsState.loading ? '读取中' : assetsHasFacts ? '当前类型暂无资产事实' : '资产明细未采集'}
                />
              )}
            </tbody>
          </table>
        </TableShell>
      </Module>

      {/* ══ 04 交互行为 ══ */}
      <Module
        id="behavior"
        title="交互行为"
        range={ranges.behavior}
        onRangeChange={(next) => setRange('behavior', next, behaviorState)}
        today={today}
      >
        {renderRangeIssue('behavior', behaviorState)}

        {!behavior.toolSourceKnown && behaviorHasFacts ? (
          <Notice>
            服务端未返回工具的货架来源，外部工具与公司工具暂时合并为一行。重启共享 API 后即可按来源拆分。
          </Notice>
        ) : null}

        {behaviorState.loading ? (
          <Skeleton className="h-[116px]" />
        ) : (
          <HeroRow>
            <HeroStat
              label="工具跳转数"
              value={formatCount(toolRedirects)}
              note="外部工具 + 公司工具，点击「立即体验」"
            />
            <HeroStat label="Skill 下载数" value={formatCount(behavior.byClass.skill.downloads)} note="用户点击下载" />
            <HeroStat label="Agent 下载数" value={formatCount(behavior.byClass.agent.downloads)} note="用户点击下载" />
          </HeroRow>
        )}

        <TableShell title="资产行为分类统计" subtitle={behaviorRangeLabel}>
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr>
                <Th>资产类型</Th>
                <Th align="right">资产浏览数</Th>
                <Th align="right">资产收藏数</Th>
                <Th align="right">资产点赞数</Th>
                <Th align="right">资产点踩数</Th>
              </tr>
            </thead>
            <tbody>
              {behaviorHasFacts ? (
                <>
                  {behaviorRows.map((row) => (
                    <Row key={row.key}>
                      <Td className={cn('font-medium', row.muted ? 'text-zinc-500' : 'text-zinc-900')}>{row.label}</Td>
                      <Td align="right" className="font-semibold text-zinc-900">
                        {formatCount(row.counts.views)}
                      </Td>
                      <Td align="right">{formatCount(row.counts.favorites)}</Td>
                      <Td align="right">{formatCount(row.counts.likes)}</Td>
                      <Td align="right">{formatCount(row.counts.dislikes)}</Td>
                    </Row>
                  ))}
                  <tr className="bg-zinc-50/80">
                    <Td className="font-semibold text-zinc-900">合计</Td>
                    <Td align="right" className="font-semibold text-zinc-900">
                      {formatCount(behavior.total.views)}
                    </Td>
                    <Td align="right" className="font-semibold text-zinc-900">
                      {formatCount(behavior.total.favorites)}
                    </Td>
                    <Td align="right" className="font-semibold text-zinc-900">
                      {formatCount(behavior.total.likes)}
                    </Td>
                    <Td align="right" className="font-semibold text-zinc-900">
                      {formatCount(behavior.total.dislikes)}
                    </Td>
                  </tr>
                </>
              ) : (
                <EmptyRow colSpan={5} label={behaviorState.loading ? '读取中' : '资产行为事实未采集'} />
              )}
            </tbody>
          </table>
        </TableShell>

        <div className="grid gap-3.5 xl:grid-cols-2">
          <Card title="资产浏览构成" subtitle="按资产类型拆分">
            {behaviorState.loading ? (
              <Skeleton className="h-40" />
            ) : (
              <StackedBar
                segments={behaviorRows.map((row) => ({ key: row.key, label: row.label, value: row.counts.views }))}
                emptyLabel="资产浏览事实未采集"
              />
            )}
          </Card>

          <Card title="资产收藏构成" subtitle="按资产类型拆分">
            {behaviorState.loading ? (
              <Skeleton className="h-40" />
            ) : (
              <StackedBar
                segments={behaviorRows.map((row) => ({ key: row.key, label: row.label, value: row.counts.favorites }))}
                emptyLabel="资产收藏事实未采集"
              />
            )}
          </Card>
        </div>
      </Module>

      <p className="pt-1 text-right text-[10px] text-zinc-400">
        统计时区 Asia/Shanghai · 消耗与性能模块的指标口径尚未定义，暂不纳入本看板
      </p>
    </div>
  );
}
