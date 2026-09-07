import { apiAuthHeaders, apiUrl } from '@/api/client';

export interface PortalAnalyticsTrafficCounts {
  pv: number;
  uv: number;
  guestPv: number;
  guestUv: number;
  userPv: number;
  userUv: number;
}

export interface PortalAnalyticsBehaviorCounts {
  views: number;
  favorites: number;
  likes: number;
  dislikes: number;
  redirects: number;
  /** 下载次数；旧 API 没有该字段时按 0 兼容。 */
  downloads?: number;
}

export interface PortalAnalyticsAssetRow {
  contentId: string;
  assetType: string;
  name?: string;
  region?: 'overseas' | 'domestic' | 'unknown';
  /** 货架来源；旧服务不返回时按 'none' 处理，前端不臆造归类。 */
  source?: 'external' | 'company' | 'none';
  department?: string | null;
  exposurePv: number;
  exposureUv: number;
  detailPv: number;
  detailUv: number;
  downloads: number;
  downloadUv: number;
  skillAgentDownloads?: number;
  likes: number;
  dislikes: number;
  favorites: number;
  redirects: number;
  redirectUv: number;
  likeRate: number;
  dislikeRate: number;
  favoriteRate: number;
  health: number;
  calls?: number;
  callUv?: number | null;
  judgedCalls?: number;
  successfulCalls?: number;
  successRate?: number | null;
  tokenTotal?: number | null;
  p95Ms?: number | null;
}

export interface PortalAnalyticsAssetSummary {
  total: number;
  published: number;
  unpublished: number;
  tool?: number;
  skill?: number;
  agent?: number;
  external: number;
  externalOverseas?: number;
  externalDomestic?: number;
  /** 外部工具中未标注地区的数量。 */
  unknown?: number;
  company: number;
  officeScenes: number;
  bound: number;
}

export interface PortalAnalyticsUserRow {
  userId: string;
  department: string;
  role: string;
  firstUseAt: string | null;
  lastActiveAt: string | null;
  accessDays?: number;
  accessFrequency?: number;
  calls?: number;
  assetTypes?: string[];
  tokenTotal?: number | null;
}

export type PortalAnalyticsRange =
  | { days: number; from?: never; to?: never }
  | { days?: never; from: string; to: string };

export interface PortalAnalyticsReport {
  timezone: 'Asia/Shanghai';
  range: {
    days: number;
    from: string;
    to: string;
  };
  totals: PortalAnalyticsTrafficCounts & {
    todayLoginUsers: number;
  };
  series: Array<
    PortalAnalyticsTrafficCounts & {
      date: string;
    }
  >;
  pages: Array<
    PortalAnalyticsTrafficCounts & {
      routeKey: string;
    }
  >;
  gateFunnel: Array<{
    action: string;
    hits: number;
    guestUv: number;
    convertedUv: number;
    conversionRate: number;
  }>;
  behavior: {
    totals: PortalAnalyticsBehaviorCounts;
    currentTotals: PortalAnalyticsBehaviorCounts;
    series: Array<PortalAnalyticsBehaviorCounts & { date: string }>;
    trackingStartedAt: string | null;
    updatedAt: string | null;
    downloads?: {
      count: number;
      uv: number;
      currentCount: number;
      currentUv: number;
    };
  };
  trafficPeriods?: {
    today: PortalAnalyticsTrafficCounts;
    last7Days: PortalAnalyticsTrafficCounts;
    last30Days: PortalAnalyticsTrafficCounts;
  };
  /** 黑色指标扩展；旧服务返回时可为空，前端显示未采集而不是造数。 */
  overview?: {
    totalUsers: number;
    dau: number;
    wau: number;
    mau: number;
    newUsers: number;
    d1Retention: number | null;
    d7Retention: number | null;
    d30Retention: number | null;
    newUsersSeries?: Array<{ date: string; users: number }>;
    retentionSeries?: Array<{
      date: string;
      d1: number | null;
      d7: number | null;
      d30: number | null;
    }>;
  };
  assets?: {
    summary: PortalAnalyticsAssetSummary;
    rows: PortalAnalyticsAssetRow[];
  };
  users?: {
    rows: PortalAnalyticsUserRow[];
    departmentRows: Array<{
      department: string;
      activeUv: number;
      todayUv?: number;
      last7DaysUv?: number;
      last30DaysUv?: number;
      users?: number;
      activeUsers?: number;
      calls?: number;
    }>;
  };
  calls?: {
    total: number;
    successRate: number | null;
    p95Ms: number | null;
    tokenTotal?: number | null;
  };
  updatedAt: string | null;
}

export interface RecordPortalPageViewInput {
  eventId: string;
  routeKey: string;
  visitorId: string;
}

export interface RecordGuestGateHitInput {
  eventId: string;
  routeKey: string;
  action: string;
  visitorId: string;
}

export async function recordPortalPageViewApi(
  workspaceId: string,
  input: RecordPortalPageViewInput,
): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/portal-analytics/views`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...apiAuthHeaders(),
      },
      body: JSON.stringify(input),
      keepalive: true,
    },
  );
  if (!res.ok) throw new Error(`portal_analytics_record_${res.status}`);
}

export async function recordGuestGateHitApi(
  workspaceId: string,
  input: RecordGuestGateHitInput,
): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/portal-analytics/gate-events`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...apiAuthHeaders(),
      },
      body: JSON.stringify(input),
      keepalive: true,
    },
  );
  if (!res.ok) throw new Error(`portal_analytics_gate_event_${res.status}`);
}

export async function fetchPortalAnalyticsApi(
  workspaceId: string,
  range: number | PortalAnalyticsRange,
): Promise<PortalAnalyticsReport> {
  const normalizedRange: PortalAnalyticsRange =
    typeof range === 'number' ? { days: range } : range;
  const query =
    'days' in normalizedRange && normalizedRange.days !== undefined
      ? new URLSearchParams({ days: String(Math.max(1, Math.trunc(normalizedRange.days))) })
      : new URLSearchParams({ from: normalizedRange.from, to: normalizedRange.to });
  const res = await fetch(
    apiUrl(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/portal-analytics?${query.toString()}`,
    ),
    {
      headers: {
        Accept: 'application/json',
        ...apiAuthHeaders(),
      },
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    // 服务端会用 to_must_not_be_in_the_future 这类语义化的码说明拒绝原因，
    // 丢掉响应体的话前端只能显示「读取失败」，用户看不出该改哪里。
    let reason = `portal_analytics_get_${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
      if (typeof message === 'string' && message.trim()) reason = message.trim();
    } catch {
      /* 响应体不是 JSON 时保留状态码 */
    }
    throw new Error(reason);
  }
  return (await res.json()) as PortalAnalyticsReport;
}
