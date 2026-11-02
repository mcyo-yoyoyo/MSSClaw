import { create } from 'zustand';
import { normalizePlatformRole, type PlatformRole } from '@/domain/rbac';
import { DATA_FETCH_FAILED_MESSAGE, useDataFetchNotice } from '@/domain/dataFetchNotice';
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
  refreshSessionApi,
  type ApiSession,
} from '@/api/platformDocsApi';
import { isApiEnabled } from '@/api/client';
import { fetchOAuthLogoutUrl } from '@/api/authOAuthApi';
import { currentAuthMode } from '@/stores/authModeStore';
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
  /** 服务端角色 id 与名称；platformRole 是映射到内置四种角色后的值，自定义角色按业务用户处理 */
  roleId?: string;
  roleName?: string;
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
   * 服务端按角色下发的二级菜单 id；null 表示没有服务端菜单（游客、离线演示登录），
   * 此时导航回落到前端内置矩阵。
   */
  menus: string[] | null;
  /** menus 里可以新增、修改、删除的部分 */
  editableMenus: string[];
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
  /** 用刷新令牌续期；失败时回落游客态 */
  refreshSession: () => Promise<boolean>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
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

/** 访问令牌过期前多久续期 */
const REFRESH_AHEAD_MS = 60_000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

/** 读 JWT 的 exp（毫秒）；解析不了返回 null */
function tokenExpiry(token: string | null): number | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function scheduleRefresh(token: string | null) {
  clearRefreshTimer();
  const expiresAt = tokenExpiry(token);
  if (!expiresAt) return;
  const delay = Math.max(5_000, expiresAt - Date.now() - REFRESH_AHEAD_MS);
  refreshTimer = setTimeout(() => void useSessionStore.getState().refreshSession(), delay);
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
  menus: null,
  editableMenus: [] as string[],
};

/** 服务端会话落到 store：用户、菜单、壳视角一起更新 */
function signedInState(session: ApiSession) {
  const user = { ...fromApiUser(session.user), roleId: session.user.platformRole, roleName: session.roleName };
  const menus = session.menus ?? null;
  useShellPerspectiveStore.getState().hydrate(user.platformRole, menus);
  return {
    user,
    menus,
    editableMenus: session.editableMenus ?? menus ?? [],
    mode: 'user' as SessionMode,
    isAuthenticated: true,
    isGuest: false,
    shellReady: true,
    bootstrapped: true,
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  mode: 'guest',
  isAuthenticated: false,
  isGuest: false,
  shellReady: false,
  visitorId: '',
  bootstrapped: false,
  menus: null,
  editableMenus: [],
  suppressGuestGate: false,

  clearGuestGateSuppression: () => set({ suppressGuestGate: false }),

  enterGuest: (options) => {
    clearRefreshTimer();
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
    if (!isApiEnabled()) {
      if (!get().isAuthenticated) get().enterGuest();
      set({ bootstrapped: true });
      return;
    }
    try {
      const me = token ? await fetchSessionMeApi() : null;
      if (epoch !== sessionEpoch) return;
      if (me?.ok) {
        set({ ...signedInState(me), visitorId: get().visitorId || getVisitorId() });
        scheduleRefresh(token);
        return;
      }
      // 访问令牌过期或新开标签页（sessionStorage 为空）：用刷新 Cookie 续上会话
      const refreshed = await refreshSessionApi();
      if (epoch !== sessionEpoch) return;
      if (refreshed) {
        writeToken(refreshed.token);
        set({ ...signedInState(refreshed), visitorId: get().visitorId || getVisitorId() });
        scheduleRefresh(refreshed.token);
        return;
      }
      if (!token) {
        // 无 token：只结束启动校验，不清掉刚完成的内存登录
        if (!get().isAuthenticated) get().enterGuest();
        set({ bootstrapped: true });
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

  refreshSession: async () => {
    const epoch = sessionEpoch;
    const refreshed = await refreshSessionApi();
    if (epoch !== sessionEpoch) return Boolean(refreshed);
    if (!refreshed) {
      if (get().isAuthenticated && readToken()) {
        writeToken(null);
        get().enterGuest();
      }
      return false;
    }
    writeToken(refreshed.token);
    set(signedInState(refreshed));
    scheduleRefresh(refreshed.token);
    return true;
  },

  login: async (email, password) => {
    // oauth 模式下密码通道在服务端已被 403；前端也拦一道，避免把 403 当成"密码错了"
    if (currentAuthMode() === 'oauth') {
      return { ok: false, error: '当前环境已启用企业统一身份登录，请从登录页跳转认证' };
    }
    const visitorId = get().visitorId || getVisitorId();
    sessionEpoch += 1;

    // 已确认无 Nest（Pages 静态站 / 探活失败）时不要 POST，避免 405
    const apiStatus = useWorkspaceStore.getState().apiStatus;
    const tryRemote =
      isApiEnabled() && apiStatus !== 'unreachable' && apiStatus !== 'local-demo';
    if (tryRemote) {
      try {
        const remote = await loginWithApi({ email, password, visitorId });
        if (remote.ok && remote.token) {
          writeToken(remote.token);
          useWorkspaceStore.setState({ apiConnected: true, apiStatus: 'connected' });
          set({ ...signedInState(remote), visitorId, suppressGuestGate: false });
          scheduleRefresh(remote.token);
          return { ok: true };
        }
        if (remote.ok === false) {
          const msg = remote.error || '登录失败';
          if (/密码|账号|不存在|停用|尚未|未激活/.test(msg) && !/\b40[45]\b/.test(msg)) {
            return { ok: false, error: msg };
          }
        }
      } catch {
        useWorkspaceStore.setState({ apiConnected: false, apiStatus: 'unreachable' });
      }
    }

    useDataFetchNotice.getState().markFailed();
    return { ok: false, error: DATA_FETCH_FAILED_MESSAGE };
  },

  /** 登出回落游客态而非登录页：门户内容保持可浏览 */
  logout: async () => {
    const platformLogout = logoutWithApi();
    writeToken(null);
    get().enterGuest({ suppressGate: true });

    // oauth 模式必须再跳一次 IDaaS 退出，否则 SSO 凭证还在，
    // 下次点登录会被静默登回，用户观感就是「退不出去」。
    if (currentAuthMode() === 'oauth') {
      await platformLogout;
      const url = await fetchOAuthLogoutUrl();
      if (url) window.location.assign(url);
    }
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

// 页面在后台时定时器可能被节流；切回前台时令牌快到期就立刻续期
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const { isAuthenticated, menus, refreshSession } = useSessionStore.getState();
    const expiresAt = tokenExpiry(readToken());
    if (isAuthenticated && menus && expiresAt && expiresAt - Date.now() < REFRESH_AHEAD_MS) void refreshSession();
  });
}
