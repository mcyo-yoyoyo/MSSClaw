import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Ip,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PlatformDocsService } from './platform-docs.service';
import { PortalAnalyticsService } from './portal-analytics.service';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUEST_VISITOR_ID_RE =
  /^guest:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

function trimmedInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sessionToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  return (xSessionToken ?? '').trim() || undefined;
}

@Controller('workspaces/:workspaceId/portal-analytics')
export class PortalAnalyticsController {
  constructor(
    private readonly analytics: PortalAnalyticsService,
    private readonly docs: PlatformDocsService,
  ) {}

  @Post('views')
  // This endpoint has its own silent visitor/IP limiter. The global throttler would expose
  // a 429 response, which gives anonymous traffic a useful signal for tuning a flood.
  @SkipThrottle()
  async recordPageView(
    @Param('workspaceId') workspaceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Body() body: { eventId?: string; routeKey?: string; visitorId?: string },
    @Ip() clientIp?: string,
  ) {
    const token = sessionToken(authorization, xSessionToken);
    if (!token) {
      const guestVisitorId = this.requireGuestVisitorId(body?.visitorId);
      return this.analytics.recordPageView({
        workspaceId,
        eventId: body?.eventId,
        routeKey: body?.routeKey,
        visitorType: 'guest',
        rawVisitorId: guestVisitorId,
        journeyVisitorId: guestVisitorId,
        clientIp,
      });
    }

    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    const userId = String(user.id ?? '').trim();
    if (!userId) throw new BadRequestException('session_user_id_missing');
    return this.analytics.recordPageView({
      workspaceId,
      eventId: body?.eventId,
      routeKey: body?.routeKey,
      visitorType: 'user',
      rawVisitorId: userId,
      journeyVisitorId: this.optionalJourneyVisitorId(body?.visitorId),
      clientIp,
    });
  }

  @Post('gate-events')
  @SkipThrottle()
  async recordGateHit(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      eventId?: string;
      action?: string;
      routeKey?: string;
      visitorId?: string;
    },
    @Ip() clientIp?: string,
  ) {
    return this.analytics.recordGateHit({
      workspaceId,
      eventId: body?.eventId,
      action: body?.action,
      routeKey: body?.routeKey,
      visitorId: this.requireGuestVisitorId(body?.visitorId),
      clientIp,
    });
  }

  @Get()
  async getReport(
    @Param('workspaceId') workspaceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    if (String(user.platformRole ?? '') !== 'super_admin') {
      throw new ForbiddenException('portal_analytics_admin_required');
    }
    return this.analytics.getReport(workspaceId, days, from, to);
  }

  private async requireSession(
    workspaceId: string,
    authorization?: string,
    xSessionToken?: string,
  ): Promise<Record<string, unknown>> {
    const token = sessionToken(authorization, xSessionToken);
    const session = await this.docs.me(token, workspaceId);
    if (!session.ok) {
      throw new UnauthorizedException(session.error || 'portal_analytics_login_required');
    }
    return session.user;
  }

  private requireGuestVisitorId(raw?: unknown): string {
    const match = GUEST_VISITOR_ID_RE.exec(trimmedInput(raw));
    if (!match?.[1]) throw new BadRequestException('invalid_guest_visitor_id');
    return match[1].toLowerCase();
  }

  private optionalJourneyVisitorId(raw?: unknown): string | undefined {
    if (raw !== undefined && raw !== null && typeof raw !== 'string') {
      throw new BadRequestException('invalid_portal_analytics_visitor_id');
    }
    const value = trimmedInput(raw);
    if (!value) return undefined;
    const guestMatch = GUEST_VISITOR_ID_RE.exec(value);
    if (guestMatch?.[1]) return guestMatch[1].toLowerCase();
    if (UUID_V4_RE.test(value)) return value.toLowerCase();
    throw new BadRequestException('invalid_portal_analytics_visitor_id');
  }
}
