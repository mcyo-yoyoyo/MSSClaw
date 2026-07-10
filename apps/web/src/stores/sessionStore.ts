import { create } from 'zustand';
import { authenticate, type LoginAccount } from '@/domain/authAccounts';
import type { PlatformRole } from '@/domain/rbac';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  avatar: string;
}

interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  getUserId: () => string;
  getUserName: () => string;
  getPlatformRole: () => PlatformRole;
}

const LS_KEY = 'mssclaw_session';

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
      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        platformRole: parsed.platformRole as PlatformRole,
        avatar: typeof parsed.avatar === 'string' ? parsed.avatar : 'bg-zinc-900',
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function persist(user: SessionUser | null) {
  if (!user) {
    localStorage.removeItem(LS_KEY);
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(user));
}

function toSessionUser(account: LoginAccount): SessionUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    platformRole: account.platformRole,
    avatar: account.avatar,
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
  };
});
