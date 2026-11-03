import { create } from 'zustand';
import {
  isApprovalSuccessNotification,
  isVisibleInboxMessage,
  type InboxMessage,
  type InboxMessageKind,
} from '@/domain/inbox';
import { saveInboxMessages } from '@/domain/persistence/inboxStorage';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import {
  canUseInboxApi,
  createInboxMessage,
  deleteInboxForUser,
  markInboxAllRead,
  markInboxRead,
} from '@/api/inboxApi';

interface InboxState {
  ready: boolean;
  messages: InboxMessage[];
  bootstrap: () => void;
  persist: () => void;
  /** 给指定用户推送；广播用 toUserId='*' */
  pushMessage: (input: {
    kind?: InboxMessageKind;
    title: string;
    body: string;
    toUserId: string;
    fromUserId?: string;
    fromName?: string;
    meta?: InboxMessage['meta'];
  }) => void;
  pushToUsers: (
    userIds: string[],
    input: Omit<Parameters<InboxState['pushMessage']>[0], 'toUserId'>,
  ) => void;
  markRead: (id: string) => void;
  markAllRead: (userId?: string) => void;
  remove: (id: string) => void;
  unreadCount: (userId?: string) => number;
  forUser: (userId?: string) => InboxMessage[];
  seedDemoIfEmpty: (userId: string) => void;
}


export const useInboxStore = create<InboxState>((set, get) => ({
  ready: false,
  messages: [],

  bootstrap: () => {
    void (async () => {
      const { hydrateInboxMessages } = await import('@/domain/persistence/inboxStorage');
      const uid = getCurrentUserId();
      const { messages } = await hydrateInboxMessages(uid);
      set({ messages, ready: true });
    })();
  },

  persist: () => {
    saveInboxMessages(get().messages);
  },

  pushMessage: (input) => {
    const msg: InboxMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: input.kind ?? 'system',
      title: input.title,
      body: input.body,
      fromUserId: input.fromUserId ?? (getCurrentUserId() || undefined),
      fromName: input.fromName ?? (getCurrentUserName() || '系统'),
      toUserId: input.toUserId,
      createdAt: new Date().toISOString(),
      read: false,
      meta: input.meta,
    };
    set((s) => ({ messages: [msg, ...s.messages] }));
    get().persist();
    if (canUseInboxApi()) void createInboxMessage(msg);
  },

  pushToUsers: (userIds, input) => {
    const unique = [...new Set(userIds.filter(Boolean))];
    for (const toUserId of unique) {
      get().pushMessage({ ...input, toUserId });
    }
  },

  markRead: (id) => {
    const uid = getCurrentUserId();
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }));
    get().persist();
    if (uid && canUseInboxApi()) void markInboxRead(uid, id);
  },

  markAllRead: (userId) => {
    const uid = userId ?? getCurrentUserId();
    set((s) => ({
      messages: s.messages.map((m) =>
        m.toUserId === uid || m.toUserId === '*' ? { ...m, read: true } : m,
      ),
    }));
    get().persist();
    if (uid && canUseInboxApi()) void markInboxAllRead(uid);
  },

  remove: (id) => {
    const uid = getCurrentUserId();
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) }));
    get().persist();
    if (uid && canUseInboxApi()) void deleteInboxForUser(uid, id);
  },

  unreadCount: (userId) => {
    const uid = userId ?? getCurrentUserId();
    // 只数「我的消息」里真正看得到的那些，否则角标点不掉
    return get().messages.filter(
      (m) =>
        !isApprovalSuccessNotification(m) &&
        isVisibleInboxMessage(m) &&
        !m.read &&
        (m.toUserId === uid || m.toUserId === '*'),
    ).length;
  },

  forUser: (userId) => {
    const uid = userId ?? getCurrentUserId();
    return get().messages.filter(
      (m) =>
        !isApprovalSuccessNotification(m) &&
        (m.toUserId === uid || m.toUserId === '*'),
    );
  },

  seedDemoIfEmpty: () => undefined,
}));
