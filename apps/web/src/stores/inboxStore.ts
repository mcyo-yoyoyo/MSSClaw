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
        title: '欢迎使用「MSS AI提效作战平台」',
        body: '这里是你的通知中枢：逛广场 · AI任务发起意图 → 做任务确认计划与执行 → 交付物可推送到作战室或成员。系统提醒、协作通知与交付推送都会汇集于此。',
        fromName: 'MSS AI',
        toUserId: userId,
        createdAt: new Date(now - 3600_000).toISOString(),
        read: false,
      },
      {
        id: `msg-seed-${now}-2`,
        kind: 'system',
        title: '上手提示：三步走通提效闭环',
        body: '① 在 AI任务 描述目标或 @专家 / 调技能；② 在做任务中确认计划并执行；③ 预览交付物后选择「推送」发给作战室或同事——对方可在「我的消息」查收。',
        fromName: 'MSS AI',
        toUserId: userId,
        createdAt: new Date(now - 5400_000).toISOString(),
        read: false,
      },
      {
        id: `msg-seed-${now}-3`,
        kind: 'deliverable',
        title: '样例：任务交付物已推送',
        body: '演示消息：某次 Agent 任务已产出可预览交付物。正式使用时，同事推送的报告、方案与纪要将出现在此，并可跳转任务中心继续跟进。',
        fromName: '系统演示',
        toUserId: userId,
        createdAt: new Date(now - 7200_000).toISOString(),
        read: true,
        meta: { artifactType: 'marketing', query: '从 AI任务 发起一次提效任务' },
      },
    ];
    set((s) => ({ messages: [...seeds, ...s.messages] }));
    get().persist();
  },
}));
