import { create } from 'zustand';
import type { AppView, NavSection } from '@/domain/appView';
import { NAV_SECTIONS } from '@/domain/appView';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { opsBlockedToast, roleNavDisabledToast } from '@/domain/permissions';
import { isOpsOnlyView } from '@/domain/shellPerspective';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useShellPerspectiveStore } from '@/stores/shellPerspectiveStore';

function loadNavSections(): Record<NavSection, boolean> {
  return Object.fromEntries(NAV_SECTIONS.map((s) => [s, s === 'system'])) as Record<
    NavSection,
    boolean
  >;
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
  sidebarCollapsed: false,
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

    // Gate by login role, not stale default `business` before sidebar hydrate.
    useShellPerspectiveStore.getState().hydrate(useSessionStore.getState().user?.platformRole);
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
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  toggleNavSection: (section) => {
    set({
      navSectionsCollapsed: {
        ...get().navSectionsCollapsed,
        [section]: !get().navSectionsCollapsed[section],
      },
    });
  },

  setNavSectionCollapsed: (section, collapsed) => {
    set({
      navSectionsCollapsed: {
        ...get().navSectionsCollapsed,
        [section]: collapsed,
      },
    });
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
