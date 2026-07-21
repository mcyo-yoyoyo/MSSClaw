import type { ChatConfig } from '@/domain/chat';

export type TaskUiStatusId = 'pending_approval' | 'running' | 'idle' | 'done';

/** 侧栏「最近在办」上限；其余进「全部任务…」 */
export const SIDEBAR_ACTIVE_TASK_LIMIT = 8;

export interface TaskUiStatus {
  id: TaskUiStatusId;
  label: string;
}

/** 从会话内容推导业务可读状态（侧栏 / 首页摘要） */
export function getTaskUiStatus(chat: ChatConfig): TaskUiStatus {
  const hist = chat.history ?? [];
  if (hist.some((m) => m.awaitingApproval)) {
    return { id: 'pending_approval', label: '待确认' };
  }
  if (
    hist.some(
      (m) => m.streaming || m.role === 'typing' || m.stepStatus === 'running' || m.stepStatus === 'pending',
    )
  ) {
    return { id: 'running', label: '进行中' };
  }
  if (hist.length <= 1) {
    return { id: 'idle', label: '待开始' };
  }
  const last = hist[hist.length - 1];
  if (last?.role === 'agent' || last?.role === 'system') {
    return { id: 'done', label: '已回复' };
  }
  return { id: 'running', label: '进行中' };
}

export function taskUiStatusClass(id: TaskUiStatusId): string {
  switch (id) {
    case 'pending_approval':
      return 'bg-amber-50 text-amber-700';
    case 'running':
      return 'bg-sky-50 text-sky-700';
    case 'done':
      return 'bg-emerald-50 text-emerald-700';
    default:
      return 'bg-zinc-100 text-zinc-500';
  }
}

/** 首页「进行中」优先：待确认 > 进行中 > 待开始 > 已回复 */
export function taskUiStatusPriority(id: TaskUiStatusId): number {
  switch (id) {
    case 'pending_approval':
      return 0;
    case 'running':
      return 1;
    case 'idle':
      return 2;
    case 'done':
      return 3;
    default:
      return 9;
  }
}

function taskRecency(chat: ChatConfig): number {
  return chat.pinnedAt ?? chat.createdAt ?? 0;
}

/**
 * 侧栏轻量列表：优先非「已回复」，按最近活跃排序，默认最多 N 条；
 * 当前会话始终保留；不足 N 条时用较近的已回复补齐。
 */
export function selectSidebarTasks(
  chats: ChatConfig[],
  currentChatId: string,
  limit = SIDEBAR_ACTIVE_TASK_LIMIT,
): { visible: ChatConfig[]; total: number; hasMore: boolean } {
  const sorted = [...chats].sort((a, b) => taskRecency(b) - taskRecency(a));
  const active = sorted.filter((c) => getTaskUiStatus(c).id !== 'done');
  const done = sorted.filter((c) => getTaskUiStatus(c).id === 'done');
  const pool = [...active, ...done];

  let visible = pool.slice(0, limit);
  const current = chats.find((c) => c.id === currentChatId);
  if (current && !visible.some((c) => c.id === currentChatId)) {
    visible = [current, ...visible.filter((c) => c.id !== currentChatId)].slice(0, limit);
  }

  return {
    visible,
    total: sorted.length,
    hasMore: sorted.length > visible.length,
  };
}
