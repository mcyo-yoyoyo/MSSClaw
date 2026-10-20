import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
  peekPlatformDocMemory,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

const DOC_KIND = 'warroom-webhook' as const;

export function loadWarroomWebhookUrl(): string {
  const mem = peekPlatformDocMemory<{ url?: string }>(DOC_KIND);
  return typeof mem?.url === 'string' ? mem.url : '';
}

export function saveWarroomWebhookUrl(url: string) {
  const payload = { url: url.trim() };
  setPlatformDocMemory(DOC_KIND, payload);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(DOC_KIND, payload);
}

export async function hydrateWarroomWebhookUrl(): Promise<void> {
  if (!canUsePlatformDocsApi()) return;
  try {
    const remote = await fetchPlatformDoc<{ url?: string }>(DOC_KIND);
    if (remote) setPlatformDocMemory(DOC_KIND, remote);
  } catch {
    /* keep memory */
  }
}
