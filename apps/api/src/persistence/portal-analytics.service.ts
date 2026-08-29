import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const ANALYTICS_TIME_ZONE = 'Asia/Shanghai' as const;
const DEFAULT_REPORT_DAYS = 7;
const MAX_REPORT_DAYS = 90;
const PAGE_VIEW_RATE_WINDOW_MS = 60_000;
const PAGE_VIEW_VISITOR_RATE_LIMIT = 60;
const PAGE_VIEW_IP_RATE_LIMIT = 300;
const PAGE_VIEW_DAILY_VISITOR_LIMIT = 500;
const MAX_RATE_LIMIT_KEYS = 50_000;
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUEST_VISITOR_ID_RE =
  /^guest:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

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

const GATE_ACTIONS = new Set([
  'like',
  'dislike',
  'favorite',
  'download',
  'submit-tool',
  'submit-skill',
  'submit-agent',
  'chat',
  'account',
]);

const EVENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

type CountValue = bigint | number | string | null;
type PortalVisitorType = 'user' | 'guest';

interface TotalsRow {
  pv: CountValue;
  uv: CountValue;
  guestPv: CountValue;
  guestUv: CountValue;
  userPv: CountValue;
  userUv: CountValue;
  updatedAt: Date | bigint | number | string | null;
}

interface SeriesRow {
  date: string;
  pv: CountValue;
  uv: CountValue;
  guestPv: CountValue;
  guestUv: CountValue;
  userPv: CountValue;
  userUv: CountValue;
}

interface PageRow {
  routeKey: string;
  pv: CountValue;
  uv: CountValue;
  guestPv: CountValue;
  guestUv: CountValue;
  userPv: CountValue;
  userUv: CountValue;
}

interface DailyLoginRow {
  users: CountValue;
}

interface FunnelRow {
  action: string;
  hits: CountValue;
  guestUv: CountValue;
  convertedUv: CountValue;
}

export interface PortalAnalyticsReport {
  timezone: typeof ANALYTICS_TIME_ZONE;
  range: { days: number; from: string; to: string };
  totals: {
    pv: number;
    uv: number;
    guestPv: number;
    guestUv: number;
    userPv: number;
    userUv: number;
    todayLoginUsers: number;
  };
  series: Array<{
    date: string;
    pv: number;
    uv: number;
    guestPv: number;
    guestUv: number;
    userPv: number;
    userUv: number;
  }>;
  pages: Array<{
    routeKey: string;
    pv: number;
    uv: number;
    guestPv: number;
    guestUv: number;
    userPv: number;
    userUv: number;
  }>;
  gateFunnel: Array<{
    action: string;
    hits: number;
    guestUv: number;
    convertedUv: number;
    conversionRate: number;
  }>;
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
  private readonly visitorRateWindows = new Map<string, number[]>();
  private readonly ipRateWindows = new Map<string, number[]>();
  private readonly gateVisitorRateWindows = new Map<string, number[]>();
  private readonly gateIpRateWindows = new Map<string, number[]>();
  private rateLimitChecks = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 只在账号密码校验成功并创建新会话后调用。按北京时间和账号去重，
   * 因此同一账号当天重复登录、换浏览器登录都只计为一名登录用户。
   */
  async recordDailyLogin(input: {
    workspaceId: string;
    userId: string;
    visitorId?: string;
  }) {
    const userId = input.userId.trim();
    if (!userId) throw new BadRequestException('portal_analytics_user_id_required');

    const firstLoginAt = new Date();
    const dateKey = shanghaiDateKey(firstLoginAt);
    const visitorHash = this.accountVisitorHash(input.workspaceId, userId);
    const inserted = await this.prisma.$executeRaw`
      INSERT OR IGNORE INTO "PortalDailyLogin"
        ("workspaceId", "dateKey", "visitorHash", "firstLoginAt")
      VALUES
        (${input.workspaceId}, ${dateKey}, ${visitorHash}, ${firstLoginAt})
    `;

    // Conversion metadata is optional and must not prevent the established daily-login fact.
    const journeyVisitorId = this.optionalJourneyVisitorId(input.visitorId);
    if (journeyVisitorId) {
      const journeyHash = this.journeyHash(input.workspaceId, journeyVisitorId);
      const conversionEventId = `login-${randomUUID()}`;
      await this.prisma.$executeRaw`
        INSERT OR IGNORE INTO "PortalConversionEvent"
          ("workspaceId", "eventId", "dateKey", "eventType", "action", "routeKey", "journeyHash", "userHash", "occurredAt")
        VALUES
          (${input.workspaceId}, ${conversionEventId}, ${dateKey}, ${'login_success'}, ${null}, ${null}, ${journeyHash}, ${visitorHash}, ${firstLoginAt})
      `;
    }

    return { accepted: true, duplicate: inserted === 0, date: dateKey };
  }

  async recordGateHit(input: {
    workspaceId: string;
    eventId?: string;
    action?: string;
    routeKey?: string;
    visitorId: string;
    clientIp?: string;
  }) {
    const eventId = input.eventId?.trim() ?? '';
    const action = input.action?.trim().toLowerCase() ?? '';
    const routeKey = input.routeKey?.trim().toLowerCase() ?? '';
    const visitorId = input.visitorId.trim().toLowerCase();
    if (!EVENT_ID_RE.test(eventId)) {
      throw new BadRequestException('invalid_portal_analytics_event_id');
    }
    if (!GATE_ACTIONS.has(action)) {
      throw new BadRequestException('invalid_portal_analytics_gate_action');
    }
    if (!BUSINESS_ROUTE_KEYS.has(routeKey)) {
      throw new BadRequestException('invalid_portal_analytics_route_key');
    }
    if (!UUID_V4_RE.test(visitorId)) {
      throw new BadRequestException('invalid_guest_visitor_id');
    }

    const occurredAt = new Date();
    const dateKey = shanghaiDateKey(occurredAt);
    const visitorHash = this.guestVisitorHash(input.workspaceId, visitorId);
    const journeyHash = this.journeyHash(input.workspaceId, visitorId);
    if (
      !this.consumeRateLimit(
        this.gateIpRateWindows,
        this.normalizedClientIp(input.clientIp),
        PAGE_VIEW_IP_RATE_LIMIT,
        occurredAt.getTime(),
      ) ||
      !this.consumeRateLimit(
        this.gateVisitorRateWindows,
        visitorHash,
        PAGE_VIEW_VISITOR_RATE_LIMIT,
        occurredAt.getTime(),
      )
    ) {
      return { accepted: true, date: dateKey };
    }

    await this.prisma.$executeRaw`
      INSERT OR IGNORE INTO "PortalConversionEvent"
        ("workspaceId", "eventId", "dateKey", "eventType", "action", "routeKey", "journeyHash", "userHash", "occurredAt")
      SELECT
        ${input.workspaceId}, ${eventId}, ${dateKey}, ${'guest_gate_hit'}, ${action}, ${routeKey}, ${journeyHash}, ${null}, ${occurredAt}
      WHERE (
        SELECT COUNT(*)
        FROM "PortalConversionEvent"
        WHERE "workspaceId" = ${input.workspaceId}
          AND "dateKey" = ${dateKey}
          AND "eventType" = ${'guest_gate_hit'}
          AND "journeyHash" = ${journeyHash}
      ) < ${PAGE_VIEW_DAILY_VISITOR_LIMIT}
    `;

    return { accepted: true, date: dateKey };
  }

  async recordPageView(input: {
    workspaceId: string;
    eventId?: string;
    routeKey?: string;
    visitorType: PortalVisitorType;
    rawVisitorId: string;
    journeyVisitorId?: string;
    clientIp?: string;
  }) {
    const eventId = input.eventId?.trim() ?? '';
    const routeKey = input.routeKey?.trim().toLowerCase() ?? '';
    const rawVisitorId = input.rawVisitorId.trim();
    const journeyVisitorId = input.journeyVisitorId?.trim() || undefined;

    if (!EVENT_ID_RE.test(eventId)) {
      throw new BadRequestException('invalid_portal_analytics_event_id');
    }
    if (!BUSINESS_ROUTE_KEYS.has(routeKey)) {
      throw new BadRequestException('invalid_portal_analytics_route_key');
    }
    if (input.visitorType !== 'user' && input.visitorType !== 'guest') {
      throw new BadRequestException('invalid_portal_analytics_visitor_type');
    }
    if (!rawVisitorId) throw new BadRequestException('portal_analytics_visitor_id_required');

    const occurredAt = new Date();
    const dateKey = shanghaiDateKey(occurredAt);
    const visitorHash =
      input.visitorType === 'user'
        ? this.accountVisitorHash(input.workspaceId, rawVisitorId)
        : this.guestVisitorHash(input.workspaceId, rawVisitorId);
    const journeyHash = journeyVisitorId
      ? this.journeyHash(input.workspaceId, journeyVisitorId)
      : null;

    if (input.visitorType === 'guest') {
      if (
        !this.consumeRateLimit(
          this.ipRateWindows,
          this.normalizedClientIp(input.clientIp),
          PAGE_VIEW_IP_RATE_LIMIT,
          occurredAt.getTime(),
        ) ||
        !this.consumeRateLimit(
          this.visitorRateWindows,
          visitorHash,
          PAGE_VIEW_VISITOR_RATE_LIMIT,
          occurredAt.getTime(),
        )
      ) {
        return { accepted: true, date: dateKey };
      }
    }

    // The INSERT ... SELECT makes the daily cap part of the same SQLite statement as the
    // write. Concurrent requests therefore cannot all pass a separate count-then-insert check.
    await this.prisma.$executeRaw`
      INSERT OR IGNORE INTO "PortalPageView"
        ("workspaceId", "eventId", "dateKey", "routeKey", "visitorHash", "visitorType", "journeyHash", "occurredAt")
      SELECT
        ${input.workspaceId}, ${eventId}, ${dateKey}, ${routeKey}, ${visitorHash}, ${input.visitorType}, ${journeyHash}, ${occurredAt}
      WHERE (
        SELECT COUNT(*)
        FROM "PortalPageView"
        WHERE "workspaceId" = ${input.workspaceId}
          AND "dateKey" = ${dateKey}
          AND "visitorHash" = ${visitorHash}
      ) < ${PAGE_VIEW_DAILY_VISITOR_LIMIT}
    `;

    // Duplicate event IDs, rate-limited requests and the daily cap deliberately share the
    // same response. Anonymous callers cannot probe which protection discarded an event.
    return { accepted: true, date: dateKey };
  }

  async getReport(workspaceId: string, rawDays?: string | number): Promise<PortalAnalyticsReport> {
    const days = normalizedDays(rawDays);
    const to = shanghaiDateKey();
    const from = shiftDateKey(to, -(days - 1));

    const [totalsRows, seriesRows, pageRows, dailyLoginRows, funnelRows] = await Promise.all([
      this.prisma.$queryRaw<TotalsRow[]>`
        SELECT
          COUNT(*) AS "pv",
          COUNT(DISTINCT CASE
            WHEN p."visitorType" = 'user' THEN p."visitorHash"
            WHEN p."visitorType" = 'guest' THEN COALESCE(
              (
                SELECT l."userHash"
                FROM "PortalConversionEvent" AS l
                WHERE l."workspaceId" = p."workspaceId"
                  AND l."eventType" = 'login_success'
                  AND l."journeyHash" = p."journeyHash"
                  AND l."userHash" IS NOT NULL
                  AND l."occurredAt" >= p."occurredAt"
                ORDER BY l."occurredAt" ASC
                LIMIT 1
              ),
              p."journeyHash",
              p."visitorHash"
            )
            ELSE p."visitorHash"
          END) AS "uv",
          SUM(CASE WHEN "visitorType" = 'guest' THEN 1 ELSE 0 END) AS "guestPv",
          COUNT(DISTINCT CASE WHEN "visitorType" = 'guest' THEN "visitorHash" END) AS "guestUv",
          SUM(CASE WHEN "visitorType" = 'user' THEN 1 ELSE 0 END) AS "userPv",
          COUNT(DISTINCT CASE WHEN "visitorType" = 'user' THEN "visitorHash" END) AS "userUv",
          MAX("occurredAt") AS "updatedAt"
        FROM "PortalPageView" AS p
        WHERE p."workspaceId" = ${workspaceId}
          AND p."dateKey" BETWEEN ${from} AND ${to}
      `,
      this.prisma.$queryRaw<SeriesRow[]>`
        SELECT
          p."dateKey" AS "date",
          COUNT(*) AS "pv",
          COUNT(DISTINCT CASE
            WHEN p."visitorType" = 'user' THEN p."visitorHash"
            WHEN p."visitorType" = 'guest' THEN COALESCE(
              (
                SELECT l."userHash"
                FROM "PortalConversionEvent" AS l
                WHERE l."workspaceId" = p."workspaceId"
                  AND l."eventType" = 'login_success'
                  AND l."journeyHash" = p."journeyHash"
                  AND l."userHash" IS NOT NULL
                  AND l."occurredAt" >= p."occurredAt"
                ORDER BY l."occurredAt" ASC
                LIMIT 1
              ),
              p."journeyHash",
              p."visitorHash"
            )
            ELSE p."visitorHash"
          END) AS "uv",
          SUM(CASE WHEN "visitorType" = 'guest' THEN 1 ELSE 0 END) AS "guestPv",
          COUNT(DISTINCT CASE WHEN "visitorType" = 'guest' THEN "visitorHash" END) AS "guestUv",
          SUM(CASE WHEN "visitorType" = 'user' THEN 1 ELSE 0 END) AS "userPv",
          COUNT(DISTINCT CASE WHEN "visitorType" = 'user' THEN "visitorHash" END) AS "userUv"
        FROM "PortalPageView" AS p
        WHERE p."workspaceId" = ${workspaceId}
          AND p."dateKey" BETWEEN ${from} AND ${to}
        GROUP BY p."dateKey"
        ORDER BY p."dateKey" ASC
      `,
      this.prisma.$queryRaw<PageRow[]>`
        SELECT
          p."routeKey",
          COUNT(*) AS "pv",
          COUNT(DISTINCT CASE
            WHEN p."visitorType" = 'user' THEN p."visitorHash"
            WHEN p."visitorType" = 'guest' THEN COALESCE(
              (
                SELECT l."userHash"
                FROM "PortalConversionEvent" AS l
                WHERE l."workspaceId" = p."workspaceId"
                  AND l."eventType" = 'login_success'
                  AND l."journeyHash" = p."journeyHash"
                  AND l."userHash" IS NOT NULL
                  AND l."occurredAt" >= p."occurredAt"
                ORDER BY l."occurredAt" ASC
                LIMIT 1
              ),
              p."journeyHash",
              p."visitorHash"
            )
            ELSE p."visitorHash"
          END) AS "uv",
          SUM(CASE WHEN "visitorType" = 'guest' THEN 1 ELSE 0 END) AS "guestPv",
          COUNT(DISTINCT CASE WHEN "visitorType" = 'guest' THEN "visitorHash" END) AS "guestUv",
          SUM(CASE WHEN "visitorType" = 'user' THEN 1 ELSE 0 END) AS "userPv",
          COUNT(DISTINCT CASE WHEN "visitorType" = 'user' THEN "visitorHash" END) AS "userUv"
        FROM "PortalPageView" AS p
        WHERE p."workspaceId" = ${workspaceId}
          AND p."dateKey" BETWEEN ${from} AND ${to}
        GROUP BY p."routeKey"
        ORDER BY "pv" DESC, p."routeKey" ASC
      `,
      this.prisma.$queryRaw<DailyLoginRow[]>`
        SELECT COUNT(*) AS "users"
        FROM "PortalDailyLogin"
        WHERE "workspaceId" = ${workspaceId}
          AND "dateKey" = ${to}
      `,
      this.prisma.$queryRaw<FunnelRow[]>`
        SELECT
          g."action" AS "action",
          COUNT(*) AS "hits",
          COUNT(DISTINCT g."journeyHash") AS "guestUv",
          COUNT(DISTINCT CASE
            WHEN EXISTS (
              SELECT 1
              FROM "PortalConversionEvent" AS l
              WHERE l."workspaceId" = g."workspaceId"
                AND l."eventType" = 'login_success'
                AND l."dateKey" BETWEEN ${from} AND ${to}
                AND l."journeyHash" = g."journeyHash"
                AND l."occurredAt" >= g."occurredAt"
            ) THEN g."journeyHash"
          END) AS "convertedUv"
        FROM "PortalConversionEvent" AS g
        WHERE g."workspaceId" = ${workspaceId}
          AND g."eventType" = 'guest_gate_hit'
          AND g."dateKey" BETWEEN ${from} AND ${to}
          AND g."action" IS NOT NULL
        GROUP BY g."action"
        ORDER BY "hits" DESC, g."action" ASC
      `,
    ]);

    const totalsRow = totalsRows[0];
    const seriesByDate = new Map(
      seriesRows.map((row) => [
        row.date,
        {
          date: row.date,
          pv: count(row.pv),
          uv: count(row.uv),
          guestPv: count(row.guestPv),
          guestUv: count(row.guestUv),
          userPv: count(row.userPv),
          userUv: count(row.userUv),
        },
      ]),
    );
    const series = Array.from({ length: days }, (_, index) => {
      const date = shiftDateKey(from, index);
      return (
        seriesByDate.get(date) ?? {
          date,
          pv: 0,
          uv: 0,
          guestPv: 0,
          guestUv: 0,
          userPv: 0,
          userUv: 0,
        }
      );
    });

    return {
      timezone: ANALYTICS_TIME_ZONE,
      range: { days, from, to },
      totals: {
        pv: count(totalsRow?.pv),
        uv: count(totalsRow?.uv),
        guestPv: count(totalsRow?.guestPv),
        guestUv: count(totalsRow?.guestUv),
        userPv: count(totalsRow?.userPv),
        userUv: count(totalsRow?.userUv),
        todayLoginUsers: count(dailyLoginRows[0]?.users),
      },
      series,
      pages: pageRows.map((row) => ({
        routeKey: row.routeKey,
        pv: count(row.pv),
        uv: count(row.uv),
        guestPv: count(row.guestPv),
        guestUv: count(row.guestUv),
        userPv: count(row.userPv),
        userUv: count(row.userUv),
      })),
      gateFunnel: funnelRows.map((row) => {
        const guestUv = count(row.guestUv);
        const convertedUv = count(row.convertedUv);
        return {
          action: row.action,
          hits: count(row.hits),
          guestUv,
          convertedUv,
          conversionRate: guestUv > 0 ? Number((convertedUv / guestUv).toFixed(4)) : 0,
        };
      }),
      updatedAt: normalizedUpdatedAt(totalsRow?.updatedAt),
    };
  }

  private accountVisitorHash(workspaceId: string, userId: string): string {
    // UV 身份必须跨部署与 API Key 轮换保持稳定，否则历史区间会把同一账号算成多人。
    // 加固定命名空间后只落不可读摘要；它不是鉴权凭据，不依赖可轮换的运行时密钥。
    return createHash('sha256')
      .update(`mss-claw:portal-uv:v1:${workspaceId}:account:${userId}`)
      .digest('hex');
  }

  private guestVisitorHash(workspaceId: string, visitorId: string): string {
    return createHash('sha256').update(`${workspaceId}:guest:${visitorId}`).digest('hex');
  }

  private journeyHash(workspaceId: string, visitorId: string): string {
    return createHash('sha256').update(`${workspaceId}:visitor:${visitorId}`).digest('hex');
  }

  private optionalJourneyVisitorId(raw?: string): string | undefined {
    const value = raw?.trim() ?? '';
    if (!value) return undefined;
    const guestMatch = GUEST_VISITOR_ID_RE.exec(value);
    if (guestMatch?.[1]) return guestMatch[1].toLowerCase();
    if (UUID_V4_RE.test(value)) return value.toLowerCase();
    throw new BadRequestException('invalid_portal_analytics_visitor_id');
  }

  private normalizedClientIp(raw?: string): string {
    const value = raw?.trim().toLowerCase() ?? '';
    return value ? value.slice(0, 128) : 'unknown';
  }

  private consumeRateLimit(
    windows: Map<string, number[]>,
    key: string,
    limit: number,
    now: number,
  ): boolean {
    const cutoff = now - PAGE_VIEW_RATE_WINDOW_MS;
    const previous = windows.get(key) ?? [];
    const active = previous.filter((timestamp) => timestamp > cutoff);
    if (active.length >= limit) {
      windows.set(key, active);
      this.maybeSweepRateLimits(cutoff);
      return false;
    }

    active.push(now);
    windows.set(key, active);
    this.maybeSweepRateLimits(cutoff);
    return true;
  }

  private maybeSweepRateLimits(cutoff: number): void {
    this.rateLimitChecks += 1;
    if (this.rateLimitChecks % 256 !== 0) return;
    this.sweepRateMap(this.visitorRateWindows, cutoff);
    this.sweepRateMap(this.ipRateWindows, cutoff);
    this.sweepRateMap(this.gateVisitorRateWindows, cutoff);
    this.sweepRateMap(this.gateIpRateWindows, cutoff);
  }

  private sweepRateMap(windows: Map<string, number[]>, cutoff: number): void {
    for (const [key, timestamps] of windows) {
      if (!timestamps.some((timestamp) => timestamp > cutoff)) windows.delete(key);
    }
    while (windows.size > MAX_RATE_LIMIT_KEYS) {
      const oldestKey = windows.keys().next().value as string | undefined;
      if (!oldestKey) break;
      windows.delete(oldestKey);
    }
  }
}
