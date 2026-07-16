import { create } from 'zustand';
import type { AppView, NavSection } from '@/domain/appView';
import { NAV_SECTIONS } from '@/domain/appView';
import { getNavMetaLabel, PRESENTATION_CONFIG_VIEW } from '@/domain/navPresentation';
import { useConversationStore } from '@/stores/conversationStore';
import { useNavPresentationStore } from '@/stores/navPresentationStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
const LS_SIDEBAR = 'mssclaw_sidebar_collapsed';
const LS_NAV_SECTIONS = 'mssclaw_nav_sections_v4';

function loadNavSections(): Record<NavSection, boolean> {
  // MVP 默认：系统设置收起（隐藏门户运营 / 快捷设置 / 组织权限等子项）
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
  sidebarCollapsed: boolean;
  navSectionsCollapsed: Record<NavSection, boolean>;
  settingsOpen: boolean;
  setAppView: (view: AppView) => void;
  toggleSidebar: () => void;
  toggleNavSection: (section: NavSection) => void;
  setNavSectionCollapsed: (section: NavSection, collapsed: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useAppViewStore = create<AppViewState>((set, get) => ({
  appView: 'home',
  sidebarCollapsed: localStorage.getItem(LS_SIDEBAR) === '1',
  navSectionsCollapsed: loadNavSections(),
  settingsOpen: false,

  setAppView: (view) => {
    // 展示配置始终可进，便于从系统设置恢复菜单方案
    if (view === PRESENTATION_CONFIG_VIEW) {
      set({ appView: view });
      return;
    }
    // 案例库已并入场景地图样板间
    if (view === 'cases') {
      set({ appView: 'ai-map' });
      return;
    }
    // Agent Studio 已并入专家页
    if (view === 'agent-studio') {
      set({ appView: 'agents' });
      return;
    }
    const nav = useNavPresentationStore.getState();
    if (!nav.isViewEnabled(view)) {
      // 目标页未启用：清掉对应深链，避免下次误开详情
      const intent = useNavigationIntentStore.getState();
      if (view === 'tools') intent.clearTool();
      else if (view === 'kb') intent.clearKb();
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
