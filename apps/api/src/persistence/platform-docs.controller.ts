import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { PlatformDocsService } from './platform-docs.service';

@Controller('workspaces/:workspaceId/docs')
export class PlatformDocsController {
  constructor(private readonly docs: PlatformDocsService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.docs.listDocs(workspaceId);
  }

  @Get(':kind')
  getOne(@Param('workspaceId') workspaceId: string, @Param('kind') kind: string) {
    return this.docs.getDoc(workspaceId, kind);
  }

  @Put(':kind')
  putOne(
    @Param('workspaceId') workspaceId: string,
    @Param('kind') kind: string,
    @Body() body: { payload?: unknown } | Record<string, unknown>,
  ) {
    const payload =
      body && typeof body === 'object' && 'payload' in body ? body.payload : body;
    return this.docs.putDoc(workspaceId, kind, payload ?? {});
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
    body: { email?: string; password?: string; workspaceId?: string },
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
