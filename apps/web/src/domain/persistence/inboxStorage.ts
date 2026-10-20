import type { InboxMessage } from '@/domain/inbox';
import { canUseInboxApi, fetchInboxMessages } from '@/api/inboxApi';

/** 内存态：禁止写入 localStorage */
let memoryInbox: InboxMessage[] | null = null;

export function loadInboxMessages(): InboxMessage[] {
  return memoryInbox ? structuredClone(memoryInbox) : [];
}

export function saveInboxMessages(messages: InboxMessage[]) {
  memoryInbox = structuredClone(messages);
}

/**
 * `fromServer` 区分「服务端确认为空」和「拉取失败退回内存」——后者不能当成
 * 新用户，否则一次接口抖动就会再灌一遍演示消息。
 */
export async function hydrateInboxMessages(
  userId: string,
): Promise<{ messages: InboxMessage[]; fromServer: boolean }> {
  if (!canUseInboxApi() || !userId) {
    return { messages: loadInboxMessages(), fromServer: false };
  }
  try {
    const messages = await fetchInboxMessages(userId);
    memoryInbox = messages;
    return { messages: structuredClone(messages), fromServer: true };
  } catch {
    return { messages: loadInboxMessages(), fromServer: false };
  }
}
