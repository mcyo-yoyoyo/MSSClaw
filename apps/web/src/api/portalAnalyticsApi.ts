import { apiAuthHeaders, apiUrl } from '@/api/client';

export interface PortalAnalyticsReport {
  timezone: 'Asia/Shanghai';
  range: {
    days: number;
    from: string;
    to: string;
  };
  totals: {
    pv: number;
    uv: number;
    todayLoginUsers: number;
  };
  series: Array<{
    date: string;
    pv: number;
    uv: number;
  }>;
  pages: Array<{
    routeKey: string;
    pv: number;
    uv: number;
  }>;
  updatedAt: string | null;
}

export interface RecordPortalPageViewInput {
  eventId: string;
  routeKey: string;
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

export async function fetchPortalAnalyticsApi(
  workspaceId: string,
  days: number,
): Promise<PortalAnalyticsReport> {
  const normalizedDays = Math.max(1, Math.trunc(days));
  const query = new URLSearchParams({ days: String(normalizedDays) });
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
  if (!res.ok) throw new Error(`portal_analytics_get_${res.status}`);
  return (await res.json()) as PortalAnalyticsReport;
}
