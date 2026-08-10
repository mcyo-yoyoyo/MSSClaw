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
    const token = readToken();
    if (!token || !isApiEnabled()) {
      writeToken(null);
      set({ user: null, isAuthenticated: false, bootstrapped: true });
      return;
    }
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
    try {
      const me = await fetchSessionMeApi(ws);
      if (me.ok) {
        set({ user: fromApiUser(me.user), isAuthenticated: true, bootstrapped: true });
        return;
      }
    } catch {
      /* fallthrough */
    }
    writeToken(null);
    set({ user: null, isAuthenticated: false, bootstrapped: true });
  },

  login: async (email, password) => {
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';

    // Prefer server login + token
    if (isApiEnabled() && useWorkspaceStore.getState().apiConnected) {
      try {
        const remote = await loginWithApi({ email, password, workspaceId: ws });
        if (remote.ok && remote.token) {
          writeToken(remote.token);
          set({
            user: fromApiUser(remote.user),
            isAuthenticated: true,
            bootstrapped: true,
          });
          return { ok: true };
        }
        if (remote.ok === false) {
          return { ok: false, error: remote.error || '登录失败' };
        }
      } catch {
        /* fall through */
      }
      return { ok: false, error: '登录服务不可用，请检查共享 API' };
    }

    // Offline fallback: memory-only session (no browser user profile cache)
    const result = await authenticate(email, password);
    if (!result.ok) return { ok: false, error: result.error };
    writeToken(null);
    set({
      user: toSessionUser(result.account),
      isAuthenticated: true,
      bootstrapped: true,
    });
    return { ok: true };
  },

  logout: () => {
    const ws = useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
    void logoutWithApi(ws);
    writeToken(null);
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
