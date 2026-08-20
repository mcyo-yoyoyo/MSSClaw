import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformDocsService } from './platform-docs.service';
import { PortalAnalyticsService } from './portal-analytics.service';

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
  async recordPageView(
    @Param('workspaceId') workspaceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Body() body: { eventId?: string; routeKey?: string },
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    const userId = String(user.id ?? '').trim();
    if (!userId) throw new BadRequestException('session_user_id_missing');
    return this.analytics.recordPageView({
      workspaceId,
      eventId: body?.eventId,
      routeKey: body?.routeKey,
      userId,
    });
  }

  @Get()
  async getReport(
    @Param('workspaceId') workspaceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Query('days') days?: string,
  ) {
    const user = await this.requireSession(workspaceId, authorization, xSessionToken);
    if (String(user.platformRole ?? '') !== 'super_admin') {
      throw new ForbiddenException('portal_analytics_admin_required');
    }
    return this.analytics.getReport(workspaceId, days);
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
}
