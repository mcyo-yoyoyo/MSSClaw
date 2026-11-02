import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

const DOC_KIND = 'warroom-webhook' as const;

export function loadWarroomWebhookUrl(): string {
  const mem = peekPlatformDocMemory<{ url?: string }>(DOC_KIND);
  return typeof mem?.url === 'string' ? mem.url : '';
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
