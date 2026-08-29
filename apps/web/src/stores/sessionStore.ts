import { create } from 'zustand';
import { authenticate, type LoginAccount } from '@/domain/authAccounts';
import { normalizePlatformRole, type PlatformRole } from '@/domain/rbac';
import {
  normalizeOrgAffiliation,
  type DeptId,
  type OrgAffiliation,
  type RegionId,
} from '@/domain/orgTaxonomy';
import {
  fetchSessionMeApi,
  loginWithApi,
  logoutWithApi,
} from '@/api/platformDocsApi';
import { isApiEnabled } from '@/api/client';
import { getVisitorId } from '@/domain/visitorIdentity';
import { useShellPerspectiveStore } from '@/stores/shellPerspectiveStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  avatar: string;
  deptIds: DeptId[];
  regionId: RegionId | null;
}

/**
 * 游客与登录是正交的两态：guest 下 user 保持 null、isAuthenticated 为 false，
 * 已有的 `user?.` 读取与只读角色判定（getPlatformRole → viewer）全部沿用，
 * 不需要新增 PlatformRole 去改 RBAC 矩阵。
 */
export type SessionMode = 'guest' | 'user';

interface SessionState {
  user: SessionUser | null;
  mode: SessionMode;
  isAuthenticated: boolean;
  /** 游客态：可浏览门户，但写操作要过登录墙 */
  isGuest: boolean;
  /** 主壳是否可渲染（登录用户或游客均可） */
  shellReady: boolean;
  /** 稳定访客 ID，用于 UV 去重与转化归因；登录后仍保留 */
  visitorId: string;
  bootstrapped: boolean;
  /**
   * 主动登出后的一次性标记：此时用户是自愿离开登录态，
   * 个人域页面只做静默回落，不应立刻再弹登录墙。
   */
  suppressGuestGate: boolean;
  clearGuestGateSuppression: () => void;
  /** 进入游客模式（无 token 启动、登出、点击「以游客身份浏览」） */
  enterGuest: (options?: { suppressGate?: boolean }) => void;
  /** 启动时用服务端 token 恢复会话（不再信任本地用户 JSON） */
  hydrateFromServer: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  getUserId: () => string;
  getUserName: () => string;
  getPlatformRole: () => PlatformRole;
  getOrgAffiliation: () => OrgAffiliation;
}

const TOKEN_KEY = 'mssclaw_auth_token';

/** 防止启动时 /auth/me 晚于登录返回，把刚建好的会话清掉 */
let sessionEpoch = 0;

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (!token) sessionStorage.removeItem(TOKEN_KEY);
    else sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

function toSessionUser(account: LoginAccount): SessionUser {
  const aff = normalizeOrgAffiliation({
    deptIds: account.deptIds,
    regionId: account.regionId,
  });
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    platformRole: account.platformRole,
    avatar: account.avatar,
    deptIds: aff.deptIds,
    regionId: aff.regionId ?? null,
  };
}

function fromApiUser(u: {
  id: string;
  name: string;
  email: string;
  platformRole: string;
  avatar: string;
  deptIds: string[];
  regionId: string | null;
}): SessionUser {
  const aff = normalizeOrgAffiliation({
    deptIds: (u.deptIds ?? []) as DeptId[],
    regionId: (u.regionId as RegionId | null) ?? null,
  });
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    platformRole: normalizePlatformRole(u.platformRole),
    avatar: u.avatar || 'bg-zinc-900',
    deptIds: aff.deptIds,
    regionId: aff.regionId ?? null,
  };
}

const GUEST_STATE = {
  user: null,
  mode: 'guest' as SessionMode,
  isAuthenticated: false,
  isGuest: true,
  shellReady: true,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  mode: 'guest',
  isAuthenticated: false,
  isGuest: false,
  shellReady: false,
  visitorId: '',
  bootstrapped: false,
  suppressGuestGate: false,

  clearGuestGateSuppression: () => set({ suppressGuestGate: false }),

  enterGuest: (options) => {
    useShellPerspectiveStore.getState().hydrate(undefined);
    set({
      ...GUEST_STATE,
      visitorId: get().visitorId || getVisitorId(),
      suppressGuestGate: Boolean(options?.suppressGate),
    });
  },

  hydrateFromServer: async () => {
    const epoch = ++sessionEpoch;
    const token = readToken();
    if (!token || !isApiEnabled()) {
      // 无 token：只结束启动校验，不清掉刚完成的内存登录
      if (!get().isAuthenticated) get().enterGuest();
      set({ bootstrapped: true });
      return;
    }
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
    try {
      const me = await fetchSessionMeApi(ws);
      if (epoch !== sessionEpoch) return;
      if (me.ok) {
        const user = fromApiUser(me.user);
        useShellPerspectiveStore.getState().hydrate(user.platformRole);
        set({
          user,
          mode: 'user',
          isAuthenticated: true,
          isGuest: false,
          shellReady: true,
          visitorId: get().visitorId || getVisitorId(),
          bootstrapped: true,
        });
        return;
      }
    } catch {
      /* 服务不可达：保留已有内存会话，避免卡在启动页 */
      if (epoch !== sessionEpoch) return;
      if (!get().isAuthenticated) get().enterGuest();
      set({ bootstrapped: true });
      return;
    }
    if (epoch !== sessionEpoch) return;
    writeToken(null);
    if (get().isAuthenticated && get().user) {
      set({ bootstrapped: true });
      return;
    }
    // token 失效不再退回登录页拦截，而是落到游客态直接进主页
    get().enterGuest();
    set({ bootstrapped: true });
  },

  login: async (email, password) => {
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
    const visitorId = get().visitorId || getVisitorId();
    sessionEpoch += 1;

    // 已确认无 Nest（Pages 静态站 / 探活失败）时不要 POST，避免 405
    const apiStatus = useWorkspaceStore.getState().apiStatus;
    const tryRemote =
      isApiEnabled() && apiStatus !== 'unreachable' && apiStatus !== 'local-demo';
    if (tryRemote) {
      try {
        const remote = await loginWithApi({ email, password, workspaceId: ws, visitorId });
        if (remote.ok && remote.token) {
          writeToken(remote.token);
          const user = fromApiUser(remote.user);
          useShellPerspectiveStore.getState().hydrate(user.platformRole);
          useWorkspaceStore.setState({ apiConnected: true, apiStatus: 'connected' });
          set({
            user,
            mode: 'user',
            isAuthenticated: true,
            isGuest: false,
            shellReady: true,
            visitorId,
            suppressGuestGate: false,
            bootstrapped: true,
          });
          return { ok: true };
        }
        if (remote.ok === false) {
          const msg = remote.error || '登录失败';
          // 仅账号/密码类错误硬失败；HTTP 405/不可达必须回退本地演示登录
          if (/密码|账号|不存在|停用|尚未|未激活/.test(msg) && !/\b40[45]\b/.test(msg)) {
            return { ok: false, error: msg };
          }
        }
      } catch {
        useWorkspaceStore.setState({ apiConnected: false, apiStatus: 'unreachable' });
      }
    }

    // Offline fallback: memory-only session (no browser user profile cache)
    const result = await authenticate(email, password);
    if (!result.ok) return { ok: false, error: result.error };
    writeToken(null);
    const user = toSessionUser(result.account);
    useShellPerspectiveStore.getState().hydrate(user.platformRole);
    set({
      user,
      mode: 'user',
      isAuthenticated: true,
      isGuest: false,
      shellReady: true,
      visitorId,
      suppressGuestGate: false,
      bootstrapped: true,
    });
    return { ok: true };
  },

  /** 登出回落游客态而非登录页：门户内容保持可浏览 */
  logout: () => {
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
    void logoutWithApi(ws);
    writeToken(null);
    get().enterGuest({ suppressGate: true });
  },

  getUserId: () => get().user?.id ?? '',
  getUserName: () => get().user?.name ?? '',
  getPlatformRole: () => get().user?.platformRole ?? 'viewer',
  getOrgAffiliation: () =>
    normalizeOrgAffiliation({
      deptIds: get().user?.deptIds ?? [],
      regionId: get().user?.regionId ?? null,
    }),
}));
