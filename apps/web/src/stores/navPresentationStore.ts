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

const LS_KEY = 'mssclaw_nav_presentation';

interface PersistedNavPresentation {
  preset: NavPresetId;
  enabled: Record<AppView, boolean>;
}

function fullEnabled(): Record<AppView, boolean> {
  return Object.fromEntries(APP_VIEWS.map((v) => [v, true])) as Record<AppView, boolean>;
}

function loadPersisted(): PersistedNavPresentation {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { preset: 'full', enabled: fullEnabled() };
    const parsed = JSON.parse(raw) as Partial<PersistedNavPresentation>;
    const enabled = fullEnabled();
    if (parsed.enabled && typeof parsed.enabled === 'object') {
      APP_VIEWS.forEach((v) => {
        if (typeof parsed.enabled![v] === 'boolean') enabled[v] = parsed.enabled![v];
      });
    }
    enabled[PRESENTATION_CONFIG_VIEW] = true;
    enabled[WORKSPACE_CONFIG_VIEW] = isSystemAdmin();
    const preset =
      parsed.preset === 'customer' || parsed.preset === 'standard' || parsed.preset === 'custom'
        ? parsed.preset
        : 'full';
    return { preset, enabled };
  } catch {
    return { preset: 'full', enabled: fullEnabled() };
  }
}

function persist(state: PersistedNavPresentation) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      preset: state.preset,
      enabled: {
        ...state.enabled,
        [PRESENTATION_CONFIG_VIEW]: true,
        [WORKSPACE_CONFIG_VIEW]: isSystemAdmin(),
      },
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
      if (view === PRESENTATION_CONFIG_VIEW) return true;
      if (view === WORKSPACE_CONFIG_VIEW) return isSystemAdmin();
      return get().enabled[view] !== false;
    },

    getFallbackView: (requested) => {
      const { enabled } = get();
      if (
        requested &&
        requested !== PRESENTATION_CONFIG_VIEW &&
        requested !== WORKSPACE_CONFIG_VIEW &&
        enabled[requested] !== false
      ) {
        return requested;
      }
      for (const view of NAV_FALLBACK_ORDER) {
        if (view === WORKSPACE_CONFIG_VIEW && !isSystemAdmin()) continue;
        if (enabled[view] !== false) return view;
      }
      return PRESENTATION_CONFIG_VIEW;
    },

    applyPreset: (preset) => {
      const enabled = {
        ...NAV_PRESET_ENABLED[preset],
        [PRESENTATION_CONFIG_VIEW]: true,
        [WORKSPACE_CONFIG_VIEW]: isSystemAdmin(),
      };
      const next = { preset, enabled };
      persist(next);
      set(next);
    },

    setViewEnabled: (view, on) => {
      if (view === PRESENTATION_CONFIG_VIEW || view === WORKSPACE_CONFIG_VIEW) return;
      const enabled = {
        ...get().enabled,
        [view]: on,
        [PRESENTATION_CONFIG_VIEW]: true,
        [WORKSPACE_CONFIG_VIEW]: isSystemAdmin(),
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
        enabled[PRESENTATION_CONFIG_VIEW] = true;
        enabled[WORKSPACE_CONFIG_VIEW] = isSystemAdmin();
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
