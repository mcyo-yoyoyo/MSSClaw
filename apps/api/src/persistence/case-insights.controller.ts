import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Post, Put, Query, UnauthorizedException } from '@nestjs/common';
import { PlatformDocsService } from './platform-docs.service';
import { CaseInsightsService } from './case-insights.service';
// 单租户：原路由参数 workspaceId 固定为平台空间，方法体沿用这个名字（服务层还用它拼 center_record 的记录 id，对应文档迁到正式表时一起去掉）
import { PLATFORM_WORKSPACE_ID as workspaceId } from '../common/platform-workspace';

type ArticleBody = Parameters<CaseInsightsService['create']>[0];

@Controller('case-insights')
export class CaseInsightsController {
  constructor(private readonly articles: CaseInsightsService, private readonly docs: PlatformDocsService) {}

  @Get()
  listPublished() {
    return this.articles.listPublished();
  }

  @Get('ops')
  async listForOps(
    @Query('view') view: string | undefined,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.listForOps(view === 'trash');
  }

  @Get('reads')
  async reads(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.readReport(from, to);
  }

  @Post(':id/read')
  async recordRead(
    @Param('id') id: string,
    @Body() body: { eventId?: string },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    const bearer = authorization?.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : sessionToken;
    const session = await this.docs.me(bearer, workspaceId);
    if (!session.ok) throw new UnauthorizedException('case_insight_login_required');
    return this.articles.recordRead(id, String(session.user.id), typeof body?.eventId === 'string' ? body.eventId : '');
  }

  @Post()
  async create(
    @Body() body: ArticleBody,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.create(body ?? {});
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: ArticleBody,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.update(id, body ?? {});
  }

  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.setStatus(id, body?.version ?? 0, 'publish');
  }

  @Post(':id/unpublish')
  async unpublish(
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.setStatus(id, body?.version ?? 0, 'unpublish');
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.delete(id, body?.version ?? 0);
  }

  @Post(':id/restore')
  async restore(
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.restore(id, body?.version ?? 0);
  }

  private async requireAdmin(workspaceId: string, authorization?: string, sessionToken?: string) {
    const bearer = authorization?.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : sessionToken;
    const session = await this.docs.me(bearer, workspaceId);
    if (!session.ok) throw new UnauthorizedException('case_insight_login_required');
    if (String(session.user.platformRole ?? '') !== 'super_admin') throw new ForbiddenException('case_insight_admin_required');
  }
}
