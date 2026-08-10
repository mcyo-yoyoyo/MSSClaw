/** localStorage key for runtime API override (Settings → Runtime) */
export const LS_API_KEY = 'mssclaw_api';
/** 与 Nest API_KEY 对应的客户端密钥（可选） */
export const LS_API_AUTH_KEY = 'mssclaw_api_auth';

/** 强制纯浏览器模式（不做 API 探活） */
export function isForceLocalDemo(): boolean {
  return import.meta.env.VITE_FORCE_LOCAL_DEMO === 'true';
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isLoopbackBase(base: string): boolean {
  try {
    const u = new URL(base);
    return isLoopbackHost(u.hostname);
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(base);
  }
}

/**
 * Resolve API base at call time.
 * Priority: localStorage override → VITE_API_BASE_URL → ''（同源 /api，配合 Nginx 反代）
 *
 * 内网生产推荐：Nginx 同源反代 /api → Nest，前端留空即可。
 * 忽略「非本机页面却写死 localhost:3000」的陈旧配置，避免永远连不上共享 API。
 */
export function getApiBase(): string {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LS_API_KEY)?.trim();
    if (stored) {
      const clean = stored.replace(/\/$/, '');
      if (
        isLoopbackBase(clean) &&
        typeof location !== 'undefined' &&
        !isLoopbackHost(location.hostname)
      ) {
        // 陈旧本机地址：回退到构建 env 或同源自动
        return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
      }
      return clean;
    }
  }
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
}

/** 是否应探活 / 启用共享持久化（默认同源探活；可被 FORCE_LOCAL_DEMO 关闭） */
export function isApiEnabled(): boolean {
  if (isForceLocalDemo()) return false;
  return true;
}

/** 展示用：当前生效的 API 根（空 = 同源自动） */
export function getApiBaseLabel(): string {
  const base = getApiBase();
  if (base) return base;
  if (typeof location !== 'undefined') {
    return `${location.origin}（同源 /api）`;
  }
  return '同源 /api';
}

export function clearApiBaseOverride(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(LS_API_KEY);
}

export function setApiBaseOverride(value: string): void {
  if (typeof localStorage === 'undefined') return;
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) {
    clearApiBaseOverride();
    return;
  }
  localStorage.setItem(LS_API_KEY, trimmed);
}

/** Nest OptionalApiKeyGuard：有密钥时注入 X-API-Key */
export function getApiAuthKey(): string {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LS_API_AUTH_KEY)?.trim();
    if (stored) return stored;
  }
  return (import.meta.env.VITE_API_KEY as string | undefined)?.trim() ?? '';
}

export function setApiAuthKey(value: string): void {
  if (typeof localStorage === 'undefined') return;
  const trimmed = value.trim();
  if (!trimmed) {
    localStorage.removeItem(LS_API_AUTH_KEY);
    return;
  }
  localStorage.setItem(LS_API_AUTH_KEY, trimmed);
}

export function apiAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const key = getApiAuthKey();
  if (key) headers['X-API-Key'] = key;
  try {
    const token =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('mssclaw_auth_token')?.trim()
        : '';
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers['X-Session-Token'] = token;
    }
  } catch {
    /* ignore */
  }
  return headers;
}

export function apiUrl(path: string) {
  const base = getApiBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
