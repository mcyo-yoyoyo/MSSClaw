import { apiAuthHeaders, apiUrl } from '@/api/client';

export interface PortalAnalyticsTrafficCounts {
  pv: number;
  uv: number;
  guestPv: number;
  guestUv: number;
  userPv: number;
  userUv: number;
}

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
