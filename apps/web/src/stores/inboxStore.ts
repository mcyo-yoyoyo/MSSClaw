import { create } from 'zustand';
import type { InboxMessage, InboxMessageKind } from '@/domain/inbox';
import { loadInboxMessages, saveInboxMessages } from '@/domain/persistence/inboxStorage';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface InboxState {
  ready: boolean;
  messages: InboxMessage[];
  bootstrap: (workspaceId: string) => void;
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

function workspaceId() {
  return useWorkspaceStore.getState().workspaceId;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  ready: false,
  messages: [],

  bootstrap: (wsId) => {
    const messages = loadInboxMessages(wsId);
    set({ messages, ready: true });
    const uid = getCurrentUserId();
    if (uid) get().seedDemoIfEmpty(uid);
  },

  persist: () => {
    saveInboxMessages(workspaceId(), get().messages);
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
  },

  pushToUsers: (userIds, input) => {
    const unique = [...new Set(userIds.filter(Boolean))];
    for (const toUserId of unique) {
      get().pushMessage({ ...input, toUserId });
    }
  },

  markRead: (id) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }));
    get().persist();
  },

  markAllRead: (userId) => {
    const uid = userId ?? getCurrentUserId();
    set((s) => ({
      messages: s.messages.map((m) =>
        m.toUserId === uid || m.toUserId === '*' ? { ...m, read: true } : m,
      ),
    }));
    get().persist();
  },

  remove: (id) => {
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) }));
    get().persist();
  },

  unreadCount: (userId) => {
    const uid = userId ?? getCurrentUserId();
    return get().messages.filter(
      (m) => !m.read && (m.toUserId === uid || m.toUserId === '*'),
    ).length;
  },

  forUser: (userId) => {
    const uid = userId ?? getCurrentUserId();
    return get().messages.filter((m) => m.toUserId === uid || m.toUserId === '*');
  },

  seedDemoIfEmpty: (userId) => {
    const mine = get().forUser(userId);
    if (mine.length) return;
    const now = Date.now();
    const seeds: InboxMessage[] = [
      {
        id: `msg-seed-${now}-1`,
        kind: 'system',
        title: '欢迎使用「我的消息」',
        body: '任务交付物推送、作战室通知与系统提醒将汇集于此。可在任务预览中选择作战室或成员发送。',
        fromName: 'MSSClaw',
        toUserId: userId,
        createdAt: new Date(now - 3600_000).toISOString(),
        read: false,
      },
      {
        id: `msg-seed-${now}-2`,
        kind: 'deliverable',
        title: '样例：Q3 归因报告已推送',
        body: '演示消息：数据分析 Agent 已生成交付物，可在任务中心查看预览并转发。',
        fromName: '系统演示',
        toUserId: userId,
        createdAt: new Date(now - 7200_000).toISOString(),
        read: true,
        meta: { artifactType: 'marketing', query: '/数据分析 拉美 SO' },
      },
    ];
    set((s) => ({ messages: [...seeds, ...s.messages] }));
    get().persist();
  },
}));
