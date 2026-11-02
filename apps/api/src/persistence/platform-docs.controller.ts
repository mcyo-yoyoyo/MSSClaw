import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Delete,
  Param,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PlatformDocsService } from './platform-docs.service';
import { authMode } from '../auth/oauth.config';
import { bearerToken } from '../auth/bearer-token';
import { operationActorFrom } from './operation-log';
import { clearRefreshCookie, readRefreshCookie, withRefreshCookie } from '../auth/refresh-cookie';
// 单租户：原路由参数 workspaceId 固定为平台空间，方法体沿用这个名字（服务层还用它拼 center_record 的记录 id，对应文档迁到正式表时一起去掉）
import { PLATFORM_WORKSPACE_ID as workspaceId } from '../common/platform-workspace';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';

/** 仅 super_admin 可读：内含全站密码 salt + hash */
const ADMIN_ONLY_DOC_KINDS = new Set(['auth-credentials']);

/** 仅 super_admin 可写：平台级配置与账号体系 */
const ADMIN_WRITABLE_DOC_KINDS = new Set([
  'auth-credentials',
  'members',
  'external-tool-layout',
  'internal-office-scenes',
  'home-featured',
]);

/** 工作区成员才能访问的共享凭证文档；游客不得读写真实 API Key / Webhook 令牌。 */
const MEMBER_REQUIRED_DOC_KINDS = new Set(['llm-config', 'warroom-webhook']);
/** 含按人隔离部分的文档：读取时带上会话里的成员 id，写入必须登录 */
const MEMBER_SCOPED_DOC_KINDS = new Set(['asset-approvals']);

/** 已迁移为关系表的旧文档只保留读取兼容，任何客户端都不得再覆盖。 */
const LEGACY_READ_ONLY_DOC_KINDS = new Set(['skill-reviews']);

@Controller('docs')
export class PlatformDocsController {
  constructor(private readonly docs: PlatformDocsService) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    const user = await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    const result = await this.docs.listDocs(workspaceId, String(user.id));
    if (String(user.platformRole ?? '') !== 'super_admin') {
      // 全量文档里含密码表与模型 API Key，非平台运营不得整包拿走。
      for (const kind of ADMIN_ONLY_DOC_KINDS) delete result.docs[kind];
      for (const kind of MEMBER_REQUIRED_DOC_KINDS) delete result.docs[kind];
    }
    return result;
  }

  /**
   * 门户展示类文档（货架布局 / 内部办公场景等）对游客只读开放，
   * 否则未登录访客的市场货架会整体空白；写入仍限 super_admin（见 PUT）。
   *
   * 例外：auth-credentials 是全站密码表（salt + hash），只有 super_admin 能读。
   */
  @Get(':kind')
  async getOne(
    @Param('kind') kind: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    if (ADMIN_ONLY_DOC_KINDS.has(kind)) {
      await this.requireSuperAdmin(workspaceId, kind, authorization, xSessionToken);
    } else if (MEMBER_REQUIRED_DOC_KINDS.has(kind)) {
      await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    }
    const memberId = MEMBER_SCOPED_DOC_KINDS.has(kind)
      ? await this.optionalMemberId(authorization, xSessionToken)
      : undefined;
    return this.docs.getDoc(workspaceId, kind, memberId);
  }

  @Post('station-announcements/items')
  async createStationAnnouncement(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    return this.docs.saveStationAnnouncementItem(body);
  }

  @Put('station-announcements/items/:id')
  async updateStationAnnouncement(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    const record = body && typeof body === 'object' && !Array.isArray(body) ? { ...body, id } : { id };
    return this.docs.saveStationAnnouncementItem(record);
  }

  @Delete('station-announcements/items/:id')
  async deleteStationAnnouncement(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    return this.docs.saveStationAnnouncementItem(undefined, id);
  }

  @Post('ai-news/items')
  async createAiNews(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    return this.docs.saveAiNewsItem(body);
  }

  @Put('ai-news/items/:id')
  async updateAiNews(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    const record = body && typeof body === 'object' && !Array.isArray(body) ? { ...body, id } : { id };
    return this.docs.saveAiNewsItem(record);
  }

  @Delete('ai-news/items/:id')
  async deleteAiNews(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    return this.docs.saveAiNewsItem(undefined, id);
  }

  @Put('internal-office-scenes/order')
  async orderOfficeScenes(
    @Body() body: { ids?: unknown },
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireSuperAdmin(workspaceId, 'internal-office-scenes', authorization, xSessionToken);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
    return this.docs.saveOfficeSceneOrder(ids);
  }

  @Post('internal-office-scenes/items')
  async createOfficeScene(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireSuperAdmin(workspaceId, 'internal-office-scenes', authorization, xSessionToken);
    return this.docs.saveOfficeSceneItem(body);
  }

  @Put('internal-office-scenes/items/:id')
  async updateOfficeScene(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireSuperAdmin(workspaceId, 'internal-office-scenes', authorization, xSessionToken);
    const record = body && typeof body === 'object' && !Array.isArray(body) ? { ...body, id } : { id };
    return this.docs.saveOfficeSceneItem(record);
  }

  @Delete('internal-office-scenes/items/:id')
  async deleteOfficeScene(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    await this.requireSuperAdmin(workspaceId, 'internal-office-scenes', authorization, xSessionToken);
    return this.docs.saveOfficeSceneItem(undefined, id);
  }

  @Put(':kind')
  async putOne(
    @Param('kind') kind: string,
    @Body() body: { payload?: unknown } | Record<string, unknown>,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    if (LEGACY_READ_ONLY_DOC_KINDS.has(kind)) {
      throw new ForbiddenException(`${kind.replace(/-/g, '_')}_legacy_read_only`);
    }
    let actor = undefined;
    if (ADMIN_WRITABLE_DOC_KINDS.has(kind)) {
      const user = await this.requireSuperAdmin(workspaceId, kind, authorization, xSessionToken);
      if (kind === 'internal-office-scenes') actor = operationActorFrom(user);
    } else if (MEMBER_REQUIRED_DOC_KINDS.has(kind)) {
      await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    }
    const memberId = MEMBER_SCOPED_DOC_KINDS.has(kind)
      ? String((await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken)).id)
      : undefined;
    const payload =
      body && typeof body === 'object' && 'payload' in body ? body.payload : body;
    return this.docs.putDoc(workspaceId, kind, payload ?? {}, memberId, actor);
  }

  private async requireSuperAdmin(
    workspaceId: string,
    kind: string,
    authorization?: string,
    xSessionToken?: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.requireWorkspaceMember(
      workspaceId,
      authorization,
      xSessionToken,
    );
    if (String(user.platformRole ?? '') !== 'super_admin') {
      throw new ForbiddenException(`${kind.replace(/-/g, '_')}_admin_required`);
    }
    return user;
  }

  private async optionalMemberId(authorization?: string, xSessionToken?: string): Promise<string | undefined> {
    const session = await this.docs.me(bearerToken(authorization, xSessionToken), workspaceId);
    return session.ok ? String(session.user.id) : undefined;
  }

  private async requireWorkspaceMember(
    workspaceId: string,
    authorization?: string,
    xSessionToken?: string,
  ): Promise<Record<string, unknown>> {
    const session = await this.docs.me(
      bearerToken(authorization, xSessionToken),
      workspaceId,
    );
    if (!session.ok) {
      throw new UnauthorizedException(session.error || 'platform_docs_login_required');
    }
    return session.user;
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly docs: PlatformDocsService) {}

  @Post('login')
  async login(
    @Body()
    body: { email?: string; password?: string; workspaceId?: string; visitorId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 切到企业统一身份登录后必须关死密码通道，否则演示口令仍能绕过 SSO 拿到令牌。
    // 这是整套改造里最关键的一道闸，不要因为"方便调试"打开。
    if (authMode() === 'oauth') {
      throw new ForbiddenException({
        error: 'password_login_disabled',
        message: '当前环境已启用企业统一身份登录，请从登录页跳转认证',
      });
    }
    return withRefreshCookie(req, res, await this.docs.withMenus(await this.docs.login(body ?? {}, req.headers['user-agent'])));
  }

  /** 访问令牌过期后用 Cookie 里的刷新令牌换新令牌；失败返回 401 并清掉 Cookie */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.docs.refresh(readRefreshCookie(req), req.headers['user-agent']);
    if (!result.ok) {
      clearRefreshCookie(req, res);
      throw new UnauthorizedException({ ok: false, error: result.error });
    }
    return withRefreshCookie(req, res, await this.docs.withMenus(result));
  }

  @Get('me')
  async me(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    return this.docs.withMenus(await this.docs.me(bearerToken(authorization, xSessionToken), PLATFORM_WORKSPACE_ID));
  }

  @Post('logout')
  async logout(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    clearRefreshCookie(req, res);
    return this.docs.logout(bearerToken(authorization, xSessionToken), readRefreshCookie(req));
  }
}
