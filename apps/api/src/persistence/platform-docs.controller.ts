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

@Controller('workspaces/:workspaceId/docs')
export class PlatformDocsController {
  constructor(private readonly docs: PlatformDocsService) {}

  @Get()
  async list(
    @Param('workspaceId') workspaceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-session-token') xSessionToken: string | undefined,
  ) {
    await this.requireWorkspaceMember(workspaceId, authorization, xSessionToken);
    return this.docs.listDocs(workspaceId);
  }

  /**
   * 门户展示类文档（货架布局 / 内部办公场景）对游客只读开放，
   * 否则未登录访客的市场货架会整体空白；写入仍限 super_admin（见 PUT）。
   */
  @Get(':kind')
  async getOne(@Param('workspaceId') workspaceId: string, @Param('kind') kind: string) {
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
    if (kind === 'external-tool-layout' || kind === 'internal-office-scenes') {
      const user = await this.requireWorkspaceMember(
        workspaceId,
        authorization,
        xSessionToken,
      );
      if (String(user.platformRole ?? '') !== 'super_admin') {
        throw new ForbiddenException(
          kind === 'external-tool-layout'
            ? 'external_tool_layout_admin_required'
            : 'internal_office_scenes_admin_required',
        );
      }
    }
    const payload =
      body && typeof body === 'object' && 'payload' in body ? body.payload : body;
    return this.docs.putDoc(workspaceId, kind, payload ?? {});
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
