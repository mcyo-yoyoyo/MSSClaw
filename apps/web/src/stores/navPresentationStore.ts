import { create } from 'zustand';
import type { AppView } from '@/domain/appView';
import {
  buildRoleNavPreset,
  clampBusinessShellSlots,
  CONFIGURABLE_ROLES,
  isBusinessShellRole,
  isBusinessShellSlot,
  isSlotConfiguredOn,
  migrateLegacyEnabled,
  NAV_FALLBACK_ORDER,
  NAV_PRESENTATION_META,
  NAV_SLOT_IDS,
  PRESENTATION_CONFIG_VIEW,
  type NavPresetId,
  type NavSlotId,
  type RoleNavMatrix,
} from '@/domain/navPresentation';
import { listConfigurableSidebarSlots } from '@/domain/navPresetMatrix';
import { isSystemAdmin } from '@/domain/currentUser';
import { canRoleAccessView } from '@/domain/navRbac';
import type { PlatformRole } from '@/domain/rbac';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/** v7: 业务壳仅工作平台可配；完整能力在运营/超管角色上配置 */
const LS_KEY = 'mssclaw_nav_presentation_v7';
const LS_KEY_V6 = 'mssclaw_nav_presentation_v6';
const LS_KEY_V5 = 'mssclaw_nav_presentation_v5';
const LS_KEY_V4 = 'mssclaw_nav_presentation_v4';

interface PersistedNavPresentation {
  preset: NavPresetId;
  roleEnabled: RoleNavMatrix;
}

function defaultState(): PersistedNavPresentation {
  return { preset: 'customer', roleEnabled: buildRoleNavPreset('customer') };
}

function mergeRoleEnabled(parsed: Partial<RoleNavMatrix> | undefined): RoleNavMatrix {
  const base = buildRoleNavPreset('customer');
  if (!parsed) return base;
  for (const role of CONFIGURABLE_ROLES) {
    const row = parsed[role];
    if (!row) continue;
    for (const id of NAV_SLOT_IDS) {
      if (typeof row[id] === 'boolean') base[role][id] = row[id]!;
    }
  }
  return base;
}

function normalizePersisted(preset: NavPresetId, roleEnabled: RoleNavMatrix): PersistedNavPresentation {
  // 命名预设以代码矩阵为准（避免旧 localStorage 卡住超管精简菜单）
  if (preset === 'customer' || preset === 'standard' || preset === 'full') {
    return { preset, roleEnabled: buildRoleNavPreset(preset) };
  }
  // custom：保留勾选；业务壳永远只保留工作平台槽位
  return { preset, roleEnabled: clampBusinessShellSlots(roleEnabled) };
}

function loadPersisted(): PersistedNavPresentation {
  try {
    const v7 = localStorage.getItem(LS_KEY);
    if (v7) {
      const parsed = JSON.parse(v7) as Partial<PersistedNavPresentation>;
      const preset =
        parsed.preset === 'customer' ||
        parsed.preset === 'standard' ||
        parsed.preset === 'custom' ||
        parsed.preset === 'full'
          ? parsed.preset
          : 'customer';
      return normalizePersisted(preset, mergeRoleEnabled(parsed.roleEnabled));
    }

    const v6 = localStorage.getItem(LS_KEY_V6);
    if (v6) {
      const parsed = JSON.parse(v6) as Partial<PersistedNavPresentation>;
      const preset =
        parsed.preset === 'customer' ||
        parsed.preset === 'standard' ||
        parsed.preset === 'custom' ||
        parsed.preset === 'full'
          ? parsed.preset
          : 'customer';
      const next = normalizePersisted(preset, mergeRoleEnabled(parsed.roleEnabled));
      persist(next);
      return next;
    }

    const v5 = localStorage.getItem(LS_KEY_V5);
    if (v5) {
      const parsed = JSON.parse(v5) as Partial<PersistedNavPresentation>;
      const preset =
        parsed.preset === 'customer' ||
        parsed.preset === 'standard' ||
        parsed.preset === 'custom' ||
        parsed.preset === 'full'
          ? parsed.preset
          : 'customer';
      const next = normalizePersisted(preset, mergeRoleEnabled(parsed.roleEnabled));
      persist(next);
      return next;
    }

    const v4 = localStorage.getItem(LS_KEY_V4);
    if (v4) {
      const parsed = JSON.parse(v4) as Partial<PersistedNavPresentation>;
      const preset =
        parsed.preset === 'customer' ||
        parsed.preset === 'standard' ||
        parsed.preset === 'custom' ||
        parsed.preset === 'full'
          ? parsed.preset
          : 'customer';
      const next = normalizePersisted(preset, mergeRoleEnabled(parsed.roleEnabled));
      persist(next);
      return next;
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
      const next = normalizePersisted(preset, roleEnabled);
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
      // locked 治理项不可关闭
      if (meta?.locked && !on) return;
      if (meta?.adminOnly && role !== 'super_admin') return;
      // 业务壳只能配工作平台；能力配置请改「能力运营/超管」
      if (isBusinessShellRole(role) && !isBusinessShellSlot(slot) && on) {
        return;
      }
      // 业务壳首页是找案例/做任务总闸，不可关
      if (isBusinessShellRole(role) && slot === 'home' && !on) {
        return;
      }
      if (role === 'viewer' && (slot === 'task' || slot === 'warroom') && on) {
        return;
      }

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
        // 超管 locked 治理项保持开启
        for (const m of NAV_PRESENTATION_META) {
          if (m.locked && m.adminOnly) roleEnabled.super_admin[m.id] = true;
        }
        roleEnabled.super_admin[PRESENTATION_CONFIG_VIEW] = true;
      }

      const next = {
        preset: 'custom' as NavPresetId,
        roleEnabled: clampBusinessShellSlots(roleEnabled),
      };
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
      return JSON.stringify({ version: 5, preset, roleEnabled }, null, 2);
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
        const next = normalizePersisted(preset, roleEnabled);
        persist(next);
        set(next);
        return true;
      } catch {
        return false;
      }
    },

    enabledCount: (roleArg) => {
      const role = roleArg ?? get().editingRole;
      const matrix = get().roleEnabled;
      return listConfigurableSidebarSlots(role).filter((id) =>
        isSlotConfiguredOn(matrix, role, id),
      ).length;
    },
  };
});
