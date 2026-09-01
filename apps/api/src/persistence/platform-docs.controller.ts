import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformDocsService } from './platform-docs.service';

/** 仅 super_admin 可读：内含全站密码 salt + hash */
const ADMIN_ONLY_DOC_KINDS = new Set(['auth-credentials']);

/** 仅 super_admin 可写：平台级配置与账号体系 */
const ADMIN_WRITABLE_DOC_KINDS = new Set([
  'auth-credentials',
  'members',
  'external-tool-layout',
  'internal-office-scenes',
]);

/** 工作区成员才能访问的共享凭证文档；游客不得读写真实 API Key。 */
const MEMBER_REQUIRED_DOC_KINDS = new Set(['llm-config']);

/** 已迁移为关系表的旧文档只保留读取兼容，任何客户端都不得再覆盖。 */
const LEGACY_READ_ONLY_DOC_KINDS = new Set(['content-engagement']);

@Controller('workspaces/:workspaceId/docs')
export class PlatformDocsController {
  constructor(private readonly docs: PlatformDocsService) {}

  @Get()
  async list(
    @Param('workspaceId') workspaceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    const user = await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    const result = await this.docs.listDocs(workspaceId);
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
    @Param('workspaceId') workspaceId: string,
    @Param('kind') kind: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    if (ADMIN_ONLY_DOC_KINDS.has(kind)) {
      await this.requireSuperAdmin(workspaceId, kind, authorization, xSessionToken);
    } else if (MEMBER_REQUIRED_DOC_KINDS.has(kind)) {
      await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    }
    return this.docs.getDoc(workspaceId, kind);
  }

  @Put(':kind')
  async putOne(
    @Param('workspaceId') workspaceId: string,
    @Param('kind') kind: string,
    @Body() body: { payload?: unknown } | Record<string, unknown>,
    @Headers('authorization') authorization?: string,
    @Headers('x-session-token') xSessionToken?: string,
  ) {
    if (LEGACY_READ_ONLY_DOC_KINDS.has(kind)) {
      throw new ForbiddenException(`${kind.replace(/-/g, '_')}_legacy_read_only`);
    }
    if (ADMIN_WRITABLE_DOC_KINDS.has(kind)) {
      await this.requireSuperAdmin(workspaceId, kind, authorization, xSessionToken);
    } else if (MEMBER_REQUIRED_DOC_KINDS.has(kind)) {
      await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    }
    const payload =
      body && typeof body === 'object' && 'payload' in body ? body.payload : body;
    return this.docs.putDoc(workspaceId, kind, payload ?? {});
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

function bearerToken(authorization?: string, xSessionToken?: string): string | undefined {
  const raw = (authorization ?? '').trim();
  if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim() || undefined;
  const alt = (xSessionToken ?? '').trim();
  return alt || undefined;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly docs: PlatformDocsService) {}

  @Post('login')
  login(
    @Body()
    body: { email?: string; password?: string; workspaceId?: string; visitorId?: string },
  ) {
    return this.docs.login(body ?? {});
  }

  @Get('me')
  me(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.docs.me(bearerToken(authorization, xSessionToken), workspaceId || 'ws-mss-ai');
  }

  @Post('logout')
  logout(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
    @Body() body: { workspaceId?: string },
  ) {
    return this.docs.logout(
      bearerToken(authorization, xSessionToken),
      body?.workspaceId || 'ws-mss-ai',
    );
  }
}
