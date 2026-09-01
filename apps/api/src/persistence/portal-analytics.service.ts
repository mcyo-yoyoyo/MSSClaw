import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PersistenceService } from './persistence.service';
import {
  PORTAL_ANALYTICS_TIME_ZONE,
  portalAnalyticsDateKey,
  shiftPortalAnalyticsDateKey,
} from './portal-analytics-time';

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
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const BLACK_ASSET_TYPES = new Set(['tool', 'skill', 'agent', 'office-scene']);

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

interface BehaviorSeriesRow {
  date: string;
  /** Present in the dimensioned query; omitted by pre-dimension databases. */
  contentId?: string | null;
  assetType?: string | null;
  views: CountValue;
  favorites: CountValue;
  likes: CountValue;
  dislikes: CountValue;
  redirects: CountValue;
  downloads: CountValue;
}

interface BehaviorLifetimeRow {
  /** Present in the dimensioned compatibility query; omitted by the legacy sum row. */
  contentId?: string | null;
  views: CountValue;
  favorites: CountValue;
  likes: CountValue;
  dislikes: CountValue;
  uses?: CountValue;
  redirects: CountValue;
  downloads: CountValue;
  trackingStartedAt: Date | bigint | number | string | null;
  updatedAt: Date | bigint | number | string | null;
}

interface BehaviorAssetEventRow {
  contentId: string;
  assetType: string | null;
  action: string;
  events: CountValue;
  uv: CountValue;
}

interface BehaviorDownloadRow {
  /** Dimension columns are optional for legacy/fake query results. */
  contentId?: string | null;
  assetType?: string | null;
  visitorHash?: string | null;
  downloads: CountValue;
  uv?: CountValue;
}

interface UserIdentityRow {
  visitorHash: string | null;
  firstDate: string | null;
  firstAt: Date | string | number | null;
  lastAt: Date | string | number | null;
}

interface UserActivityRow {
  dateKey: string;
  visitorHash: string | null;
  events: CountValue;
  lastAt?: Date | string | number | null;
}

interface CallFactRow {
  contentId: string | null;
  assetType: string | null;
  visitorHash: string | null;
  success: boolean | number | string | null;
  durationMs: CountValue;
  inputTokens: CountValue;
  outputTokens: CountValue;
}

interface AssetCatalogRow {
  contentId: string;
  assetType: string;
  name: string;
  published: boolean;
  external: boolean;
  company: boolean;
  officeScene: boolean;
  bound: boolean;
}

export interface PortalBehaviorCounts {
  views: number;
  favorites: number;
  likes: number;
  dislikes: number;
  redirects: number;
  downloads: number;
}

export interface PortalAnalyticsReport {
  timezone: typeof PORTAL_ANALYTICS_TIME_ZONE;
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
  /** 黑字用户看板指标；观察窗口尚未完成时留空而不是伪造 0。 */
  overview: {
    totalUsers: number;
    dau: number;
    wau: number;
    mau: number;
    newUsers: number;
    d1Retention: number | null;
    d7Retention: number | null;
    d30Retention: number | null;
    newUsersSeries: Array<{ date: string; users: number }>;
    retentionSeries: Array<{
      date: string;
      d1: number | null;
      d7: number | null;
      d30: number | null;
    }>;
  };
  users: {
    rows: Array<{
      userId: string;
      department: string;
      role: string;
      firstUseAt: string | null;
      lastActiveAt: string | null;
      accessDays: number;
      accessFrequency: number;
      calls: number;
      assetTypes: string[];
      tokenTotal: number | null;
    }>;
    departmentRows: Array<{
      department: string;
      activeUv: number;
      users: number;
      activeUsers: number;
      calls?: number;
    }>;
  };
  assets: {
    summary: {
      total: number;
      published: number;
      unpublished: number;
      external: number;
      company: number;
      officeScenes: number;
      bound: number;
    };
    rows: Array<{
      contentId: string;
      assetType: string;
      name: string;
      exposurePv: number;
      exposureUv: number;
      detailPv: number;
      detailUv: number;
      downloads: number;
      downloadUv: number;
      likes: number;
      dislikes: number;
      favorites: number;
      redirects: number;
      redirectUv: number;
      calls: number;
      callUv: number | null;
      judgedCalls: number;
      successfulCalls: number;
      successRate: number | null;
      tokenTotal: number | null;
      p95Ms: number | null;
      likeRate: number;
      dislikeRate: number;
      favoriteRate: number;
      health: number;
    }>;
  };
  calls: {
    total: number;
    successRate: number | null;
    p95Ms: number | null;
    tokenTotal: number | null;
  };
  behavior: {
    totals: PortalBehaviorCounts;
    currentTotals: PortalBehaviorCounts;
    series: Array<PortalBehaviorCounts & { date: string }>;
    downloads: { count: number; uv: number; currentCount: number; currentUv: number };
    trackingStartedAt: string | null;
    updatedAt: string | null;
  };
  updatedAt: string | null;
}

function count(value: CountValue | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function inputString(value: unknown, errorCode: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new BadRequestException(errorCode);
  return value.trim();
}

function normalizedDays(raw?: string | number): number {
  if (raw === undefined || raw === '') return DEFAULT_REPORT_DAYS;
  const days = Number(raw);
  if (!Number.isSafeInteger(days) || days < 1 || days > MAX_REPORT_DAYS) {
    throw new BadRequestException(`days_must_be_between_1_and_${MAX_REPORT_DAYS}`);
  }
  return days;
}

function normalizedDateKey(raw: string | undefined, field: 'from' | 'to'): string {
  const value = raw?.trim() ?? '';
  if (!DATE_KEY_RE.test(value)) throw new BadRequestException(`${field}_must_be_yyyy_mm_dd`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${field}_must_be_valid_date`);
  }
  return value;
}

function normalizedReportRange(
  rawDays?: string | number,
  rawFrom?: string,
  rawTo?: string,
): { days: number; from: string; to: string; today: string } {
  const today = portalAnalyticsDateKey();
  const hasCustomRange = Boolean(rawFrom?.trim() || rawTo?.trim());
  if (!hasCustomRange) {
    const days = normalizedDays(rawDays);
    return {
      days,
      from: shiftPortalAnalyticsDateKey(today, -(days - 1)),
      to: today,
      today,
    };
  }

  if (!rawFrom?.trim() || !rawTo?.trim()) {
    throw new BadRequestException('from_and_to_are_required_together');
  }
  const from = normalizedDateKey(rawFrom, 'from');
  const to = normalizedDateKey(rawTo, 'to');
  if (from > to) throw new BadRequestException('from_must_not_be_after_to');
  if (to > today) throw new BadRequestException('to_must_not_be_in_the_future');
  const days = Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      86_400_000,
  ) + 1;
  if (days > MAX_REPORT_DAYS) {
    throw new BadRequestException(`date_range_must_not_exceed_${MAX_REPORT_DAYS}_days`);
  }
  return { days, from, to, today };
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

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
}

function asDateKey(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return DATE_KEY_RE.test(text) ? text : null;
}

function naturalWeekStart(dateKey: string): string {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  // The product calendar uses Monday as the first day of a natural week.
  return shiftPortalAnalyticsDateKey(dateKey, -(day === 0 ? 6 : day - 1));
}

function naturalMonthStart(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

function stringValue(value: unknown): string {
  return String(value ?? '').trim();
}

function boolValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'online', 'published', 'active'].includes(text)) return true;
  if (['false', '0', 'no', 'offline', 'draft', 'unpublished'].includes(text)) return false;
  return fallback;
}

/** Optional dimensions must not make the legacy traffic board unavailable while a
 * partially migrated database is being upgraded. Core traffic queries remain strict. */
function optionalRows<T>(value: Promise<T[]>): Promise<T[]> {
  return Promise.resolve(value).catch(() => []);
}

@Injectable()
export class PortalAnalyticsService {
  private readonly visitorRateWindows = new Map<string, number[]>();
  private readonly ipRateWindows = new Map<string, number[]>();
  private readonly gateVisitorRateWindows = new Map<string, number[]>();
  private readonly gateIpRateWindows = new Map<string, number[]>();
  private rateLimitChecks = 0;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly persistence?: PersistenceService,
  ) {}

  /**
   * 只在账号密码校验成功并创建新会话后调用。按北京时间和账号去重，
   * 因此同一账号当天重复登录、换浏览器登录都只计为一名登录用户。
   */
  async recordDailyLogin(input: {
    workspaceId: string;
    userId: string;
    visitorId?: string;
  }) {
    const userId = inputString(input.userId, 'portal_analytics_user_id_required');
    if (!userId) throw new BadRequestException('portal_analytics_user_id_required');

    const firstLoginAt = new Date();
    const dateKey = portalAnalyticsDateKey(firstLoginAt);
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
    const eventId = inputString(input.eventId, 'invalid_portal_analytics_event_id');
    const action = inputString(input.action, 'invalid_portal_analytics_gate_action').toLowerCase();
    const routeKey = inputString(input.routeKey, 'invalid_portal_analytics_route_key').toLowerCase();
    const visitorId = inputString(input.visitorId, 'invalid_guest_visitor_id').toLowerCase();
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
    const dateKey = portalAnalyticsDateKey(occurredAt);
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
    const eventId = inputString(input.eventId, 'invalid_portal_analytics_event_id');
    const routeKey = inputString(input.routeKey, 'invalid_portal_analytics_route_key').toLowerCase();
    const rawVisitorId = inputString(input.rawVisitorId, 'portal_analytics_visitor_id_required');
    const journeyVisitorId =
      inputString(input.journeyVisitorId, 'invalid_portal_analytics_visitor_id') || undefined;

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
    const dateKey = portalAnalyticsDateKey(occurredAt);
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

  async getReport(
    workspaceId: string,
    rawDays?: string | number,
    rawFrom?: string,
    rawTo?: string,
  ): Promise<PortalAnalyticsReport> {
    // 旧版本把累计互动保存在 JSON 文档中；看板直达也必须先完成一次性迁移，
    // 不能依赖用户先打开市场页面触发 engagement GET。
    await this.persistence?.ensureLegacyMarketEngagementMigrated(workspaceId);
    const { days, from, to, today } = normalizedReportRange(rawDays, rawFrom, rawTo);
    const activityFrom = [from, naturalWeekStart(to), naturalMonthStart(to)].sort()[0] ?? from;

    const [
      totalsRows,
      seriesRows,
      pageRows,
      dailyLoginRows,
      funnelRows,
      behaviorSeriesRows,
      behaviorLifetimeRows,
      behaviorLifetimeAssetRows,
      behaviorAssetRows,
      behaviorDownloadRows,
      userIdentityRows,
      userActivityRows,
      callFactRows,
    ] = await Promise.all([
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
          AND "dateKey" = ${today}
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
      this.prisma.$queryRaw<BehaviorSeriesRow[]>`
        SELECT
          e."dateKey" AS "date",
          e."contentId" AS "contentId",
          e."assetType" AS "assetType",
          SUM(CASE WHEN e."action" IN ('view', 'detail') THEN 1 ELSE 0 END) AS "views",
          SUM(CASE WHEN e."action" = 'favorite' THEN 1 ELSE 0 END) AS "favorites",
          SUM(CASE WHEN e."action" = 'like' THEN 1 ELSE 0 END) AS "likes",
          SUM(CASE WHEN e."action" = 'dislike' THEN 1 ELSE 0 END) AS "dislikes",
          SUM(CASE WHEN e."action" = 'redirect' THEN 1 ELSE 0 END) AS "redirects",
          SUM(CASE WHEN e."action" = 'download' THEN 1 ELSE 0 END) AS "downloads"
        FROM "MarketEngagementEvent" AS e
        WHERE e."workspaceId" = ${workspaceId}
          AND e."dateKey" BETWEEN ${from} AND ${to}
        GROUP BY e."dateKey", e."contentId", e."assetType"
        ORDER BY e."dateKey" ASC, e."contentId" ASC
      `,
      this.prisma.$queryRaw<BehaviorLifetimeRow[]>`
        SELECT
          COALESCE(SUM(m."views"), 0) AS "views",
          COALESCE(SUM(m."favorites"), 0) AS "favorites",
          COALESCE(SUM(m."likes"), 0) AS "likes",
          COALESCE(SUM(m."dislikes"), 0) AS "dislikes",
          COALESCE(SUM(m."uses"), 0) AS "redirects",
          COALESCE(SUM(m."downloads"), 0) AS "downloads",
          (
            SELECT MIN(e."occurredAt")
            FROM "MarketEngagementEvent" AS e
            WHERE e."workspaceId" = ${workspaceId}
          ) AS "trackingStartedAt",
          (
            SELECT MAX(e."occurredAt")
            FROM "MarketEngagementEvent" AS e
            WHERE e."workspaceId" = ${workspaceId}
          ) AS "updatedAt"
        FROM "MarketEngagement" AS m
        WHERE m."workspaceId" = ${workspaceId}
      `,
      // The legacy aggregate table has no asset type.  Keep the old sum query
      // above for compatibility, but also fetch dimensions so portal-content
      // and unknown records can be excluded when the catalog is available.
      optionalRows(this.prisma.$queryRaw<BehaviorLifetimeRow[]>`
        SELECT
          m."contentId" AS "contentId",
          m."views" AS "views",
          m."favorites" AS "favorites",
          m."likes" AS "likes",
          m."dislikes" AS "dislikes",
          m."uses" AS "redirects",
          m."downloads" AS "downloads",
          m."updatedAt" AS "updatedAt"
        FROM "MarketEngagement" AS m
        WHERE m."workspaceId" = ${workspaceId}
      `),
      optionalRows(this.prisma.$queryRaw<BehaviorAssetEventRow[]>`
        SELECT
          e."contentId" AS "contentId",
          e."assetType" AS "assetType",
          e."action" AS "action",
          COUNT(*) AS "events",
          COUNT(DISTINCT e."visitorHash") AS "uv"
        FROM "MarketEngagementEvent" AS e
        WHERE e."workspaceId" = ${workspaceId}
          AND e."dateKey" BETWEEN ${from} AND ${to}
          AND e."action" IN ('exposure', 'view', 'detail', 'download', 'like', 'dislike', 'favorite', 'redirect')
        GROUP BY e."contentId", e."assetType", e."action"
      `),
      optionalRows(this.prisma.$queryRaw<BehaviorDownloadRow[]>`
        SELECT
          e."contentId" AS "contentId",
          e."assetType" AS "assetType",
          e."visitorHash" AS "visitorHash",
          COUNT(*) AS "downloads"
        FROM "MarketEngagementEvent" AS e
        WHERE e."workspaceId" = ${workspaceId}
          AND e."dateKey" BETWEEN ${from} AND ${to}
          AND e."action" = 'download'
        GROUP BY e."contentId", e."assetType", e."visitorHash"
      `),
      optionalRows(this.prisma.$queryRaw<UserIdentityRow[]>`
        -- Account cohorts are defined by successful login facts. Page views and
        -- engagement events still feed active-day metrics below, but an anonymous
        -- or pre-login visit must not become a registered/new user.
        SELECT "visitorHash", MIN("dateKey") AS "firstDate", MIN("eventAt") AS "firstAt", MAX("eventAt") AS "lastAt"
        FROM (
          SELECT "visitorHash", "dateKey", "firstLoginAt" AS "eventAt"
          FROM "PortalDailyLogin"
          WHERE "workspaceId" = ${workspaceId}
            AND "visitorHash" IS NOT NULL
        ) AS users
        GROUP BY "visitorHash"
      `),
      optionalRows(this.prisma.$queryRaw<UserActivityRow[]>`
        -- Keep the full selected cohort window through today. D30 cohorts in a
        -- historical report can otherwise fall before the previous 30-day shortcut.
        -- A market event counts as an active-day fact only when it represents an
        -- actual execution. Exposure, detail views and reactions are not DAU
        -- operations under the metric definition.
        SELECT "dateKey", "visitorHash", COUNT(*) AS "events", MAX("eventAt") AS "lastAt"
        FROM (
          SELECT "dateKey", "visitorHash", "firstLoginAt" AS "eventAt"
          FROM "PortalDailyLogin"
          WHERE "workspaceId" = ${workspaceId}
            AND "dateKey" BETWEEN ${activityFrom} AND ${today}
            AND "visitorHash" IS NOT NULL
          UNION ALL
          SELECT "dateKey", "visitorHash", "occurredAt" AS "eventAt"
          FROM "PortalPageView"
          WHERE "workspaceId" = ${workspaceId}
            AND "visitorType" = 'user'
            AND "dateKey" BETWEEN ${activityFrom} AND ${today}
            AND "visitorHash" IS NOT NULL
          UNION ALL
          SELECT "dateKey", "visitorHash", "occurredAt" AS "eventAt"
          FROM "MarketEngagementEvent"
          WHERE "workspaceId" = ${workspaceId}
            AND "visitorType" = 'user'
            AND "action" IN ('call', 'use')
            AND "dateKey" BETWEEN ${activityFrom} AND ${today}
            AND "visitorHash" IS NOT NULL
        ) AS activity
        GROUP BY "dateKey", "visitorHash"
      `),
      optionalRows(this.prisma.$queryRaw<CallFactRow[]>`
        SELECT "contentId", "assetType", "visitorHash", "success", "durationMs", "inputTokens", "outputTokens"
        FROM "MarketEngagementEvent"
        WHERE "workspaceId" = ${workspaceId}
          AND "action" = 'call'
          AND "dateKey" BETWEEN ${from} AND ${to}
      `),
    ]);

    // The catalog is the authority for black-font asset metrics. Event rows can
    // carry `unknown` (older clients) or IDs from portal-content/workflows, so
    // report aggregation must resolve the ID before counting it.
    const catalog = await this.readAssetCatalog(workspaceId).catch(() => [] as AssetCatalogRow[]);
    const catalogById = new Map<string, AssetCatalogRow[]>();
    for (const row of catalog) {
      const rows = catalogById.get(row.contentId) ?? [];
      rows.push(row);
      catalogById.set(row.contentId, rows);
    }
    const isBlackCatalogAsset = (contentId: string, rawAssetType?: string | null): boolean => {
      const rows = catalogById.get(contentId) ?? [];
      if (!rows.some((row) => BLACK_ASSET_TYPES.has(row.assetType))) return false;
      const assetType = stringValue(rawAssetType).toLowerCase();
      // Older facts have no trustworthy dimension; keep them compatible while
      // rejecting an explicit type that disagrees with the catalog.
      return !assetType || assetType === 'unknown' || rows.some((row) => row.assetType === assetType);
    };

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
      const date = shiftPortalAnalyticsDateKey(from, index);
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
    const dimensionedBehaviorRows = behaviorSeriesRows.filter((row) => Boolean(stringValue(row.contentId)));
    // A pre-dimension database (and old test doubles) returns one row per day.
    // Once contentId is present, only catalog-backed black assets are eligible.
    const reportBehaviorRows = dimensionedBehaviorRows.length
      ? dimensionedBehaviorRows.filter((row) =>
          isBlackCatalogAsset(stringValue(row.contentId), row.assetType),
        )
      : behaviorSeriesRows;
    const behaviorByDate = new Map<string, PortalBehaviorCounts & { date: string }>();
    for (const row of reportBehaviorRows) {
      const date = asDateKey(row.date);
      if (!date) continue;
      const current = behaviorByDate.get(date) ?? {
        date,
        views: 0,
        favorites: 0,
        likes: 0,
        dislikes: 0,
        redirects: 0,
        downloads: 0,
      };
      current.views += count(row.views);
      current.favorites += count(row.favorites);
      current.likes += count(row.likes);
      current.dislikes += count(row.dislikes);
      current.redirects += count(row.redirects);
      current.downloads += count(row.downloads);
      behaviorByDate.set(date, current);
    }
    const behaviorSeries = Array.from({ length: days }, (_, index) => {
      const date = shiftPortalAnalyticsDateKey(from, index);
      return (
        behaviorByDate.get(date) ?? {
          date,
          views: 0,
          favorites: 0,
          likes: 0,
          dislikes: 0,
          redirects: 0,
          downloads: 0,
        }
      );
    });
    const behaviorTotals = behaviorSeries.reduce<PortalBehaviorCounts>(
      (sum, row) => ({
        views: sum.views + row.views,
        favorites: sum.favorites + row.favorites,
        likes: sum.likes + row.likes,
        dislikes: sum.dislikes + row.dislikes,
        redirects: sum.redirects + row.redirects,
        downloads: sum.downloads + row.downloads,
      }),
      { views: 0, favorites: 0, likes: 0, dislikes: 0, redirects: 0, downloads: 0 },
    );
    const dimensionedLifetimeRows = behaviorLifetimeAssetRows.filter((row) => Boolean(stringValue(row.contentId)));
    const reportLifetimeRows = dimensionedLifetimeRows.length
      ? dimensionedLifetimeRows.filter((row) => isBlackCatalogAsset(stringValue(row.contentId)))
      : behaviorLifetimeRows;
    const behaviorLifetimeRow = behaviorLifetimeRows[0];
    const currentTotals = reportLifetimeRows.reduce<PortalBehaviorCounts>(
      (sum, row) => ({
        views: sum.views + count(row.views),
        favorites: sum.favorites + count(row.favorites),
        likes: sum.likes + count(row.likes),
        dislikes: sum.dislikes + count(row.dislikes),
        // `uses` is the legacy aggregate name. New event facts count only
        // explicit `redirect` actions (see the dimensioned event query above).
        redirects: sum.redirects + count(row.redirects ?? row.uses),
        downloads: sum.downloads + count(row.downloads),
      }),
      { views: 0, favorites: 0, likes: 0, dislikes: 0, redirects: 0, downloads: 0 },
    );

    // User facts are intentionally derived from account-hashed page views and
    // successful daily logins. No member count or demo fixture is treated as an
    // activity fact when the event tables are empty.
    const firstByUser = new Map<string, string>();
    const firstAtByUser = new Map<string, string>();
    const lastAtByUser = new Map<string, string>();
    for (const row of userIdentityRows) {
      const visitorHash = stringValue(row.visitorHash);
      const firstDate = asDateKey(row.firstDate);
      if (!visitorHash || !firstDate) continue;
      const previous = firstByUser.get(visitorHash);
      if (!previous || firstDate < previous) firstByUser.set(visitorHash, firstDate);
      const firstAt = normalizedUpdatedAt(row.firstAt);
      const lastAt = normalizedUpdatedAt(row.lastAt);
      if (firstAt && (!firstAtByUser.has(visitorHash) || firstAt < (firstAtByUser.get(visitorHash) ?? firstAt))) {
        firstAtByUser.set(visitorHash, firstAt);
      }
      if (lastAt && (!lastAtByUser.has(visitorHash) || lastAt > (lastAtByUser.get(visitorHash) ?? lastAt))) {
        lastAtByUser.set(visitorHash, lastAt);
      }
    }
    const activityByDate = new Map<string, Set<string>>();
    const activityEventsByUser = new Map<string, number>();
    const lastActivityAtByUser = new Map<string, string>();
    for (const row of userActivityRows) {
      const date = asDateKey(row.dateKey);
      const visitorHash = stringValue(row.visitorHash);
      if (!date || !visitorHash) continue;
      const users = activityByDate.get(date) ?? new Set<string>();
      users.add(visitorHash);
      activityByDate.set(date, users);
      if (date >= from && date <= to) {
        activityEventsByUser.set(
          visitorHash,
          (activityEventsByUser.get(visitorHash) ?? 0) + count(row.events),
        );
      }
      const lastAt = normalizedUpdatedAt(row.lastAt);
      if (lastAt && (!lastActivityAtByUser.has(visitorHash) || lastAt > (lastActivityAtByUser.get(visitorHash) ?? lastAt))) {
        lastActivityAtByUser.set(visitorHash, lastAt);
      }
    }
    const activeUsersBetween = (start: string, end: string): Set<string> => {
      const users = new Set<string>();
      for (const [date, hashes] of activityByDate) {
        if (date >= start && date <= end) hashes.forEach((hash) => users.add(hash));
      }
      return users;
    };
    const dau = activeUsersBetween(to, to).size;
    const wau = activeUsersBetween(naturalWeekStart(to), to).size;
    const mau = activeUsersBetween(naturalMonthStart(to), to).size;
    const cohortsInRange = [...firstByUser.entries()].filter(
      ([, firstDate]) => firstDate >= from && firstDate <= to,
    );
    const newUsers = cohortsInRange.length;
    const retention = (offset: number): number | null => {
      const complete = cohortsInRange.filter(([, firstDate]) => shiftPortalAnalyticsDateKey(firstDate, offset) <= today);
      // An incomplete cohort is not a zero-retention cohort. Return null so the
      // dashboard can render “未采集” until the offset window is observable.
      if (!complete.length) return null;
      const retained = complete.filter(([visitorHash, firstDate]) =>
        activityByDate.get(shiftPortalAnalyticsDateKey(firstDate, offset))?.has(visitorHash),
      ).length;
      return ratio(retained, complete.length);
    };
    const newUsersSeries = Array.from({ length: days }, (_, index) => {
      const date = shiftPortalAnalyticsDateKey(from, index);
      return {
        date,
        users: cohortsInRange.filter(([, firstDate]) => firstDate === date).length,
      };
    });
    const retentionSeries = Array.from({ length: days }, (_, index) => {
      const date = shiftPortalAnalyticsDateKey(from, index);
      const cohort = cohortsInRange.filter(([, firstDate]) => firstDate === date);
      const at = (offset: number): number | null => {
        if (!cohort.length) return null;
        const target = shiftPortalAnalyticsDateKey(date, offset);
        if (target > today) return null;
        const retained = cohort.filter(([visitorHash]) => activityByDate.get(target)?.has(visitorHash)).length;
        return ratio(retained, cohort.length);
      };
      return { date, d1: at(1), d7: at(7), d30: at(30) };
    });
    const overview = {
      totalUsers: firstByUser.size,
      dau,
      wau,
      mau,
      newUsers,
      d1Retention: retention(1),
      d7Retention: retention(7),
      d30Retention: retention(30),
      newUsersSeries,
      retentionSeries,
    };

    const members = await this.readMembers(workspaceId).catch(() => [] as Array<Record<string, unknown>>);

    const assetMap = new Map<string, {
      contentId: string;
      assetType: string;
      name: string;
      exposurePv: number;
      exposureUv: number;
      detailPv: number;
      detailUv: number;
      downloads: number;
      downloadUv: number;
      likes: number;
      dislikes: number;
      favorites: number;
      redirects: number;
      redirectUv: number;
      calls: number;
      callVisitorHashes: Set<string>;
      judgedCalls: number;
      successfulCalls: number;
      callTokenTotal: number;
      callDurations: number[];
    }>();
    const emptyAsset = (contentId: string, catalogRow?: AssetCatalogRow) => ({
      contentId,
      assetType: catalogRow?.assetType ?? 'unknown',
      name: catalogRow?.name || contentId,
      exposurePv: 0,
      exposureUv: 0,
      detailPv: 0,
      detailUv: 0,
      downloads: 0,
      downloadUv: 0,
      likes: 0,
      dislikes: 0,
      favorites: 0,
      redirects: 0,
      redirectUv: 0,
      calls: 0,
      callVisitorHashes: new Set<string>(),
      judgedCalls: 0,
      successfulCalls: 0,
      callTokenTotal: 0,
      callDurations: [],
    });
    for (const row of catalog) assetMap.set(row.contentId, emptyAsset(row.contentId, row));
    for (const row of behaviorAssetRows) {
      const contentId = stringValue(row.contentId);
      if (!contentId || !isBlackCatalogAsset(contentId, row.assetType)) continue;
      const asset = assetMap.get(contentId);
      if (!asset) continue;
      const events = count(row.events);
      const uv = count(row.uv);
      switch (row.action) {
        case 'exposure':
          asset.exposurePv += events;
          asset.exposureUv += uv;
          break;
        case 'view':
        case 'detail':
          asset.detailPv += events;
          asset.detailUv += uv;
          break;
        case 'download':
          asset.downloads += events;
          asset.downloadUv += uv;
          break;
        case 'like':
          asset.likes += events;
          break;
        case 'dislike':
          asset.dislikes += events;
          break;
        case 'favorite':
          asset.favorites += events;
          break;
        case 'redirect':
          asset.redirects += events;
          asset.redirectUv += uv;
          break;
        default:
          break;
      }
      assetMap.set(contentId, asset);
    }
    for (const row of callFactRows) {
      const contentId = stringValue(row.contentId);
      if (!contentId || !isBlackCatalogAsset(contentId, row.assetType)) continue;
      const asset = assetMap.get(contentId);
      if (!asset) continue;
      asset.calls += 1;
      const visitorHash = stringValue(row.visitorHash);
      if (visitorHash) asset.callVisitorHashes.add(visitorHash);
      if (row.success !== null && row.success !== undefined) {
        asset.judgedCalls += 1;
        if (boolValue(row.success)) asset.successfulCalls += 1;
      }
      const inputTokens = count(row.inputTokens);
      const outputTokens = count(row.outputTokens);
      asset.callTokenTotal += inputTokens + outputTokens;
      const duration = count(row.durationMs);
      if (duration > 0) asset.callDurations.push(duration);
      assetMap.set(contentId, asset);
    }
    const assetRows = [...assetMap.values()]
      .map(({ callTokenTotal, callDurations, callVisitorHashes, ...asset }) => ({
        ...asset,
        callUv: callVisitorHashes.size > 0 ? callVisitorHashes.size : null,
        successRate: asset.judgedCalls > 0 ? ratio(asset.successfulCalls, asset.judgedCalls) : null,
        tokenTotal: callTokenTotal > 0 ? callTokenTotal : null,
        p95Ms: callDurations.length
          ? callDurations.sort((a, b) => a - b)[Math.max(0, Math.ceil(callDurations.length * 0.95) - 1)] ?? null
          : null,
        likeRate: ratio(asset.likes, asset.detailUv),
        dislikeRate: ratio(asset.dislikes, asset.detailUv),
        favoriteRate: ratio(asset.favorites, asset.detailUv),
        health: ratio(
          asset.likes + asset.favorites,
          asset.likes + asset.dislikes + asset.favorites,
        ),
      }))
      .sort((a, b) =>
        b.detailPv - a.detailPv || b.exposurePv - a.exposurePv || a.contentId.localeCompare(b.contentId),
      );
    // `total/published` cover the black asset inventory (tool/Skill/Agent and
    // office scenes).  The split cards below are tool-inventory dimensions: an
    // office scene is not itself an external/company tool and its bound count is
    // the number of distinct tool records referenced by scenes.
    const toolInventory = catalog.filter((row) => row.assetType === 'tool' && !row.officeScene);
    const assetSummary = catalog.reduce(
      (summary, row) => {
        summary.total += 1;
        if (row.published) summary.published += 1;
        else summary.unpublished += 1;
        return summary;
      },
      {
        total: 0,
        published: 0,
        unpublished: 0,
        external: 0,
        company: 0,
        officeScenes: 0,
        bound: 0,
      },
    );
    assetSummary.external = toolInventory.filter((row) => row.external).length;
    assetSummary.company = toolInventory.filter((row) => row.company).length;
    assetSummary.officeScenes = catalog.filter((row) => row.officeScene).length;
    assetSummary.bound = toolInventory.filter((row) => row.bound).length;

    const memberActivity = new Map<string, Set<string>>();
    for (const [date, hashes] of activityByDate) {
      if (date < from || date > to) continue;
      for (const hash of hashes) {
        const dates = memberActivity.get(hash) ?? new Set<string>();
        dates.add(date);
        memberActivity.set(hash, dates);
      }
    }
    const callByUser = new Map<string, {
      calls: number;
      tokenTotal: number;
      hasTokens: boolean;
      assetTypes: Set<string>;
    }>();
    const catalogCallFactRows = callFactRows.filter((row) => {
      const contentId = stringValue(row.contentId);
      return Boolean(contentId && isBlackCatalogAsset(contentId, row.assetType));
    });
    for (const row of catalogCallFactRows) {
      const visitorHash = stringValue(row.visitorHash);
      if (!visitorHash) continue;
      const item = callByUser.get(visitorHash) ?? {
        calls: 0,
        tokenTotal: 0,
        hasTokens: false,
        assetTypes: new Set<string>(),
      };
      item.calls += 1;
      const tokenTotal = count(row.inputTokens) + count(row.outputTokens);
      if (tokenTotal > 0) {
        item.tokenTotal += tokenTotal;
        item.hasTokens = true;
      }
      const assetType = stringValue(row.assetType).toLowerCase();
      if (BLACK_ASSET_TYPES.has(assetType)) item.assetTypes.add(assetType);
      callByUser.set(visitorHash, item);
    }
    const userRows = members
      .map((member) => {
        const userId = stringValue(member.id);
        if (!userId) return null;
        const visitorHash = this.accountVisitorHash(workspaceId, userId);
        const firstDate = firstByUser.get(visitorHash);
        const dates = memberActivity.get(visitorHash);
        const lastDate = dates && dates.size ? [...dates].sort().at(-1) : undefined;
        const callFacts = callByUser.get(visitorHash);
        return {
          userId,
          department: Array.isArray(member.deptIds)
            ? member.deptIds.map(String).filter(Boolean).join(',')
            : stringValue(member.department ?? member.deptId),
          role: stringValue(member.role ?? member.platformRole),
          firstUseAt: firstAtByUser.get(visitorHash) ?? (firstDate ? `${firstDate}T00:00:00.000Z` : null),
          lastActiveAt:
            [lastAtByUser.get(visitorHash), lastActivityAtByUser.get(visitorHash), lastDate ? `${lastDate}T00:00:00.000Z` : null]
              .filter((value): value is string => Boolean(value))
              .sort()
              .at(-1) ?? null,
          accessDays: dates?.size ?? 0,
          accessFrequency: ratio(activityEventsByUser.get(visitorHash) ?? 0, days),
          calls: callFacts?.calls ?? 0,
          assetTypes: callFacts ? [...callFacts.assetTypes].sort() : [],
          tokenTotal: callFacts?.hasTokens ? callFacts.tokenTotal : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const departments = new Map<string, { users: number; activeUsers: number; calls: number }>();
    for (const member of members) {
      const userId = stringValue(member.id);
      if (!userId) continue;
      const visitorHash = this.accountVisitorHash(workspaceId, userId);
      const active = memberActivity.has(visitorHash);
      const callCount = callByUser.get(visitorHash)?.calls ?? 0;
      const departmentIds = Array.isArray(member.deptIds)
        ? member.deptIds.map(String).filter(Boolean)
        : [stringValue(member.department ?? member.deptId)].filter(Boolean);
      for (const department of departmentIds) {
        const item = departments.get(department) ?? { users: 0, activeUsers: 0, calls: 0 };
        item.users += 1;
        if (active) item.activeUsers += 1;
        item.calls += callCount;
        departments.set(department, item);
      }
    }
    const departmentRows = [...departments.entries()]
      .map(([department, values]) => ({
        department,
        activeUv: values.activeUsers,
        // Keep the raw member/activity counts available to non-UI consumers while
        // matching the compact frontend contract (`activeUv`).
        users: values.users,
        activeUsers: values.activeUsers,
        calls: values.calls,
      }))
      .sort((a, b) => b.users - a.users || a.department.localeCompare(b.department));

    const callDurations = catalogCallFactRows
      .map((row) => count(row.durationMs))
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
    const judgedCalls = catalogCallFactRows.filter((row) => row.success !== null && row.success !== undefined);
    const successfulCalls = judgedCalls.filter((row) => boolValue(row.success)).length;
    const p95Index = callDurations.length ? Math.max(0, Math.ceil(callDurations.length * 0.95) - 1) : -1;
    const calls = {
      total: catalogCallFactRows.length,
      // A legacy call fact without a success bit is unknown, not an invented failure.
      successRate: judgedCalls.length > 0 ? ratio(successfulCalls, judgedCalls.length) : null,
      p95Ms: p95Index >= 0 ? callDurations[p95Index] ?? null : null,
      tokenTotal: catalogCallFactRows.some(
        (row) => count(row.inputTokens) + count(row.outputTokens) > 0,
      )
        ? catalogCallFactRows.reduce(
            (sum, row) => sum + count(row.inputTokens) + count(row.outputTokens),
            0,
          )
        : null,
    };
    const dimensionedDownloadRows = behaviorDownloadRows.filter((row) => Boolean(stringValue(row.contentId)));
    const reportDownloadRows = dimensionedDownloadRows.length
      ? dimensionedDownloadRows.filter((row) =>
          isBlackCatalogAsset(stringValue(row.contentId), row.assetType),
        )
      : behaviorDownloadRows;
    const rangeDownloadCount = reportDownloadRows.reduce(
      (sum, row) => sum + count(row.downloads),
      0,
    );
    const rangeDownloadUv = dimensionedDownloadRows.length
      ? new Set(
          reportDownloadRows
            .map((row) => stringValue(row.visitorHash))
            .filter(Boolean),
        ).size
      : count(behaviorDownloadRows[0]?.uv);

    return {
      timezone: PORTAL_ANALYTICS_TIME_ZONE,
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
      overview,
      users: {
        rows: userRows,
        departmentRows,
      },
      assets: {
        summary: assetSummary,
        rows: assetRows,
      },
      calls,
      behavior: {
        totals: behaviorTotals,
        currentTotals,
        series: behaviorSeries,
        downloads: {
          count: rangeDownloadCount,
          uv: rangeDownloadUv,
          currentCount: currentTotals.downloads,
          // Historical aggregate rows do not contain visitor identities. Keep this
          // explicitly zero rather than guessing a UV from the download count.
          currentUv: 0,
        },
        trackingStartedAt: normalizedUpdatedAt(behaviorLifetimeRow?.trackingStartedAt),
        updatedAt: normalizedUpdatedAt(behaviorLifetimeRow?.updatedAt),
      },
      updatedAt: normalizedUpdatedAt(totalsRow?.updatedAt),
    };
  }

  private async readCenterRows(
    workspaceId: string,
  ): Promise<Array<{ id: string; kind: string; payload: unknown }>> {
    const client = (this.prisma as unknown as {
      centerRecord?: {
        findMany?: (args: unknown) => Promise<Array<{ id: string; kind: string; payload: unknown }>>;
      };
    }).centerRecord;
    if (!client?.findMany) return [];
    const rows = await client.findMany({
      where: {
        workspaceId,
        kind: {
          in: [
            'marketplace',
            'portal-content',
            'doc:internal-office-scenes',
            'doc:members',
            'agent',
            'skill',
            'tool',
            'workflow',
            'knowledge',
          ],
        },
      },
      select: { id: true, kind: true, payload: true },
    });
    return Array.isArray(rows) ? rows : [];
  }

  private async readAssetCatalog(workspaceId: string): Promise<AssetCatalogRow[]> {
    const rows = await this.readCenterRows(workspaceId);
    const byId = new Map<string, AssetCatalogRow>();
    const boundToolIds = new Set<string>();
    const asRecord = (value: unknown): Record<string, unknown> | null =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    const add = (
      raw: unknown,
      defaults: Partial<AssetCatalogRow> = {},
      prefix = '',
    ): void => {
      const item = asRecord(raw);
      if (!item) return;
      const rawId = stringValue(item.id ?? item.assetId ?? item.toolId ?? item.slug);
      if (!rawId) return;
      const contentId = `${prefix}${rawId}`;
      const tags = Array.isArray(item.tags) ? item.tags.map(String).map((tag) => tag.toLowerCase()) : [];
      const sourceType = stringValue(item.sourceType ?? item.scope ?? item.origin).toLowerCase();
      const category = stringValue(item.category ?? item.marketShelf).toLowerCase();
      const rawType =
        defaults.assetType || stringValue(item.assetType ?? item.kind ?? item.type) || 'unknown';
      const typeText = rawType.toLowerCase().replace(/[_\s]+/g, '-');
      const type =
        typeText.includes('office')
          ? 'office-scene'
          : typeText.includes('skill')
            ? 'skill'
            : typeText.includes('agent')
              ? 'agent'
              : typeText === 'tool' || typeText === 'function' || typeText === 'http' || typeText === 'connector'
                ? 'tool'
                : typeText;
      if (!BLACK_ASSET_TYPES.has(type)) return;
      const published =
        typeof item.published === 'boolean'
          ? item.published
          : boolValue(item.status ?? item.lifecycle ?? item.pipelineStage, defaults.published ?? false);
      const external =
        defaults.external === true ||
        sourceType === 'external' ||
        category === 'external' ||
        tags.includes('external') ||
        tags.includes('ai-saas');
      const company =
        defaults.company === true ||
        sourceType === 'company' ||
        sourceType === 'internal' ||
        category === 'company' ||
        category === 'internal' ||
        category === 'platform' ||
        category === 'connector' ||
        stringValue(item.assetScope ?? item.audience).toLowerCase() === 'company';
      const officeScene = defaults.officeScene === true || type === 'office-scene' || type === 'office_scene';
      const bound =
        defaults.bound === true ||
        boolValue(item.bound ?? item.linked ?? item.isBound, false) ||
        (Array.isArray(item.toolIds) && item.toolIds.length > 0) ||
        (Array.isArray(item.bindings) && item.bindings.length > 0);
      const previous = byId.get(contentId);
      byId.set(contentId, {
        contentId,
        assetType:
          previous && previous.assetType !== 'unknown' ? previous.assetType : type,
        name:
          previous && previous.name !== previous.contentId
            ? previous.name
            : stringValue(item.name ?? item.title ?? item.label ?? item.displayName) || contentId,
        published: Boolean(previous?.published || published),
        external: Boolean(previous?.external || external),
        company: Boolean(previous?.company || company),
        officeScene: Boolean(previous?.officeScene || officeScene),
        bound: Boolean(previous?.bound || bound),
      });
    };

    const marketplaceLists: Record<string, string> = {
      agents: 'agent',
      skills: 'skill',
      tools: 'tool',
      automations: 'workflow',
      workflows: 'workflow',
      kbDocs: 'knowledge',
      knowledge: 'knowledge',
    };
    for (const row of rows) {
      const payload = asRecord(row.payload);
      if (['agent', 'skill', 'tool'].includes(row.kind)) {
        add(payload, { assetType: row.kind });
        continue;
      }
      if (!payload) continue;
      if (row.kind === 'marketplace') {
        for (const [key, assetType] of Object.entries(marketplaceLists)) {
          if (!BLACK_ASSET_TYPES.has(assetType)) continue;
          const values = payload[key];
          if (Array.isArray(values)) values.forEach((item) => add(item, { assetType }));
        }
      } else if (row.kind === 'doc:internal-office-scenes') {
        const values = payload.entries;
        if (Array.isArray(values)) {
          values.forEach((item) => {
            add(item, { assetType: 'office-scene', officeScene: true }, 'office-scene-');
            const scene = asRecord(item);
            if (scene && Array.isArray(scene.toolIds)) {
              scene.toolIds.map(String).filter(Boolean).forEach((id) => boundToolIds.add(id));
            }
          });
        }
      }
    }
    for (const [contentId, asset] of byId) {
      const rawId = contentId.startsWith('office-scene-')
        ? contentId.slice('office-scene-'.length)
        : contentId;
      if (boundToolIds.has(rawId) || boundToolIds.has(contentId)) {
        byId.set(contentId, { ...asset, bound: true });
      }
    }
    return [...byId.values()];
  }

  private async readMembers(workspaceId: string): Promise<Array<Record<string, unknown>>> {
    const rows = await this.readCenterRows(workspaceId);
    const memberRow = rows.find((row) => row.kind === 'doc:members' || row.id === `doc-members-${workspaceId}`);
    if (!memberRow || !memberRow.payload || typeof memberRow.payload !== 'object') return [];
    const payload = memberRow.payload as Record<string, unknown>;
    return Array.isArray(payload.members)
      ? payload.members.filter(
          (member): member is Record<string, unknown> =>
            Boolean(member && typeof member === 'object' && !Array.isArray(member)),
        )
      : [];
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
    const value = inputString(raw, 'invalid_portal_analytics_visitor_id');
    if (!value) return undefined;
    const guestMatch = GUEST_VISITOR_ID_RE.exec(value);
    if (guestMatch?.[1]) return guestMatch[1].toLowerCase();
    if (UUID_V4_RE.test(value)) return value.toLowerCase();
    throw new BadRequestException('invalid_portal_analytics_visitor_id');
  }

  private normalizedClientIp(raw?: string): string {
    const value = inputString(raw, 'invalid_portal_analytics_client_ip').toLowerCase();
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
