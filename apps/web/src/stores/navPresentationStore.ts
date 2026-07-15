import { create } from 'zustand';
import type { AppView } from '@/domain/appView';
import { APP_VIEWS } from '@/domain/appView';
import {
  NAV_FALLBACK_ORDER,
  NAV_PRESET_ENABLED,
  NAV_PRESENTATION_META,
  PRESENTATION_CONFIG_VIEW,
  type NavPresetId,
} from '@/domain/navPresentation';
import { isSystemAdmin } from '@/domain/currentUser';
import { WORKSPACE_CONFIG_VIEW } from '@/domain/workspaceConfig';

/** v2：默认改为「标准能力」，系统菜单不再强制开启 */
const LS_KEY = 'mssclaw_nav_presentation_v2';

interface PersistedNavPresentation {
  preset: NavPresetId;
  enabled: Record<AppView, boolean>;
}

function fullEnabled(): Record<AppView, boolean> {
  return Object.fromEntries(APP_VIEWS.map((v) => [v, true])) as Record<AppView, boolean>;
}

function standardEnabled(): Record<AppView, boolean> {
  return { ...NAV_PRESET_ENABLED.standard };
}

function loadPersisted(): PersistedNavPresentation {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { preset: 'standard', enabled: standardEnabled() };
    const parsed = JSON.parse(raw) as Partial<PersistedNavPresentation>;
    const enabled = fullEnabled();
    if (parsed.enabled && typeof parsed.enabled === 'object') {
      APP_VIEWS.forEach((v) => {
        if (typeof parsed.enabled![v] === 'boolean') enabled[v] = parsed.enabled![v];
      });
    }
    const preset =
      parsed.preset === 'customer' ||
      parsed.preset === 'standard' ||
      parsed.preset === 'custom' ||
      parsed.preset === 'full'
        ? parsed.preset
        : 'standard';
    return { preset, enabled };
  } catch {
    return { preset: 'standard', enabled: standardEnabled() };
  }
}

function persist(state: PersistedNavPresentation) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      preset: state.preset,
      enabled: state.enabled,
    }),
  );
}

interface NavPresentationState extends PersistedNavPresentation {
  isViewEnabled: (view: AppView) => boolean;
  getFallbackView: (requested?: AppView) => AppView;
  applyPreset: (preset: Exclude<NavPresetId, 'custom'>) => void;
  setViewEnabled: (view: AppView, enabled: boolean) => void;
  resetToFull: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
  enabledCount: () => number;
}

export const useNavPresentationStore = create<NavPresentationState>((set, get) => {
  const initial = loadPersisted();

  return {
    ...initial,

    isViewEnabled: (view) => {
      if (get().enabled[view] === false) return false;
      // 租户配置 / 门户运营仍需系统管理员
      if (view === WORKSPACE_CONFIG_VIEW || view === 'portal-ops') return isSystemAdmin();
      return true;
    },

    getFallbackView: (requested) => {
      const { isViewEnabled } = get();
      if (requested && isViewEnabled(requested)) return requested;
      for (const view of NAV_FALLBACK_ORDER) {
        if (isViewEnabled(view)) return view;
      }
      return 'home';
    },

    applyPreset: (preset) => {
      const enabled = { ...NAV_PRESET_ENABLED[preset] };
      // 完整产品 / 客户演示：管理员仍可进租户配置与门户运营
      if (preset === 'full' || preset === 'customer') {
        enabled[PRESENTATION_CONFIG_VIEW] = true;
        enabled[WORKSPACE_CONFIG_VIEW] = isSystemAdmin();
        enabled['portal-ops'] = isSystemAdmin();
      }
      const next = { preset, enabled };
      persist(next);
      set(next);
    },

    setViewEnabled: (view, on) => {
      if (view === PRESENTATION_CONFIG_VIEW && !on) {
        // 展示配置可关，但完整产品下建议保留入口；允许自定义关闭
      }
      const enabled = {
        ...get().enabled,
        [view]: on,
      };
      const next = { preset: 'custom' as NavPresetId, enabled };
      persist(next);
      set(next);
    },

    resetToFull: () => {
      const next = { preset: 'full' as NavPresetId, enabled: fullEnabled() };
      persist(next);
      set(next);
    },

    exportConfig: () => {
      const { preset, enabled } = get();
      return JSON.stringify({ preset, enabled }, null, 2);
    },

    importConfig: (json) => {
      try {
        const parsed = JSON.parse(json) as Partial<PersistedNavPresentation>;
        const enabled = fullEnabled();
        if (parsed.enabled) {
          APP_VIEWS.forEach((v) => {
            if (typeof parsed.enabled![v] === 'boolean') enabled[v] = parsed.enabled![v];
          });
        }
        const preset =
          parsed.preset === 'customer' ||
          parsed.preset === 'standard' ||
          parsed.preset === 'custom' ||
          parsed.preset === 'full'
            ? parsed.preset
            : 'custom';
        const next = { preset, enabled };
        persist(next);
        set(next);
        return true;
      } catch {
        return false;
      }
    },

    enabledCount: () => NAV_PRESENTATION_META.filter((m) => get().isViewEnabled(m.id)).length,
  };
});
