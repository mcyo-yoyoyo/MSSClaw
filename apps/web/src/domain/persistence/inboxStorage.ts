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

/**
 * `fromServer` 区分「服务端确认为空」和「拉取失败退回内存」——后者不能当成
 * 新用户，否则一次接口抖动就会再灌一遍演示消息。
 */
export async function hydrateInboxMessages(
  workspaceId: string,
  userId: string,
): Promise<{ messages: InboxMessage[]; fromServer: boolean }> {
  if (!canUseInboxApi() || !userId) {
    return { messages: loadInboxMessages(workspaceId), fromServer: false };
  }
  try {
    const messages = await fetchInboxMessages(workspaceId, userId);
    memoryInbox.set(workspaceId, messages);
    return { messages: structuredClone(messages), fromServer: true };
  } catch {
    return { messages: loadInboxMessages(workspaceId), fromServer: false };
  }
}
