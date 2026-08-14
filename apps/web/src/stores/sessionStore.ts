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

interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  bootstrapped: boolean;
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

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  bootstrapped: false,

  hydrateFromServer: async () => {
    const epoch = ++sessionEpoch;
    const token = readToken();
    if (!token || !isApiEnabled()) {
      // 无 token：只结束启动校验，不清掉刚完成的内存登录
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
        set({ user, isAuthenticated: true, bootstrapped: true });
        return;
      }
    } catch {
      /* 服务不可达：保留已有内存会话，避免卡在启动页 */
      if (epoch !== sessionEpoch) return;
      set({ bootstrapped: true });
      return;
    }
    if (epoch !== sessionEpoch) return;
    writeToken(null);
    if (get().isAuthenticated && get().user) {
      set({ bootstrapped: true });
      return;
    }
    useShellPerspectiveStore.getState().hydrate(undefined);
    set({ user: null, isAuthenticated: false, bootstrapped: true });
  },

  login: async (email, password) => {
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
    sessionEpoch += 1;

    // 不依赖 apiConnected：探活在登录之后，否则永远走不进 Nest
    if (isApiEnabled()) {
      try {
        const remote = await loginWithApi({ email, password, workspaceId: ws });
        if (remote.ok && remote.token) {
          writeToken(remote.token);
          const user = fromApiUser(remote.user);
          useShellPerspectiveStore.getState().hydrate(user.platformRole);
          useWorkspaceStore.setState({ apiConnected: true, apiStatus: 'connected' });
          set({
            user,
            isAuthenticated: true,
            bootstrapped: true,
          });
          return { ok: true };
        }
        if (remote.ok === false) {
          return { ok: false, error: remote.error || '登录失败' };
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
      isAuthenticated: true,
      bootstrapped: true,
    });
    return { ok: true };
  },

  logout: () => {
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
    void logoutWithApi(ws);
    writeToken(null);
    useShellPerspectiveStore.getState().hydrate(undefined);
    set({ user: null, isAuthenticated: false });
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
