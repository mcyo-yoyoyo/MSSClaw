import { apiAuthHeaders, apiUrl, isApiEnabled } from '@/api/client';
import type { AuthMode } from '@/domain/authMode';

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Accept: 'application/json', ...apiAuthHeaders() };
}

export interface AuthConfigResult {
  mode: AuthMode;
  providerLabel: string;
  /** false = 服务端 OAuth 配置不完整，登录按钮点了必失败，要显式提示而不是让用户白点 */
  ready: boolean;
}

/**
 * 读登录模式。优先打 /health（永远不被 API_KEY 守卫拦，且启动本来就要探活），
 * 拿不到再退到 /auth/config。两者都失败则由调用方落回 password。
 */
export async function fetchAuthConfig(): Promise<AuthConfigResult | null> {
  if (!isApiEnabled()) return null;
  try {
    const res = await fetch(apiUrl('/api/v1/health'), { headers: jsonHeaders() });
    if (res.ok) {
      const body = (await res.json()) as { auth?: { mode?: string; ready?: boolean } };
      if (body?.auth?.mode) {
        return {
          mode: body.auth.mode === 'oauth' ? 'oauth' : 'password',
          providerLabel: body.auth.mode === 'oauth' ? '企业统一身份认证' : '账号密码',
          ready: body.auth.ready !== false,
        };
      }
    }
  } catch {
    /* 退到 /auth/config */
  }
  try {
    const res = await fetch(apiUrl('/api/v1/auth/config'), { headers: jsonHeaders() });
    if (!res.ok) return null;
    const body = (await res.json()) as AuthConfigResult;
    return {
      mode: body.mode === 'oauth' ? 'oauth' : 'password',
      providerLabel: body.providerLabel || '企业统一身份认证',
      ready: body.ready !== false,
    };
  } catch {
    return null;
  }
}

export type AuthorizeUrlResult =
  | { ok: true; url: string; traceId: string }
  | { ok: false; code: string; error: string; detail: string; hint: string; traceId: string };

export async function fetchAuthorizeUrl(params: {
  workspaceId?: string;
  returnTo?: string;
}): Promise<AuthorizeUrlResult> {
  const qs = new URLSearchParams();
  if (params.workspaceId) qs.set('workspaceId', params.workspaceId);
  if (params.returnTo) qs.set('returnTo', params.returnTo);
  const res = await fetch(apiUrl(`/api/v1/auth/oauth/authorize-url?${qs.toString()}`), {
    headers: jsonHeaders(),
  });
  if (!res.ok) {
    return {
      ok: false,
      code: res.status === 404 ? 'oauth_not_enabled' : `http_${res.status}`,
      error: '无法发起统一身份登录',
      detail: `GET /auth/oauth/authorize-url 返回 HTTP ${res.status}`,
      hint:
        res.status === 404
          ? '后端 AUTH_MODE 不是 oauth，或该版本 API 尚未部署统一身份登录'
          : '查看 API 日志中 [oauth] 开头的行',
      traceId: '',
    };
  }
  return (await res.json()) as AuthorizeUrlResult;
}

export interface OAuthCallbackSuccess {
  ok: true;
  token: string;
  expiresAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    platformRole: string;
    avatar: string;
    deptIds: string[];
    regionId: string | null;
    workspaceId: string;
    externalId?: string | null;
    postName?: string | null;
    orgPath?: string | null;
  };
  traceId: string;
  provisioned: boolean;
}

export interface OAuthCallbackFailure {
  ok: false;
  code: string;
  error: string;
  detail: string;
  hint: string;
  traceId: string;
  steps: string[];
}

export async function completeOAuthLogin(params: {
  code: string;
  state: string;
  workspaceId?: string;
  visitorId?: string;
}): Promise<OAuthCallbackSuccess | OAuthCallbackFailure> {
  try {
    const res = await fetch(apiUrl('/api/v1/auth/oauth/callback'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(params),
    });
    // 后端对业务失败也回 200 + ok:false，这里的非 2xx 属于网关/守卫层面的问题
    if (!res.ok) {
      return {
        ok: false,
        code: `http_${res.status}`,
        error: '登录请求被拒绝',
        detail: `POST /auth/oauth/callback 返回 HTTP ${res.status}`,
        hint:
          res.status === 401
            ? '后端开了 API_KEY，但前端没带 X-API-Key（检查 VITE_API_KEY 或运行时偏好设置）'
            : res.status === 404
              ? '该版本 API 没有统一身份登录路由，确认部署的是最新构建'
              : '查看 API 日志中 [oauth] 开头的行',
        traceId: '',
        steps: [],
      };
    }
    return (await res.json()) as OAuthCallbackSuccess | OAuthCallbackFailure;
  } catch (error) {
    return {
      ok: false,
      code: 'network_unreachable',
      error: '连不上服务端',
      detail: error instanceof Error ? error.message : String(error),
      hint: '确认 Nginx 已反代 /api 到 Nest，且 API 进程在运行',
      traceId: '',
      steps: [],
    };
  }
}

export async function fetchOAuthLogoutUrl(): Promise<string> {
  try {
    const res = await fetch(apiUrl('/api/v1/auth/oauth/logout-url'), { headers: jsonHeaders() });
    if (!res.ok) return '';
    const body = (await res.json()) as { url?: string };
    return body.url ?? '';
  } catch {
    return '';
  }
}
