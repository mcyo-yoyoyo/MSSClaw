/**
 * 阶段 1 共享同步反馈：Agent/Skill/工具等写入是否真正落到共享 API。
 * 本机保存成功但 API 失败时必须可见，避免「以为全员能下、其实只有本机」。
 */

import { create } from 'zustand';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export type ShareSyncKind = 'marketplace' | 'portal' | 'sessions';

export type ShareSyncResult = {
  kind: ShareSyncKind;
  synced: boolean;
  /** offline = 未连 API；failed = 已连但写入失败 */
  reason?: 'offline' | 'failed' | 'conflict';
  detail?: string;
  at: string;
};

type State = {
  last: ShareSyncResult | null;
  /** 连续失败次数（成功清零） */
  failStreak: number;
  report: (result: Omit<ShareSyncResult, 'at'> & { at?: string }) => void;
  clear: () => void;
};

export const useShareSyncStore = create<State>((set) => ({
  last: null,
  failStreak: 0,
  report: (result) => {
    const next: ShareSyncResult = {
      ...result,
      at: result.at ?? new Date().toISOString(),
    };
    set((s) => ({
      last: next,
      failStreak: next.synced ? 0 : s.failStreak + 1,
    }));
  },
  clear: () => set({ last: null, failStreak: 0 }),
}));

/** 保存成功类 Toast 的后缀：提醒是否会同步给同事 */
export function shareSyncSaveHint(): string {
  const { apiConnected, apiStatus } = useWorkspaceStore.getState();
  if (apiConnected) return ' · 已排队同步到共享服务';
  if (apiStatus === 'local-demo') return ' · 本机模式：仅当前浏览器可见';
  return ' · 仅存本机：共享服务未连通，其他同事看不到';
}

export function shareSyncFailureMessage(result: ShareSyncResult): string {
  if (result.reason === 'conflict') {
    return '共享内容发生冲突，已加载服务器最新版，请重新编辑后再保存。';
  }
  if (result.reason === 'failed') {
    return `已存本机，同步共享服务失败${result.detail ? `（${result.detail}）` : ''}——请稍后重试或联系运维。`;
  }
  if (useWorkspaceStore.getState().apiStatus === 'local-demo') {
    return '已存本机（演示/离线模式）。部门体验请确认 Nginx 已反代 /api 且后台健康。';
  }
  return '已存本机，但共享服务未连通——其他同事刷新后看不到本次修改。请检查后台 /api。';
}

type ToastFn = (msg: string) => void;
let toastFn: ToastFn | null = null;

/** App 启动时注册，避免 persistence ↔ marketplace 循环依赖 */
export function registerShareSyncToast(fn: ToastFn) {
  toastFn = fn;
}

/** 防抖失败 Toast，避免连续编辑刷屏 */
let failToastTimer: ReturnType<typeof setTimeout> | null = null;
let pendingFail: ShareSyncResult | null = null;

export function scheduleShareSyncFailToast(result: ShareSyncResult, ms = 800) {
  if (result.synced) return;
  pendingFail = result;
  if (failToastTimer) clearTimeout(failToastTimer);
  failToastTimer = setTimeout(() => {
    failToastTimer = null;
    const r = pendingFail;
    pendingFail = null;
    if (r && !r.synced) toastFn?.(shareSyncFailureMessage(r));
  }, ms);
}

export function reportShareSync(result: Omit<ShareSyncResult, 'at'> & { at?: string }) {
  const next: ShareSyncResult = {
    ...result,
    at: result.at ?? new Date().toISOString(),
  };
  useShareSyncStore.getState().report(next);
  if (!next.synced) {
    // 本机开发（localhost 未起后台）保持安静；内网部署未连通必须提示
    if (
      next.reason === 'offline' &&
      useWorkspaceStore.getState().apiStatus === 'local-demo'
    ) {
      return;
    }
    scheduleShareSyncFailToast(next);
  }
}
