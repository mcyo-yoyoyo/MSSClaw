import { Body, Controller, Get, HttpCode, NotFoundException, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthOAuthService } from './auth-oauth.service';
import { oauthConfig } from './oauth.config';
import { withRefreshCookie } from './refresh-cookie';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';

/** returnTo 只允许站内 hash 路由，避免变成开放重定向 */
function safeReturnTo(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length > 200) return '';
  if (!raw.startsWith('#/')) return '';
  if (/[\r\n]/.test(raw)) return '';
  return raw;
}

@Controller('auth')
export class AuthOAuthController {
  constructor(private readonly oauth: AuthOAuthService) {}

  /** 前端启动时读它决定渲染哪套登录 UI；免鉴权，不含任何 secret */
  @Get('config')
  config() {
    return this.oauth.authConfig();
  }

  @Get('oauth/authorize-url')
  authorizeUrl(@Query('returnTo') returnTo?: string) {
    if (oauthConfig().mode !== 'oauth') {
      throw new NotFoundException('oauth_not_enabled');
    }
    return this.oauth.buildAuthorizeUrl(PLATFORM_WORKSPACE_ID, safeReturnTo(returnTo));
  }

  @Post('oauth/callback')
  @HttpCode(200)
  async callback(
    @Body()
    body: { code?: string; state?: string; visitorId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 失败也返回 200 + ok:false：前端要把 code/detail/traceId 完整渲染出来，
    // 而不是被 fetch 的非 2xx 分支吞成一句"网络错误"。
    const result = await this.oauth.handleCallback({
      code: String(body?.code ?? '').trim(),
      state: String(body?.state ?? '').trim(),
      visitorId: body?.visitorId,
      userAgent: req.headers['user-agent'],
    });
    return withRefreshCookie(req, res, result);
  }

  @Get('oauth/logout-url')
  logoutUrl() {
    return this.oauth.logoutUrl();
  }

  /**
   * 部署自检。填完 .env.oauth 后第一件事就是打它。
   * 只回「配没配 / 格式对不对 / 网络通不通」，不回 secret 值。
   * 上线稳定后可用 OAUTH_DIAGNOSTICS=0 关闭。
   */
  @Get('oauth/diagnostics')
  diagnostics(@Query('ping') ping?: string) {
    if (!oauthConfig().diagnosticsEnabled) throw new NotFoundException('diagnostics_disabled');
    return this.oauth.diagnostics(ping !== '0' && ping !== 'false');
  }
}
