/**
 * 登录模式与 OAuth 回调相关的纯函数。
 *
 * 模式由服务端决定（见 stores/authModeStore），前端不把 client_id / IDaaS 地址
 * 编进产物——测试与生产因此可以共用同一份构建，改后端配置即可切换。
 */

export type AuthMode = 'password' | 'oauth';

/** IDaaS 注册的 redirect_uri 必须以这个路径结尾 */
export const OAUTH_CALLBACK_PATH = 'oauth/callback';

const RETURN_TO_KEY = 'mssclaw_oauth_return_to';
const GATE_INTENT_KEY = 'mssclaw_oauth_gate_intent';

/** 构建期覆盖（仅本地调试用），正常部署不配 */
export function authModeOverride(): AuthMode | null {
  const raw = (import.meta.env.VITE_AUTH_MODE as string | undefined)?.trim().toLowerCase();
  if (raw === 'oauth' || raw === 'password') return raw;
  return null;
}

function basePath(): string {
  return import.meta.env.BASE_URL || '/';
}

/** 当前页面是不是 IDaaS 回跳过来的回调页 */
export function isOAuthCallbackPath(pathname = window.location.pathname): boolean {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.endsWith(`/${OAUTH_CALLBACK_PATH}`) || normalized.endsWith(OAUTH_CALLBACK_PATH);
}

/** 回调页要跳回的应用根（带 Pages 子路径 base） */
export function appRootUrl(): string {
  const base = basePath();
  return `${window.location.origin}${base.endsWith('/') ? base : `${base}/`}`;
}

export interface CallbackParams {
  code: string;
  state: string;
  error: string;
  errorDescription: string;
}

/** 回调参数在 query 而不是 hash：fragment 不会发给服务端，IDaaS 也不保证保留 */
export function readCallbackParams(search = window.location.search): CallbackParams {
  const qs = new URLSearchParams(search);
  return {
    code: qs.get('code') ?? '',
    state: qs.get('state') ?? '',
    error: qs.get('error') ?? qs.get('errorCode') ?? '',
    errorDescription: qs.get('error_description') ?? qs.get('errorDesc') ?? '',
  };
}

/** 抹掉地址栏里的 code/state：避免授权码进浏览历史与 Referer */
export function stripCallbackQuery(): void {
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch {
    /* ignore */
  }
}

export function rememberReturnTo(hash: string): void {
  try {
    if (hash && hash.startsWith('#/')) sessionStorage.setItem(RETURN_TO_KEY, hash);
    else sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    /* ignore */
  }
}

export function takeReturnTo(): string {
  try {
    const value = sessionStorage.getItem(RETURN_TO_KEY) ?? '';
    sessionStorage.removeItem(RETURN_TO_KEY);
    return value.startsWith('#/') ? value : '';
  } catch {
    return '';
  }
}

/**
 * 登录墙是整页跳走的，原动作（点赞/收藏/下载）的上下文会丢。
 * 这里只记「回来后该打开哪个页面」，不记要执行什么写操作——
 * 自动重放下载/提交类动作风险太高，回来后由用户再点一次。
 */
export function rememberGateIntent(label: string): void {
  try {
    if (label) sessionStorage.setItem(GATE_INTENT_KEY, label);
  } catch {
    /* ignore */
  }
}

export function takeGateIntent(): string {
  try {
    const value = sessionStorage.getItem(GATE_INTENT_KEY) ?? '';
    sessionStorage.removeItem(GATE_INTENT_KEY);
    return value;
  } catch {
    return '';
  }
}
