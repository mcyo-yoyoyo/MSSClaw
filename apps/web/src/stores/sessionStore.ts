import { create } from 'zustand';
import { authenticate, buildLoginAccounts, type LoginAccount } from '@/domain/authAccounts';
import type { PlatformRole } from '@/domain/rbac';
import {
  normalizeOrgAffiliation,
  type DeptId,
  type OrgAffiliation,
  type RegionId,
} from '@/domain/orgTaxonomy';

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
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  getUserId: () => string;
  getUserName: () => string;
  getPlatformRole: () => PlatformRole;
  getOrgAffiliation: () => OrgAffiliation;
}

const LS_KEY = 'mssclaw_session';

function persist(user: SessionUser | null) {
  if (!user) {
    localStorage.removeItem(LS_KEY);
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(user));
}

/** 旧 session 无归属时，从账号目录补齐（免强制重登） */
function enrichOrgFromDirectory(user: SessionUser): SessionUser {
  if (user.deptIds.length > 0 || user.regionId) return user;
  const account = buildLoginAccounts().find(
    (a) => a.email.toLowerCase() === user.email.toLowerCase(),
  );
  if (!account) return user;
  const aff = normalizeOrgAffiliation({
    deptIds: account.deptIds,
    regionId: account.regionId,
  });
  return {
    ...user,
    deptIds: aff.deptIds,
    regionId: aff.regionId ?? null,
  };
}

function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.email === 'string' &&
      typeof parsed.platformRole === 'string'
    ) {
      const aff = normalizeOrgAffiliation({
        deptIds: Array.isArray(parsed.deptIds) ? (parsed.deptIds as DeptId[]) : [],
        regionId: (parsed.regionId as RegionId | null | undefined) ?? null,
      });
      const base: SessionUser = {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        platformRole: parsed.platformRole as PlatformRole,
        avatar: typeof parsed.avatar === 'string' ? parsed.avatar : 'bg-zinc-900',
        deptIds: aff.deptIds,
        regionId: aff.regionId ?? null,
      };
      const enriched = enrichOrgFromDirectory(base);
      const changed =
        enriched.deptIds.join(',') !== base.deptIds.join(',') ||
        enriched.regionId !== base.regionId;
      if (changed) persist(enriched);
      return enriched;
    }
  } catch {
    /* ignore */
  }
  return null;
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

export const useSessionStore = create<SessionState>((set, get) => {
  const initial = loadSession();
  return {
    user: initial,
    isAuthenticated: Boolean(initial),

    login: (email, password) => {
      const result = authenticate(email, password);
      if (!result.ok) return { ok: false, error: result.error };
      const user = toSessionUser(result.account);
      persist(user);
      set({ user, isAuthenticated: true });
      return { ok: true };
    },

    logout: () => {
      persist(null);
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
  };
});
