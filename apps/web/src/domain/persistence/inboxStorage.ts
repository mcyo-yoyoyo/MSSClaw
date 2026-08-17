import type { InboxMessage } from '@/domain/inbox';
import { canUseInboxApi, fetchInboxMessages } from '@/api/inboxApi';

/** 内存态：禁止写入 localStorage */
const memoryInbox = new Map<string, InboxMessage[]>();

export function loadInboxMessages(workspaceId: string): InboxMessage[] {
  return memoryInbox.has(workspaceId)
    ? structuredClone(memoryInbox.get(workspaceId)!)
    : [];
}

export function saveInboxMessages(workspaceId: string, messages: InboxMessage[]) {
  memoryInbox.set(workspaceId, structuredClone(messages));
}

export async function hydrateInboxMessages(
  workspaceId: string,
  userId: string,
): Promise<InboxMessage[]> {
  if (!canUseInboxApi() || !userId) {
    return loadInboxMessages(workspaceId);
  }
  try {
    const messages = await fetchInboxMessages(workspaceId, userId);
    memoryInbox.set(workspaceId, messages);
    return structuredClone(messages);
  } catch {
    return loadInboxMessages(workspaceId);
  }
}
