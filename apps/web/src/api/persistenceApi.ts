import type { ChatConfig } from '@/domain/chat';
import type { MarketplaceSnapshot } from '@/domain/persistence/storage';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import { apiUrl, isApiEnabled, apiAuthHeaders } from '@/api/client';

export class PortalConflictError extends Error {
  revision?: number;
  constructor(message = 'portal_conflict', revision?: number) {
    super(message);
    this.name = 'PortalConflictError';
    this.revision = revision;
  }
}

function jsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...apiAuthHeaders(),
  };
}

/** 校验真实 Nest health JSON，避免 SPA fallback 把 HTML 200 当成已连接 */
export type ApiHealthInfo = {
  ok: boolean;
  llmEnvConfigured: boolean;
};

export async function fetchApiHealthInfo(): Promise<ApiHealthInfo> {
  if (!isApiEnabled()) return { ok: false, llmEnvConfigured: false };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(apiUrl('/api/v1/health'), {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...apiAuthHeaders() },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, llmEnvConfigured: false };
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { ok: false, llmEnvConfigured: false };
    const body = (await res.json()) as {
      status?: string;
      service?: string;
      llmEnvConfigured?: boolean;
    };
    const ok = body?.status === 'ok' && body?.service === 'mss-claw-api';
    return {
      ok,
      llmEnvConfigured: ok && Boolean(body.llmEnvConfigured),
    };
  } catch {
    return { ok: false, llmEnvConfigured: false };
  }
}

export async function fetchApiHealth(): Promise<boolean> {
  return (await fetchApiHealthInfo()).ok;
}

export async function fetchSessionsApi(workspaceId: string): Promise<Record<string, ChatConfig> | null> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/sessions`), {
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = (await res.json()) as { chats?: Record<string, ChatConfig> };
  return payload.chats ?? null;
}

export async function saveSessionsApi(
  workspaceId: string,
  chats: Record<string, ChatConfig>,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/sessions`), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ chats }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchMarketplaceApi(workspaceId: string): Promise<Partial<MarketplaceSnapshot> | null> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/marketplace`), {
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  if (payload == null) return null;
  return typeof payload === 'object' ? (payload as Partial<MarketplaceSnapshot>) : null;
}

export async function saveMarketplaceApi(
  workspaceId: string,
  snapshot: MarketplaceSnapshot,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/marketplace`), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchPortalContentApi(
  workspaceId: string,
): Promise<{ items: PortalContentItem[]; revision: number } | null> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/portal-content`), {
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  if (payload == null) return null;
  if (typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)) {
    const revision =
      typeof (payload as { revision?: unknown }).revision === 'number'
        ? (payload as { revision: number }).revision
        : 0;
    return {
      items: (payload as { items: PortalContentItem[] }).items,
      revision,
    };
  }
  return null;
}

export async function savePortalContentApi(
  workspaceId: string,
  snapshot: { items: PortalContentItem[]; expectedRevision?: number },
): Promise<{ items: PortalContentItem[]; revision: number }> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/portal-content`), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({
      items: snapshot.items,
      expectedRevision: snapshot.expectedRevision ?? 0,
    }),
  });
  if (res.status === 409) {
    let revision: number | undefined;
    try {
      const body = (await res.json()) as { revision?: number };
      revision = body.revision;
    } catch {
      /* ignore */
    }
    throw new PortalConflictError('portal_conflict', revision);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as {
    items?: PortalContentItem[];
    revision?: number;
  };
  return {
    items: Array.isArray(body.items) ? body.items : snapshot.items,
    revision: typeof body.revision === 'number' ? body.revision : (snapshot.expectedRevision ?? 0) + 1,
  };
}
