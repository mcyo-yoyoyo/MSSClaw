/**
 * 平台配置文档 API：替代原 localStorage 配置落盘。
 * 对应 Nest：GET/PUT /api/v1/workspaces/:id/docs/:kind
 */

import { apiUrl, isApiEnabled, apiAuthHeaders } from '@/api/client';
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
  | 'internal-office-scenes'
  | 'org-taxonomy'
  | 'market-featured'
  | 'market-favorites'
  | 'market-recent'
  | 'content-engagement'
  | 'audit-log'
  | 'ai-news-prefs'
  | 'asset-approvals'
  | 'skill-reviews'
  | 'llm-config'
  | 'inbox'
  | 'warroom-webhook'
  | 'security-policy'
  | 'auth-sessions'
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

export function currentWorkspaceId(): string {
  return useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
}

/** 内存态：会话内缓存，禁止写入 localStorage */
const memoryDocs = new Map<string, unknown>();

function memKey(workspaceId: string, kind: string) {
  return `${workspaceId}::${kind}`;
}

export function peekPlatformDocMemory<T>(workspaceId: string, kind: PlatformDocKind): T | null {
  const v = memoryDocs.get(memKey(workspaceId, kind));
  return (v as T) ?? null;
}

export function setPlatformDocMemory(workspaceId: string, kind: PlatformDocKind, payload: unknown) {
  memoryDocs.set(memKey(workspaceId, kind), payload);
}

export async function fetchPlatformDoc<T>(
  workspaceId: string,
  kind: PlatformDocKind,
  opts?: { fresh?: boolean },
): Promise<T | null> {
  if (!canUsePlatformDocsApi()) {
    // 未连 API：fresh 读拒绝用内存冒充库；普通读仅会话内存兜底（兼容其它模块）
    if (opts?.fresh) return null;
    return peekPlatformDocMemory<T>(workspaceId, kind);
  }
  if (!opts?.fresh) {
    const cached = peekPlatformDocMemory<T>(workspaceId, kind);
    if (cached != null) return cached;
  }
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/docs/${kind}`), {
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
  if (payload != null) setPlatformDocMemory(workspaceId, kind, payload);
  return payload;
}

export async function savePlatformDoc(
  workspaceId: string,
  kind: PlatformDocKind,
  payload: unknown,
): Promise<void> {
  setPlatformDocMemory(workspaceId, kind, payload);
  if (!canUsePlatformDocsApi()) {
    throw new Error('shared_api_required');
  }
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/docs/${kind}`), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw new Error(`docs_put_${kind}_${res.status}`);
}

export async function loginWithApi(params: {
  email: string;
  password: string;
  workspaceId?: string;
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
        workspaceId: string;
      };
    }
  | { ok: false; error: string }
> {
  if (!isApiEnabled()) {
    return { ok: false, error: '共享服务未启用' };
  }
  const res = await fetch(apiUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    return { ok: false, error: `登录服务异常（HTTP ${res.status}）` };
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
          workspaceId: string;
        };
      }
    | { ok: false; error: string };
}

export async function fetchSessionMeApi(workspaceId?: string): Promise<
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
        workspaceId: string;
      };
    }
  | { ok: false; error: string }
> {
  if (!isApiEnabled()) return { ok: false, error: '共享服务未启用' };
  const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  const res = await fetch(apiUrl(`/api/v1/auth/me${qs}`), {
    headers: { Accept: 'application/json', ...apiAuthHeaders() },
  });
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
          workspaceId: string;
        };
      }
    | { ok: false; error: string };
}

export async function logoutWithApi(workspaceId?: string): Promise<void> {
  if (!isApiEnabled()) return;
  try {
    await fetch(apiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ workspaceId }),
    });
  } catch {
    /* ignore */
  }
}

/** 防抖写文档，减少连续编辑打爆 API */
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleSavePlatformDoc(
  workspaceId: string,
  kind: PlatformDocKind,
  payload: unknown,
  ms = 500,
): Promise<void> {
  const key = memKey(workspaceId, kind);
  setPlatformDocMemory(workspaceId, kind, payload);
  return new Promise((resolve, reject) => {
    const prev = saveTimers.get(key);
    if (prev) clearTimeout(prev);
    saveTimers.set(
      key,
      setTimeout(() => {
        saveTimers.delete(key);
        void savePlatformDoc(workspaceId, kind, payload).then(resolve).catch(reject);
      }, ms),
    );
  });
}
