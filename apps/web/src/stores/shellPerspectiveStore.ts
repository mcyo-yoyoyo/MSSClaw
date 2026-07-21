import { create } from 'zustand';
import {
  isOpsOnlyView,
  loadShellPerspective,
  type ShellPerspective,
} from '@/domain/shellPerspective';
import type { PlatformRole } from '@/domain/rbac';

interface ShellPerspectiveState {
  perspective: ShellPerspective;
  /** Sync shell from login role (no manual toggle). */
  hydrate: (role: PlatformRole | undefined) => void;
  /** Ops-only deep links must not flip business shell to ops. */
  ensureOpsForView: (view: string) => void;
}

export const useShellPerspectiveStore = create<ShellPerspectiveState>((set, get) => ({
  perspective: 'business',

  hydrate: (role) => {
    try {
      localStorage.removeItem('mssclaw_shell_perspective');
    } catch {
      /* ignore */
    }
    set({ perspective: loadShellPerspective(role) });
  },

  ensureOpsForView: (view) => {
    // Business shell stays business; routing gate handles ops-only views.
    if (get().perspective === 'ops' && isOpsOnlyView(view)) return;
  },
}));
