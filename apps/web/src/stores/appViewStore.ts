import { create } from 'zustand';
import type { AppView, NavSection } from '@/domain/appView';
import { NAV_SECTIONS } from '@/domain/appView';
import { getNavMetaLabel } from '@/domain/navPresentation';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
const LS_SIDEBAR = 'mssclaw_sidebar_collapsed';
const LS_NAV_SECTIONS = 'mssclaw_nav_sections';

function loadNavSections(): Record<NavSection, boolean> {
  const defaults = Object.fromEntries(NAV_SECTIONS.map((s) => [s, false])) as Record<NavSection, boolean>;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_NAV_SECTIONS) || '{}');
    NAV_SECTIONS.forEach((s) => {
      if (typeof saved[s] === 'boolean') defaults[s] = saved[s];
    });
  } catch { /* use defaults */ }
  return defaults;
}

interface AppViewState {
  appView: AppView;
  sidebarCollapsed: boolean;
  navSectionsCollapsed: Record<NavSection, boolean>;
  settingsOpen: boolean;
  setAppView: (view: AppView) => void;
  toggleSidebar: () => void;
  toggleNavSection: (section: NavSection) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useAppViewStore = create<AppViewState>((set, get) => ({
  appView: 'home',
  sidebarCollapsed: localStorage.getItem(LS_SIDEBAR) === '1',
  navSectionsCollapsed: loadNavSections(),
  settingsOpen: false,

  setAppView: (view) => {
    const nav = useNavPresentationStore.getState();
    if (!nav.isViewEnabled(view)) {
      const fallback = nav.getFallbackView();
      if (fallback !== view) {
        useConversationStore.setState({
          pushToast: `「${getNavMetaLabel(view)}」未启用，已跳转到${getNavMetaLabel(fallback)}`,
        });
      }
      set({ appView: fallback });
      return;
    }
    set({ appView: view });
  },

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

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
