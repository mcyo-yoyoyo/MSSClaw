import { create } from 'zustand';
import type { AppView } from '@/domain/appView';
import {
  buildRoleNavPreset,
  CONFIGURABLE_ROLES,
  migrateLegacyEnabled,
  NAV_FALLBACK_ORDER,
  NAV_PRESENTATION_META,
  NAV_SLOT_IDS,
  PRESENTATION_CONFIG_VIEW,
  type NavPresetId,
  type NavSlotId,
  type RoleNavMatrix,
} from '@/domain/navPresentation';
import { isSystemAdmin } from '@/domain/currentUser';
import { canRoleAccessView } from '@/domain/navRbac';
import type { PlatformRole } from '@/domain/rbac';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** v4: per-role menu matrix including warroom slot */
const LS_KEY = 'mssclaw_nav_presentation_v4';

interface PersistedNavPresentation {
  preset: NavPresetId;
  roleEnabled: RoleNavMatrix;
}

function defaultState(): PersistedNavPresentation {
  return { preset: 'customer', roleEnabled: buildRoleNavPreset('customer') };
}

function loadPersisted(): PersistedNavPresentation {
  try {
    const v4 = localStorage.getItem(LS_KEY);
    if (v4) {
      const parsed = JSON.parse(v4) as Partial<PersistedNavPresentation>;
      const base = buildRoleNavPreset('customer');
      if (parsed.roleEnabled) {
        for (const role of CONFIGURABLE_ROLES) {
          const row = parsed.roleEnabled[role];
          if (!row) continue;
          for (const id of NAV_SLOT_IDS) {
            if (typeof row[id] === 'boolean') base[role][id] = row[id]!;
          }
        }
      }
      const preset =
        parsed.preset === 'customer' ||
        parsed.preset === 'standard' ||
        parsed.preset === 'custom' ||
        parsed.preset === 'full'
          ? parsed.preset
          : 'customer';
      return { preset, roleEnabled: base };
    }

    const v3 = localStorage.getItem('mssclaw_nav_presentation_v3');
    if (v3) {
      const parsed = JSON.parse(v3) as { preset?: NavPresetId; enabled?: Record<string, boolean> };
      const roleEnabled = migrateLegacyEnabled(parsed.enabled ?? {});
      const preset =
        parsed.preset === 'customer' ||
        parsed.preset === 'standard' ||
        parsed.preset === 'custom' ||
        parsed.preset === 'full'
          ? parsed.preset
          : 'customer';
      const next = { preset, roleEnabled };
      persist(next);
      return next;
    }
  } catch {
    /* fallthrough */
  }
  return defaultState();
}

function persist(state: PersistedNavPresentation) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function currentRole(): PlatformRole {
  return useSessionStore.getState().user?.platformRole ?? 'viewer';
}

interface NavPresentationState extends PersistedNavPresentation {
  editingRole: PlatformRole;
  setEditingRole: (role: PlatformRole) => void;
  isSlotEnabled: (slot: NavSlotId, role?: PlatformRole) => boolean;
  isViewEnabled: (view: AppView) => boolean;
  getFallbackView: (requested?: AppView) => AppView;
  applyPreset: (preset: Exclude<NavPresetId, 'custom'>) => void;
  setSlotEnabled: (role: PlatformRole, slot: NavSlotId, enabled: boolean) => void;
  setViewEnabled: (view: AppView, enabled: boolean) => void;
  resetToFull: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
  enabledCount: (role?: PlatformRole) => number;
}

export const useNavPresentationStore = create<NavPresentationState>((set, get) => {
  const initial = loadPersisted();

  return {
    ...initial,
    editingRole: 'business_user',

    setEditingRole: (editingRole) => set({ editingRole }),

    isSlotEnabled: (slot, roleArg) => {
      const role = roleArg ?? currentRole();
      const meta = NAV_PRESENTATION_META.find((m) => m.id === slot);

      if (meta?.adminOnly) {
        return role === 'super_admin';
      }

      if (get().roleEnabled[role]?.[slot] !== true) return false;

      if (slot !== 'warroom') {
        const workspaceId = useWorkspaceStore.getState().workspaceId;
        if (!canRoleAccessView(slot, role, workspaceId)) return false;
      }
      return true;
    },

    isViewEnabled: (view) => get().isSlotEnabled(view),

    getFallbackView: (requested) => {
      const { isViewEnabled } = get();
      if (requested && isViewEnabled(requested)) return requested;
      for (const view of NAV_FALLBACK_ORDER) {
        if (isViewEnabled(view)) return view;
      }
      return 'home';
    },

    applyPreset: (preset) => {
      if (!isSystemAdmin()) return;
      const next = { preset, roleEnabled: buildRoleNavPreset(preset) };
      persist(next);
      set(next);
    },

    setSlotEnabled: (role, slot, on) => {
      if (!isSystemAdmin()) return;
      const meta = NAV_PRESENTATION_META.find((m) => m.id === slot);
      if (meta?.locked && slot === PRESENTATION_CONFIG_VIEW && !on) return;
      if (meta?.adminOnly && role !== 'super_admin') return;

      const roleEnabled: RoleNavMatrix = {
        ...get().roleEnabled,
        [role]: {
          ...get().roleEnabled[role],
          [slot]: on,
        },
      };
      if (role !== 'super_admin') {
        for (const m of NAV_PRESENTATION_META) {
          if (m.adminOnly) roleEnabled[role][m.id] = false;
        }
      } else {
        roleEnabled.super_admin[PRESENTATION_CONFIG_VIEW] = true;
      }

      const next = { preset: 'custom' as NavPresetId, roleEnabled };
      persist(next);
      set(next);
    },

    setViewEnabled: (view, on) => {
      get().setSlotEnabled(get().editingRole, view, on);
    },

    resetToFull: () => {
      if (!isSystemAdmin()) return;
      const next = { preset: 'full' as NavPresetId, roleEnabled: buildRoleNavPreset('full') };
      persist(next);
      set(next);
    },

    exportConfig: () => {
      const { preset, roleEnabled } = get();
      return JSON.stringify({ version: 4, preset, roleEnabled }, null, 2);
    },

    importConfig: (json) => {
      if (!isSystemAdmin()) return false;
      try {
        const parsed = JSON.parse(json) as {
          preset?: NavPresetId;
          roleEnabled?: RoleNavMatrix;
          enabled?: Record<string, boolean>;
        };
        let roleEnabled: RoleNavMatrix;
        if (parsed.roleEnabled) {
          roleEnabled = buildRoleNavPreset('customer');
          for (const role of CONFIGURABLE_ROLES) {
            const row = parsed.roleEnabled[role];
            if (!row) continue;
            for (const id of NAV_SLOT_IDS) {
              if (typeof row[id] === 'boolean') roleEnabled[role][id] = row[id]!;
            }
          }
        } else if (parsed.enabled) {
          roleEnabled = migrateLegacyEnabled(parsed.enabled);
        } else {
          return false;
        }
        roleEnabled.super_admin[PRESENTATION_CONFIG_VIEW] = true;
        const preset =
          parsed.preset === 'customer' ||
          parsed.preset === 'standard' ||
          parsed.preset === 'custom' ||
          parsed.preset === 'full'
            ? parsed.preset
            : 'custom';
        const next = { preset, roleEnabled };
        persist(next);
        set(next);
        return true;
      } catch {
        return false;
      }
    },

    enabledCount: (roleArg) => {
      const role = roleArg ?? get().editingRole;
      return NAV_PRESENTATION_META.filter(
        (m) => !m.hiddenFromSidebar && get().isSlotEnabled(m.id, role),
      ).length;
    },
  };
});
