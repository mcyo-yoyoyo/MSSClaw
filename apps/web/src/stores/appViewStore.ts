import { create } from 'zustand';
import type { AppView, NavSection } from '@/domain/appView';
import { NAV_SECTIONS } from '@/domain/appView';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { opsBlockedToast, roleNavDisabledToast } from '@/domain/permissions';
import { isOpsOnlyView } from '@/domain/shellPerspective';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useShellPerspectiveStore } from '@/stores/shellPerspectiveStore';

const LS_SIDEBAR = 'mssclaw_sidebar_collapsed';
const LS_NAV_SECTIONS = 'mssclaw_nav_sections_v4';

function loadNavSections(): Record<NavSection, boolean> {
  const defaults = Object.fromEntries(NAV_SECTIONS.map((s) => [s, s === 'system'])) as Record<
    NavSection,
    boolean
  >;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_NAV_SECTIONS) || '{}');
    NAV_SECTIONS.forEach((s) => {
      if (typeof saved[s] === 'boolean') defaults[s] = saved[s];
    });
  } catch {
    /* use defaults */
  }
  return defaults;
}

interface AppViewState {
  appView: AppView;
  /** Target view when business shell hits an ops-only page (shows AccessDeniedPanel). */
  blockedOpsView: string | null;
  sidebarCollapsed: boolean;
  navSectionsCollapsed: Record<NavSection, boolean>;
  settingsOpen: boolean;
  setAppView: (view: AppView) => void;
  clearBlockedOpsView: () => void;
  toggleSidebar: () => void;
  toggleNavSection: (section: NavSection) => void;
  setNavSectionCollapsed: (section: NavSection, collapsed: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useAppViewStore = create<AppViewState>((set, get) => ({
  appView: 'home',
  blockedOpsView: null,
  sidebarCollapsed: localStorage.getItem(LS_SIDEBAR) === '1',
  navSectionsCollapsed: loadNavSections(),
  settingsOpen: false,

  setAppView: (view) => {
    if (view === 'messages') {
      set({ appView: view, blockedOpsView: null });
      return;
    }
    if (view === 'cases') {
      set({ appView: 'ai-map', blockedOpsView: null });
      return;
    }
    if (view === 'agent-studio') {
      get().setAppView('agents');
      return;
    }

    const perspective = useShellPerspectiveStore.getState().perspective;
    if (perspective === 'business' && isOpsOnlyView(view)) {
      set({ appView: 'home', blockedOpsView: view });
      useConversationStore.setState({
        pushToast: opsBlockedToast(getNavMetaLabel(view)),
      });
      return;
    }

    const nav = useNavPresentationStore.getState();
    if (!nav.isViewEnabled(view)) {
      const intent = useNavigationIntentStore.getState();
      if (view === 'tools') intent.clearTool();
      else if (view === 'kb') intent.clearKb();
      const fallback = nav.getFallbackView();
      if (fallback !== view) {
        useConversationStore.setState({
          pushToast: roleNavDisabledToast(
            getNavMetaLabel(view),
            getNavMetaLabel(fallback),
          ),
        });
      }
      useShellPerspectiveStore.getState().ensureOpsForView(fallback);
      set({ appView: fallback, blockedOpsView: null });
      return;
    }

    useShellPerspectiveStore.getState().ensureOpsForView(view);
    set({ appView: view, blockedOpsView: null });
  },

  clearBlockedOpsView: () => set({ blockedOpsView: null, appView: 'home' }),

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    localStorage.setItem(LS_SIDEBAR, next ? '1' : '0');
    set({ sidebarCollapsed: next });
  },

  toggleNavSection: (section) => {
    const next = {
      ...get().navSectionsCollapsed,
      [section]: !get().navSectionsCollapsed[section],
    };
    localStorage.setItem(LS_NAV_SECTIONS, JSON.stringify(next));
    set({ navSectionsCollapsed: next });
  },

  setNavSectionCollapsed: (section, collapsed) => {
    const next = {
      ...get().navSectionsCollapsed,
      [section]: collapsed,
    };
    localStorage.setItem(LS_NAV_SECTIONS, JSON.stringify(next));
    set({ navSectionsCollapsed: next });
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
