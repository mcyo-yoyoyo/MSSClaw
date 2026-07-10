import type { ChatConfig } from '@/domain/chat';
import type { MarketplaceSnapshot } from '@/domain/persistence/storage';
import { apiUrl, isApiEnabled } from '@/api/client';

export async function fetchApiHealth(): Promise<boolean> {
  if (!isApiEnabled()) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(apiUrl('/api/v1/health'), { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSessionsApi(workspaceId: string): Promise<Record<string, ChatConfig> | null> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/sessions`));
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chats }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchMarketplaceApi(workspaceId: string): Promise<Partial<MarketplaceSnapshot> | null> {
  const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/marketplace`));
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
