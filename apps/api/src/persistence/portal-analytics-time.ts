export const PORTAL_ANALYTICS_TIME_ZONE = 'Asia/Shanghai' as const;

export function portalAnalyticsDateKey(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PORTAL_ANALYTICS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error('portal_analytics_date_key_failed');
  return `${year}-${month}-${day}`;
}

export function shiftPortalAnalyticsDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
