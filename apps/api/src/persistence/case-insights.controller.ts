import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Post, Put, Query, UnauthorizedException } from '@nestjs/common';
import { PlatformDocsService } from './platform-docs.service';
import { CaseInsightsService } from './case-insights.service';

type ArticleBody = Parameters<CaseInsightsService['create']>[1];

@Controller('workspaces/:workspaceId/case-insights')
export class CaseInsightsController {
  constructor(private readonly articles: CaseInsightsService, private readonly docs: PlatformDocsService) {}

  @Get()
  listPublished(@Param('workspaceId') workspaceId: string) {
    return this.articles.listPublished(workspaceId);
  }

  @Get('ops')
  async listForOps(
    @Param('workspaceId') workspaceId: string,
    @Query('view') view: string | undefined,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.listForOps(workspaceId, view === 'trash');
  }

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: ArticleBody,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.create(workspaceId, body ?? {});
  }

  @Put(':id')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: ArticleBody,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.update(workspaceId, id, body ?? {});
  }

  @Post(':id/publish')
  async publish(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.setStatus(workspaceId, id, body?.version ?? 0, 'publish');
  }

  @Post(':id/unpublish')
  async unpublish(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.setStatus(workspaceId, id, body?.version ?? 0, 'unpublish');
  }

  @Delete(':id')
  async delete(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.delete(workspaceId, id, body?.version ?? 0);
  }

  @Post(':id/restore')
  async restore(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { version?: number },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') sessionToken?: string,
  ) {
    await this.requireAdmin(workspaceId, authorization, sessionToken);
    return this.articles.restore(workspaceId, id, body?.version ?? 0);
  }

  private async requireAdmin(workspaceId: string, authorization?: string, sessionToken?: string) {
    const bearer = authorization?.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : sessionToken;
    const session = await this.docs.me(bearer, workspaceId);
    if (!session.ok) throw new UnauthorizedException('case_insight_login_required');
    if (String(session.user.platformRole ?? '') !== 'super_admin') throw new ForbiddenException('case_insight_admin_required');
  }
}
