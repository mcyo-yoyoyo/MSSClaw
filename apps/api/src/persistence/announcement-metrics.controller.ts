import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, NotFoundException, Param, Post, UnauthorizedException } from '@nestjs/common';
import { bearerToken } from '../auth/bearer-token';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformDocsService } from './platform-docs.service';
import { canAccessMenu } from './rbac-store';

@Controller('announcements')
export class AnnouncementMetricsController {
  constructor(private readonly prisma: PrismaService, private readonly docs: PlatformDocsService) {}
  private async user(authorization?: string, token?: string) {
    const session = await this.docs.me(bearerToken(authorization, token));
    if (!session.ok) throw new UnauthorizedException();
    return session.user;
  }
  @Get('metrics')
  async metrics(@Headers('authorization') auth?: string, @Headers('x-session-token') token?: string) {
    const user = await this.user(auth, token);
    if (!await canAccessMenu(this.prisma, user.platformRole, 'portal-ops', true)) throw new ForbiddenException();
    const groups = await this.prisma.announcementEvent.groupBy({ by: ['announcementId', 'kind', 'source', 'memberId'], _count: true });
    const result: Record<string, { shares: number; pv: number; systemPv: number; sharePv: number; uv: number }> = {};
    const users = new Map<string, Set<string>>();
    for (const row of groups) {
      const stats = result[row.announcementId] ??= { shares: 0, pv: 0, systemPv: 0, sharePv: 0, uv: 0 };
      if (row.kind === 'share') stats.shares += row._count;
      else {
        stats.pv += row._count;
        if (row.source === 'share') stats.sharePv += row._count; else stats.systemPv += row._count;
        const seen = users.get(row.announcementId) ?? new Set<string>(); seen.add(row.memberId); users.set(row.announcementId, seen); stats.uv = seen.size;
      }
    }
    return result;
  }
  @Get(':id')
  async detail(@Param('id') id: string, @Headers('authorization') auth?: string, @Headers('x-session-token') token?: string) {
    await this.user(auth, token);
    const row = await this.prisma.stationAnnouncement.findUnique({ where: { id } });
    if (!row?.listed) throw new NotFoundException('announcement_unavailable');
    return row;
  }
  @Post(':id/events')
  async event(@Param('id') id: string, @Body() body: { eventId?: string; kind?: string; source?: string }, @Headers('authorization') auth?: string, @Headers('x-session-token') token?: string) {
    const user = await this.user(auth, token);
    if (!body || !/^[\w-]{16,80}$/.test(body.eventId ?? '') || !['view', 'share'].includes(body.kind ?? '') || !['system', 'share'].includes(body.source ?? '')) throw new BadRequestException();
    const row = await this.prisma.stationAnnouncement.findUnique({ where: { id } });
    if (!row?.listed) throw new NotFoundException('announcement_unavailable');
    await this.prisma.announcementEvent.createMany({ data: [{ id: body.eventId!, announcementId: id, memberId: user.id, kind: body.kind!, source: body.source! }], skipDuplicates: true });
    return { ok: true };
  }
}
