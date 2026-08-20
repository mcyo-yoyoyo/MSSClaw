import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ANALYTICS_TIME_ZONE = 'Asia/Shanghai' as const;
const DEFAULT_REPORT_DAYS = 7;
const MAX_REPORT_DAYS = 90;

/** 只统计业务门户页面，排除门户运营与其它管理配置页面。 */
const BUSINESS_ROUTE_KEYS = new Set([
  'home',
  'me',
  'market-external',
  'market-internal',
  'market-projects',
  'ai-brief',
  'ai-tasks',
  'market-tool',
  'ai-map',
  'task',
  'messages',
]);

const EVENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

type CountValue = bigint | number | string | null;

interface TotalsRow {
  pv: CountValue;
  uv: CountValue;
  updatedAt: Date | bigint | number | string | null;
}

interface SeriesRow {
  date: string;
  pv: CountValue;
  uv: CountValue;
}

interface PageRow {
  routeKey: string;
  pv: CountValue;
  uv: CountValue;
}

export interface PortalAnalyticsReport {
  timezone: typeof ANALYTICS_TIME_ZONE;
  range: { days: number; from: string; to: string };
  totals: { pv: number; uv: number };
  series: Array<{ date: string; pv: number; uv: number }>;
  pages: Array<{ routeKey: string; pv: number; uv: number }>;
  updatedAt: string | null;
}

function count(value: CountValue): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function shanghaiDateKey(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ANALYTICS_TIME_ZONE,
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

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizedDays(raw?: string | number): number {
  if (raw === undefined || raw === '') return DEFAULT_REPORT_DAYS;
  const days = Number(raw);
  if (!Number.isSafeInteger(days) || days < 1 || days > MAX_REPORT_DAYS) {
    throw new BadRequestException(`days_must_be_between_1_and_${MAX_REPORT_DAYS}`);
  }
  return days;
}

function normalizedUpdatedAt(
  value: Date | bigint | number | string | null | undefined,
): string | null {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === 'bigint'
        ? new Date(Number(value))
        : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

@Injectable()
export class PortalAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPageView(input: {
    workspaceId: string;
    eventId?: string;
    routeKey?: string;
    userId: string;
  }) {
    const eventId = input.eventId?.trim() ?? '';
    const routeKey = input.routeKey?.trim().toLowerCase() ?? '';
    const userId = input.userId.trim();

    if (!EVENT_ID_RE.test(eventId)) {
      throw new BadRequestException('invalid_portal_analytics_event_id');
    }
    if (!BUSINESS_ROUTE_KEYS.has(routeKey)) {
      throw new BadRequestException('invalid_portal_analytics_route_key');
    }
    if (!userId) throw new BadRequestException('portal_analytics_user_id_required');

    const occurredAt = new Date();
    const dateKey = shanghaiDateKey(occurredAt);
    const visitorHash = this.visitorHash(input.workspaceId, userId);

    const inserted = await this.prisma.$executeRaw`
      INSERT OR IGNORE INTO "PortalPageView"
        ("workspaceId", "eventId", "dateKey", "routeKey", "visitorHash", "occurredAt")
      VALUES
        (${input.workspaceId}, ${eventId}, ${dateKey}, ${routeKey}, ${visitorHash}, ${occurredAt})
    `;

    return {
      accepted: true,
      duplicate: inserted === 0,
      date: dateKey,
    };
  }

  async getReport(workspaceId: string, rawDays?: string | number): Promise<PortalAnalyticsReport> {
    const days = normalizedDays(rawDays);
    const to = shanghaiDateKey();
    const from = shiftDateKey(to, -(days - 1));

    const [totalsRows, seriesRows, pageRows] = await Promise.all([
      this.prisma.$queryRaw<TotalsRow[]>`
        SELECT
          COUNT(*) AS "pv",
          COUNT(DISTINCT "visitorHash") AS "uv",
          MAX("occurredAt") AS "updatedAt"
        FROM "PortalPageView"
        WHERE "workspaceId" = ${workspaceId}
          AND "dateKey" BETWEEN ${from} AND ${to}
      `,
      this.prisma.$queryRaw<SeriesRow[]>`
        SELECT
          "dateKey" AS "date",
          COUNT(*) AS "pv",
          COUNT(DISTINCT "visitorHash") AS "uv"
        FROM "PortalPageView"
        WHERE "workspaceId" = ${workspaceId}
          AND "dateKey" BETWEEN ${from} AND ${to}
        GROUP BY "dateKey"
        ORDER BY "dateKey" ASC
      `,
      this.prisma.$queryRaw<PageRow[]>`
        SELECT
          "routeKey",
          COUNT(*) AS "pv",
          COUNT(DISTINCT "visitorHash") AS "uv"
        FROM "PortalPageView"
        WHERE "workspaceId" = ${workspaceId}
          AND "dateKey" BETWEEN ${from} AND ${to}
        GROUP BY "routeKey"
        ORDER BY "pv" DESC, "routeKey" ASC
      `,
    ]);

    const totalsRow = totalsRows[0];
    const seriesByDate = new Map(
      seriesRows.map((row) => [row.date, { date: row.date, pv: count(row.pv), uv: count(row.uv) }]),
    );
    const series = Array.from({ length: days }, (_, index) => {
      const date = shiftDateKey(from, index);
      return seriesByDate.get(date) ?? { date, pv: 0, uv: 0 };
    });

    return {
      timezone: ANALYTICS_TIME_ZONE,
      range: { days, from, to },
      totals: { pv: count(totalsRow?.pv), uv: count(totalsRow?.uv) },
      series,
      pages: pageRows.map((row) => ({
        routeKey: row.routeKey,
        pv: count(row.pv),
        uv: count(row.uv),
      })),
      updatedAt: normalizedUpdatedAt(totalsRow?.updatedAt),
    };
  }

  private visitorHash(workspaceId: string, userId: string): string {
    // UV 身份必须跨部署与 API Key 轮换保持稳定，否则历史区间会把同一账号算成多人。
    // 加固定命名空间后只落不可读摘要；它不是鉴权凭据，不依赖可轮换的运行时密钥。
    return createHash('sha256')
      .update(`mss-claw:portal-uv:v1:${workspaceId}:account:${userId}`)
      .digest('hex');
  }
}
