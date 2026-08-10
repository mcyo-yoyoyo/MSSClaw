import type { InboxMessage } from '@/domain/inbox';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

/** 内存态：禁止写入 localStorage */
const memoryInbox = new Map<string, InboxMessage[]>();

export function loadInboxMessages(workspaceId: string): InboxMessage[] {
  return memoryInbox.has(workspaceId)
    ? structuredClone(memoryInbox.get(workspaceId)!)
    : [];
}

export function saveInboxMessages(workspaceId: string, messages: InboxMessage[]) {
  memoryInbox.set(workspaceId, structuredClone(messages));
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(workspaceId, 'inbox', { messages });
}

export async function hydrateInboxMessages(workspaceId: string): Promise<InboxMessage[]> {
  if (!canUsePlatformDocsApi()) {
    return loadInboxMessages(workspaceId);
  }
  try {
    const remote = await fetchPlatformDoc<{ messages?: InboxMessage[] }>(
      workspaceId,
      'inbox',
    );
    const messages = Array.isArray(remote?.messages) ? remote.messages : [];
    memoryInbox.set(workspaceId, messages);
    return structuredClone(messages);
  } catch {
    return loadInboxMessages(workspaceId);
  }
}
