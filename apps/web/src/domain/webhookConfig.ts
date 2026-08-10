import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
  peekPlatformDocMemory,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

const DOC_KIND = 'warroom-webhook' as const;

export function loadWarroomWebhookUrl(): string {
  const ws = currentWorkspaceId();
  const mem = peekPlatformDocMemory<{ url?: string }>(ws, DOC_KIND);
  return typeof mem?.url === 'string' ? mem.url : '';
}

export function saveWarroomWebhookUrl(url: string) {
  const ws = currentWorkspaceId();
  const payload = { url: url.trim() };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
}

export async function hydrateWarroomWebhookUrl(workspaceId?: string): Promise<void> {
  const ws = workspaceId || currentWorkspaceId();
  if (!canUsePlatformDocsApi()) return;
  try {
    const remote = await fetchPlatformDoc<{ url?: string }>(ws, DOC_KIND);
    if (remote) setPlatformDocMemory(ws, DOC_KIND, remote);
  } catch {
    /* keep memory */
  }
}
