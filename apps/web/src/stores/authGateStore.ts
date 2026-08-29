import { create } from 'zustand';
import { recordGuestGateHitApi } from '@/api/portalAnalyticsApi';
import { guestVisitorRef } from '@/domain/visitorIdentity';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** 触发登录墙的动作；文案与埋点都按它区分 */
export type AuthGateAction =
  | 'like'
  | 'dislike'
  | 'favorite'
  | 'download'
  | 'submit-tool'
  | 'submit-skill'
  | 'submit-agent'
  | 'chat'
  | 'account';

const GATE_HINTS: Record<AuthGateAction, string> = {
  like: '登录后即可为内容点赞',
  dislike: '登录后即可反馈点踩',
  favorite: '登录后即可收藏到「我的」',
  download: '登录后即可下载该资源',
  'submit-tool': '登录后即可提交工具上架',
  'submit-skill': '登录后即可提交 Skill',
  'submit-agent': '登录后即可提交 Agent',
  chat: '登录后即可发起任务',
  account: '登录后进入你的个人工作台',
};

const TRACKABLE_ROUTE_KEYS = new Set([
  'home',
  'me',
  'market-external',
  'market-internal',
  'market-projects',
  'ai-brief',
  'ai-tasks',
  'market-tool',
  'ai-map',
  'task',
  'messages',
]);

function createGateEventId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `gate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function reportGuestGateHit(action: AuthGateAction): void {
  const session = useSessionStore.getState();
  const workspace = useWorkspaceStore.getState();
  const routeKey = useAppViewStore.getState().appView;
  if (
    !session.isGuest ||
    !session.visitorId ||
    !workspace.apiConnected ||
    !TRACKABLE_ROUTE_KEYS.has(routeKey)
  ) {
    return;
  }
  void recordGuestGateHitApi(workspace.workspaceId, {
    eventId: createGateEventId(),
    routeKey,
    action,
    visitorId: guestVisitorRef(session.visitorId),
  }).catch(() => {
    // 转化埋点失败不能阻断登录墙。
  });
}

interface AuthGateState {
  open: boolean;
  action: AuthGateAction | null;
  hint: string;
  /** 登录成功后重放的原动作 */
  pending: (() => void) | null;
  requestLogin: (action: AuthGateAction, replay?: () => void) => void;
  close: () => void;
  /** 登录成功后调用：重放挂起的动作并关闭浮层 */
  resolveAfterLogin: () => void;
}

export const useAuthGateStore = create<AuthGateState>((set, get) => ({
  open: false,
  action: null,
  hint: '',
  pending: null,

  requestLogin: (action, replay) => {
    set({ open: true, action, hint: GATE_HINTS[action], pending: replay ?? null });
  },

  close: () => set({ open: false, action: null, hint: '', pending: null }),

  resolveAfterLogin: () => {
    const { pending } = get();
    set({ open: false, action: null, hint: '', pending: null });
    // 重放放在状态清空之后，避免动作内再次触发登录墙时被这次 close 覆盖
    pending?.();
  },
}));

/**
 * 登录墙统一入口：已登录返回 true 可继续；游客返回 false，
 * 并弹出登录浮层，登录成功后自动重放 `replay`。
 */
export function requireLogin(action: AuthGateAction, replay?: () => void): boolean {
  if (useSessionStore.getState().isAuthenticated) return true;
  reportGuestGateHit(action);
  useAuthGateStore.getState().requestLogin(action, replay);
  return false;
}
