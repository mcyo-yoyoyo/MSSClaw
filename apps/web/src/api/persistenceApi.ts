import type { ChatConfig } from '@/domain/chat';
import type { MarketplaceSnapshot } from '@/domain/persistence/storage';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import type { PrototypeAgentSeed, PrototypeSkillSeed, PrototypeToolSeed } from '@/domain/prototype/types';
import type { StationAnnouncement } from '@/domain/stationAnnouncementSeeds';
import { apiUrl, apiAuthHeaders } from '@/api/client';

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

export async function fetchSessionsApi(): Promise<Record<string, ChatConfig> | null> {
  const res = await fetch(apiUrl(`/api/v1/sessions`), {
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = (await res.json()) as { chats?: Record<string, ChatConfig> };
  return payload.chats ?? null;
}

export async function saveSessionsApi(
  chats: Record<string, ChatConfig>,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/sessions`), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ chats }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export interface HomeShowcasePayload {
  configured: boolean;
  channels: { external: string[]; internal: string[]; projects: string[] } | null;
  tools: PrototypeToolSeed[];
  skills: PrototypeSkillSeed[];
  agents: PrototypeAgentSeed[];
  announcements: StationAnnouncement[];
  announcementRevision: number;
  externalToolLayout: unknown;
  officeScenes: unknown;
}

/** 首页展示数据。已保存三栏配置时只含被引用的资产。 */
export async function fetchHomeShowcase(): Promise<HomeShowcasePayload> {
  const res = await fetch(apiUrl('/api/v1/home'), {
    headers: { Accept: 'application/json', ...apiAuthHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`home_${res.status}`);
  return (await res.json()) as HomeShowcasePayload;
}

export async function fetchMarketplaceApi(): Promise<Partial<MarketplaceSnapshot> | null> {
  const res = await fetch(apiUrl(`/api/v1/marketplace`), {
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  if (payload == null) return null;
  return typeof payload === 'object' ? (payload as Partial<MarketplaceSnapshot>) : null;
}

export async function saveMarketplaceApi(
  snapshot: Partial<MarketplaceSnapshot>,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/marketplace`), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/**
 * 工具目录是部署级共享资源，不再挂在某个 workspace 下。
 * 其他 marketplace 资产仍使用上面的 workspace marketplace API。
 */
export interface ToolCatalogPayload {
  tools: PrototypeToolSeed[];
  externalCatalogVersion?: string;
  internalCatalogVersion?: string;
  initialized?: boolean;
  initializedAt?: string;
  migratedAt?: string;
}

export async function fetchToolsApi(): Promise<Partial<ToolCatalogPayload> | null> {
  const res = await fetch(apiUrl('/api/v1/tools'), {
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  if (payload == null) return null;
  if (Array.isArray(payload)) return { tools: payload as PrototypeToolSeed[] };
  return typeof payload === 'object' ? (payload as Partial<ToolCatalogPayload>) : null;
}

export class CatalogConflictError extends Error {
  constructor() {
    super('catalog_conflict');
    this.name = 'CatalogConflictError';
  }
}

/** 目录单条写入。新建 POST，修改 PUT。expectedUpdatedAt 只在更新时带上。 */
export async function saveCatalogItemApi(
  resource: 'agents' | 'skills' | 'tools' | 'kb-docs' | 'automations',
  item: Record<string, unknown>,
  isNew: boolean,
): Promise<Record<string, unknown>> {
  const id = typeof item.id === 'string' ? item.id : '';
  const url = isNew
    ? apiUrl(`/api/v1/catalog/${resource}`)
    : apiUrl(`/api/v1/catalog/${resource}/${encodeURIComponent(id)}`);
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(item),
  });
  if (res.status === 409) throw new CatalogConflictError();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim()) return item;
  const payload = JSON.parse(text) as Record<string, unknown>;
  return payload && typeof payload === 'object' ? payload : item;
}

export async function deleteCatalogItemApi(
  resource: 'agents' | 'skills' | 'tools' | 'kb-docs' | 'automations',
  id: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/catalog/${resource}/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchCatalogItemApi(
  resource: 'agents' | 'skills' | 'tools' | 'kb-docs' | 'automations',
  id: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(apiUrl(`/api/v1/catalog/${resource}/${encodeURIComponent(id)}`), {
    headers: apiAuthHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

export async function saveToolsApi(
  payload: ToolCatalogPayload | PrototypeToolSeed[],
): Promise<void> {
  const body: ToolCatalogPayload = Array.isArray(payload) ? { tools: payload } : payload;
  const res = await fetch(apiUrl('/api/v1/tools'), {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchPortalContentApi(
): Promise<{ items: PortalContentItem[]; revision: number } | null> {
  const res = await fetch(apiUrl(`/api/v1/portal-content`), {
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

export async function savePortalContentItemApi(item: PortalContentItem, isNew: boolean): Promise<void> {
  const url = isNew
    ? apiUrl('/api/v1/portal-content/items')
    : apiUrl(`/api/v1/portal-content/items/${encodeURIComponent(item.id)}`);
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deletePortalContentItemApi(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/portal-content/items/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: apiAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function savePortalContentApi(
  snapshot: { items: PortalContentItem[]; expectedRevision?: number },
): Promise<{ items: PortalContentItem[]; revision: number }> {
  const res = await fetch(apiUrl(`/api/v1/portal-content`), {
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
