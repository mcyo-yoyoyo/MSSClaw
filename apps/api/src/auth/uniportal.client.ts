import { Injectable, Logger } from '@nestjs/common';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { oauthConfig, type OAuthConfig } from './oauth.config';
import { describeError, networkHint, type OAuthTrace } from './oauth-trace';

export type UpstreamFailure =
  | { kind: 'network'; detail: string; hint: string }
  | { kind: 'http'; status: number; detail: string; hint: string }
  | { kind: 'upstream'; errorCode: string; errorDesc: string; hint: string }
  | { kind: 'shape'; detail: string; hint: string };

export type UpstreamResult<T> = { ok: true; data: T; via: 'direct' | 'proxy'; ms: number } | { ok: false; failure: UpstreamFailure };

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
}

/** IDaaS 错误码 → 人话 + 处置建议。对着文档第 6 章翻太慢，直接内联。 */
const UPSTREAM_HINTS: Record<string, string> = {
  E_10001: 'client_id 不正确：核对 OAUTH_CLIENT_ID 与 IDaaS 注册值',
  E_10002: 'client_secret 不正确：核对 OAUTH_CLIENT_SECRET',
  E_10003: 'redirect_uri 与注册值不一致：协议/域名/端口/文根必须逐字符相同',
  E_10009: 'code 无效或已用过：授权码 30 分钟内一次性，不要重复提交同一个 code',
  E_10010: 'access_token 已过期：令牌有效期 30 分钟',
};

function hintForUpstream(errorCode: string, errorDesc: string): string {
  if (UPSTREAM_HINTS[errorCode]) return UPSTREAM_HINTS[errorCode];
  const desc = errorDesc.toLowerCase();
  if (desc.includes('client_id')) return UPSTREAM_HINTS.E_10001;
  if (desc.includes('secret')) return UPSTREAM_HINTS.E_10002;
  if (desc.includes('redirect')) return UPSTREAM_HINTS.E_10003;
  if (desc.includes('code')) return UPSTREAM_HINTS.E_10009;
  return '对照 IDaaS 接口文档「OAuth2.0 错误响应」一节；错误码已完整记入日志';
}

@Injectable()
export class UniPortalClient {
  private readonly logger = new Logger(UniPortalClient.name);

  authorizeUrl(state: string, config: OAuthConfig = oauthConfig()): string {
    const qs = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      scope: config.scope,
      display: config.display,
      state,
    });
    return `${config.issuerBase}/saaslogin1/oauth2/authorize?${qs.toString()}`;
  }

  logoutUrl(config: OAuthConfig = oauthConfig()): string {
    const qs = new URLSearchParams({
      clientId: config.clientId,
      redirect: config.logoutRedirect,
    });
    return `${config.issuerBase}/saaslogin1/oauth2/logout?${qs.toString()}`;
  }

  async exchangeCode(code: string, trace: OAuthTrace, config = oauthConfig()): Promise<UpstreamResult<TokenResponse>> {
    const result = await this.post<TokenResponse>(
      `${config.issuerBase}/saaslogin1/oauth2/accesstoken`,
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code,
      },
      trace,
      'accesstoken',
      config,
    );
    if (result.ok && !result.data.access_token) {
      return {
        ok: false,
        failure: {
          kind: 'shape',
          detail: `accesstoken 返回 200 但没有 access_token，字段: ${Object.keys(result.data).join(',')}`,
          hint: '上游返回结构与文档不符，把日志里的字段列表发给 IDaaS 接口人',
        },
      };
    }
    return result;
  }

  async fetchUserInfo(
    accessToken: string,
    trace: OAuthTrace,
    config = oauthConfig(),
  ): Promise<UpstreamResult<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(
      `${config.issuerBase}/saaslogin1/oauth2/userinfo`,
      { client_id: config.clientId, access_token: accessToken, scope: config.scope },
      trace,
      'userinfo',
      config,
    );
  }

  /** 诊断用：不带凭据打一下 authorize，只验证网络层能不能通到 IDaaS */
  async ping(config = oauthConfig()): Promise<{ ok: boolean; detail: string; ms: number }> {
    const startedAt = Date.now();
    try {
      const res = await this.request(
        `${config.issuerBase}/saaslogin1/oauth2/authorize`,
        undefined,
        config,
        'GET',
      );
      return {
        ok: true,
        detail: `HTTP ${res.status}（${res.via}）—— 能通到 IDaaS`,
        ms: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        detail: `${describeError(error)} —— ${networkHint(error)}`,
        ms: Date.now() - startedAt,
      };
    }
  }

  private async post<T>(
    url: string,
    body: Record<string, unknown>,
    trace: OAuthTrace,
    label: string,
    config: OAuthConfig,
  ): Promise<UpstreamResult<T>> {
    const startedAt = Date.now();
    let res: { status: number; text: string; via: 'direct' | 'proxy' };
    try {
      res = await this.request(url, body, config, 'POST');
    } catch (error) {
      const detail = describeError(error);
      const hint = networkHint(error);
      trace.fail(`${label}_network`, `${detail} · ${hint}`);
      return { ok: false, failure: { kind: 'network', detail, hint } };
    }

    const ms = Date.now() - startedAt;
    let parsed: unknown;
    try {
      parsed = JSON.parse(res.text);
    } catch {
      // 拿到 HTML 通常意味着打到了登录页或反代错误页，而不是接口本身
      const preview = res.text.slice(0, 200).replace(/\s+/g, ' ');
      trace.fail(`${label}_not_json`, `HTTP ${res.status} 返回非 JSON: ${preview}`);
      return {
        ok: false,
        failure: {
          kind: 'shape',
          detail: `HTTP ${res.status} 返回的不是 JSON：${preview}`,
          hint: '多半是 OAUTH_ISSUER_BASE 配错、或被反代/网关拦截返回了 HTML 页面',
        },
      };
    }

    const data = parsed as Record<string, unknown>;
    const errorCode = typeof data?.errorCode === 'string' ? data.errorCode : '';
    if (errorCode) {
      const errorDesc = typeof data.errorDesc === 'string' ? data.errorDesc : '';
      const hint = hintForUpstream(errorCode, errorDesc);
      trace.fail(`${label}_upstream`, `${errorCode} ${errorDesc} · ${hint}`);
      return { ok: false, failure: { kind: 'upstream', errorCode, errorDesc, hint } };
    }
    if (res.status < 200 || res.status >= 300) {
      trace.fail(`${label}_http`, `HTTP ${res.status}`);
      return {
        ok: false,
        failure: {
          kind: 'http',
          status: res.status,
          detail: `HTTP ${res.status}`,
          hint: res.status === 404 ? '接口路径不对，核对 OAUTH_ISSUER_BASE 与 /saaslogin1 文根' : '上游返回非 2xx，详见日志',
        },
      };
    }

    // 只记 key 不记 value：既能看出上游给了什么，又不会把个人信息灌进日志
    trace.step(`${label}_ok`, `${res.via} HTTP ${res.status} ${ms}ms 字段[${Object.keys(data).join(',')}]`);
    if (config.debugUserInfo && label === 'userinfo') {
      this.logger.warn(`[oauth][${trace.id}] userinfo RAW = ${JSON.stringify(data)}`);
    }
    return { ok: true, data: data as T, via: res.via, ms };
  }

  /**
   * 先直连、失败且开了开关才回退代理 —— 与 ai-news-archive.service.ts 同一套路数。
   * 用 undici 自带的 fetch：ProxyAgent 出自这个包，跨 undici 实例传 dispatcher
   * 不保证生效，会出现「配了代理但没走」这种极难排查的情况。
   */
  private async request(
    url: string,
    body: Record<string, unknown> | undefined,
    config: OAuthConfig,
    method: 'GET' | 'POST',
  ): Promise<{ status: number; text: string; via: 'direct' | 'proxy' }> {
    const send = async (via: 'direct' | 'proxy', dispatcher: ProxyAgent | undefined) => {
      const res = await undiciFetch(url, {
        method,
        dispatcher,
        signal: AbortSignal.timeout(config.httpTimeoutMs),
        headers: body
          ? { 'Content-Type': 'application/json', Accept: 'application/json' }
          : { Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        redirect: 'manual',
      });
      return { status: res.status, text: await res.text(), via };
    };

    try {
      return await send('direct', undefined);
    } catch (directError) {
      if (!config.proxyEnabled || !config.proxyUrl) throw directError;
      this.logger.warn(
        `[oauth] 直连失败（${describeError(directError)}），改走代理 ${config.proxyUrl} 重试`,
      );
      const agent = new ProxyAgent(config.proxyUrl);
      try {
        return await send('proxy', agent);
      } finally {
        void agent.close().catch(() => undefined);
      }
    }
  }
}
