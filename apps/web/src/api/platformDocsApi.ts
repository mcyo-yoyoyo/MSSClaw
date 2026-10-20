/**
 * 平台配置文档 API：替代原 localStorage 配置落盘。
 * 对应 Nest：GET/PUT /api/v1/docs/:kind
 */

import { apiAuthHeaders, apiUrl, fetchWithTimeout, isApiEnabled } from '@/api/client';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export type PlatformDocKind =
  | 'members'
  | 'auth-credentials'
  | 'nav-presentation'
  | 'workspace-config'
  | 'ai-news'
  | 'ai-brief-email-copy'
  | 'station-announcements'
  | 'plaza-howto'
  | 'mss-build-stats'
  | 'business-scenario-catalog'
  | 'external-taxonomy'
  | 'external-tool-layout'
  | 'internal-office-scenes'
  | 'home-featured'
  | 'org-taxonomy'
  | 'market-featured'
  | 'audit-log'
  | 'asset-approvals'
  | 'skill-reviews'
  | 'llm-config'
  | 'warroom-webhook'
  | 'security-policy'
  | 'demo-content';

function jsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...apiAuthHeaders(),
  };
}

export function canUsePlatformDocsApi(): boolean {
  return isApiEnabled() && useWorkspaceStore.getState().apiConnected;
}

/** 内存态：会话内缓存，禁止写入 localStorage */
const memoryDocs = new Map<string, unknown>();

export function peekPlatformDocMemory<T>(kind: PlatformDocKind): T | null {
  const v = memoryDocs.get(kind);
  return (v as T) ?? null;
}

export function setPlatformDocMemory(kind: PlatformDocKind, payload: unknown) {
  memoryDocs.set(kind, payload);
}

export async function fetchPlatformDoc<T>(
  kind: PlatformDocKind,
  opts?: { fresh?: boolean },
): Promise<T | null> {
  if (!canUsePlatformDocsApi()) {
    // 未连 API：fresh 读拒绝用内存冒充库；普通读仅会话内存兜底（兼容其它模块）
    if (opts?.fresh) return null;
    return peekPlatformDocMemory<T>(kind);
  }
  if (!opts?.fresh) {
    const cached = peekPlatformDocMemory<T>(kind);
    if (cached != null) return cached;
  }
  const res = await fetch(apiUrl(`/api/v1/docs/${kind}`), {
    headers: {
      Accept: 'application/json',
      ...apiAuthHeaders(),
      ...(opts?.fresh ? { 'Cache-Control': 'no-cache' } : {}),
    },
    cache: opts?.fresh ? 'no-store' : 'default',
  });
  if (!res.ok) throw new Error(`docs_get_${kind}_${res.status}`);
  const body = (await res.json()) as { payload?: T };
  const payload = (body.payload ?? null) as T | null;
  if (payload != null) setPlatformDocMemory(kind, payload);
  return payload;
}

export async function savePlatformDoc(
  kind: PlatformDocKind,
  payload: unknown,
): Promise<void> {
  if (!canUsePlatformDocsApi()) {
    throw new Error('shared_api_required');
  }
  const res = await fetch(apiUrl(`/api/v1/docs/${kind}`), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw new Error(`docs_put_${kind}_${res.status}`);

  // 只有服务端确认写入后，才能让会话缓存代表数据库状态。服务端可能会补 revision
  // 等规范化字段，优先缓存响应里的 canonical payload；旧服务端无响应 payload 时
  // 再回退到本次已成功写入的请求值。
  let savedPayload = payload;
  if ((res.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      const body = (await res.json()) as { payload?: unknown };
      if (body && Object.prototype.hasOwnProperty.call(body, 'payload')) {
        savedPayload = body.payload;
      }
    } catch {
      // 写入已经是 2xx；响应体解析失败不应把一次成功写入伪装成失败。
    }
  }
  setPlatformDocMemory(kind, savedPayload);
}

export async function loginWithApi(params: {
  email: string;
  password: string;
  visitorId?: string;
}): Promise<
  | {
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
      };
    }
  | { ok: false; error: string }
> {
  if (!isApiEnabled()) {
    return { ok: false, error: '共享服务未启用' };
  }
  const res = await fetchWithTimeout(
    apiUrl('/api/v1/auth/login'),
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(params),
    },
    8000,
  );
  const ct = res.headers.get('content-type') || '';
  const looksLikeApi = ct.includes('application/json');
  if (!res.ok) {
    // 静态站（GitHub Pages）对 POST /api 常回 404/405 HTML，不能当成密码错误
    if (
      res.status >= 500 ||
      res.status === 404 ||
      res.status === 405 ||
      res.status === 408 ||
      !looksLikeApi
    ) {
      throw new Error(`login_unreachable_${res.status}`);
    }
    try {
      const body = (await res.json()) as { error?: string };
      return { ok: false, error: body.error || `登录失败（HTTP ${res.status}）` };
    } catch {
      throw new Error(`login_unreachable_${res.status}`);
    }
  }
  if (!looksLikeApi) {
    throw new Error('login_unreachable_not_json');
  }
  return (await res.json()) as
    | {
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
        };
      }
    | { ok: false; error: string };
}

export async function fetchSessionMeApi(): Promise<
  | {
      ok: true;
      user: {
        id: string;
        name: string;
        email: string;
        platformRole: string;
        avatar: string;
        deptIds: string[];
        regionId: string | null;
      };
    }
  | { ok: false; error: string }
> {
  if (!isApiEnabled()) return { ok: false, error: '共享服务未启用' };
  const res = await fetchWithTimeout(
    apiUrl('/api/v1/auth/me'),
    {
      headers: { Accept: 'application/json', ...apiAuthHeaders() },
    },
    8000,
  );
  if (!res.ok) return { ok: false, error: `会话校验失败（HTTP ${res.status}）` };
  return (await res.json()) as
    | {
        ok: true;
        user: {
          id: string;
          name: string;
          email: string;
          platformRole: string;
          avatar: string;
          deptIds: string[];
          regionId: string | null;
        };
      }
    | { ok: false; error: string };
}

export async function logoutWithApi(): Promise<void> {
  if (!isApiEnabled()) return;
  try {
    await fetchWithTimeout(apiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: '{}',
    });
  } catch {
    /* ignore */
  }
}

/** 防抖写文档，减少连续编辑打爆 API。被合并调用的 Promise 随最终写入一起结算。 */
interface PendingDocSave {
  timer: ReturnType<typeof setTimeout>;
  waiters: Array<{ resolve: () => void; reject: (reason?: unknown) => void }>;
}

const saveTimers = new Map<string, PendingDocSave>();

export function scheduleSavePlatformDoc(
  kind: PlatformDocKind,
  payload: unknown,
  ms = 500,
): Promise<void> {
  const key = kind;
  return new Promise((resolve, reject) => {
    const prev = saveTimers.get(key);
    if (prev) clearTimeout(prev.timer);
    const waiters = [...(prev?.waiters ?? []), { resolve, reject }];
    const timer = setTimeout(() => {
      saveTimers.delete(key);
      void savePlatformDoc(kind, payload).then(
        () => waiters.forEach((waiter) => waiter.resolve()),
        (reason) => waiters.forEach((waiter) => waiter.reject(reason)),
      );
    }, ms);
    saveTimers.set(key, { timer, waiters });
  });
}
