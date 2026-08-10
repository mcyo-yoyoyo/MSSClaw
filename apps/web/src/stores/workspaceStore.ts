import { create } from 'zustand';
import type { ModuleId } from '@/domain/chat';
import {
  EXPLORER_SECTIONS,
  getWorkspaceCatalog,
  WORKSPACE_LIST,
  type ExplorerSection,
  type Workspace,
  type WorkspaceCatalog,
} from '@/domain/workspace';
import { getInitialWorkspaceId } from '@/domain/workspaceConfig';
import { useWorkspaceConfigStore } from '@/stores/workspaceConfigStore';
import {
  fetchAllWorkspaceCatalogs,
  fetchWorkspaceCatalog,
  fetchWorkspaceList,
  getLocalWorkspaceCatalogs,
} from '@/api/workspaceApi';
import { fetchApiHealthInfo } from '@/api/persistenceApi';
import { isApiEnabled, isForceLocalDemo } from '@/api/client';

interface WorkspaceState {
  workspaceId: string;
  workspaceList: Workspace[];
  catalogs: Record<string, WorkspaceCatalog>;
  catalogReady: boolean;
  catalogLoading: boolean;
  apiConnected: boolean;
  /** 共享 API 是否配置了部署级 LLM_*（工作区文档配置另计） */
  nestLlmEnvConfigured: boolean;
  /** connected | unreachable | local-demo（强制本地） */
  apiStatus: 'unknown' | 'connected' | 'unreachable' | 'local-demo';
  expandedSections: Record<ExplorerSection, boolean>;
  selectedResourceId: string | null;
  switchToast: string | null;

  bootstrap: () => Promise<void>;
  getCatalog: (workspaceId: string) => WorkspaceCatalog;
  currentWorkspace: () => Workspace;
  switchWorkspace: (workspaceId: string) => string;
  toggleSection: (section: ExplorerSection) => void;
  selectResource: (resourceId: string | null) => void;
  resourceToModule: (kind: 'agent' | 'workflow' | 'knowledge' | 'prompt') => ModuleId;
  dismissSwitchToast: () => void;
}

const DEFAULT_EXPANDED = EXPLORER_SECTIONS.reduce(
  (acc, section) => {
    acc[section] = section === 'conversations' || section === 'agents';
    return acc;
  },
  {} as Record<ExplorerSection, boolean>,
);

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaceId: getInitialWorkspaceId(),
  workspaceList: useWorkspaceConfigStore.getState().getVisibleWorkspaces(),
  catalogs: {
    ...getLocalWorkspaceCatalogs(),
    ...useWorkspaceConfigStore.getState().getCustomCatalogs(),
  },
  catalogReady: false,
  catalogLoading: false,
  apiConnected: false,
  nestLlmEnvConfigured: false,
  apiStatus: 'unknown',
  expandedSections: DEFAULT_EXPANDED,
  selectedResourceId: null,
  switchToast: null,

  bootstrap: async () => {
    if (get().catalogReady || get().catalogLoading) return;

    set({ catalogLoading: true });

    const finishLocal = (status: 'unreachable' | 'local-demo') => {
      const config = useWorkspaceConfigStore.getState();
      set({
        workspaceList: config.getVisibleWorkspaces(),
        catalogs: { ...getLocalWorkspaceCatalogs(), ...config.getCustomCatalogs() },
        catalogReady: true,
        catalogLoading: false,
        apiConnected: false,
        nestLlmEnvConfigured: false,
        apiStatus: status,
      });
    };

    try {
      if (!isApiEnabled() || isForceLocalDemo()) {
        finishLocal('local-demo');
        return;
      }

      const health = await fetchApiHealthInfo();
      if (!health.ok) {
        // 本机只开前端时：安静本地模式，不惊吓普通用户
        const loopback =
          typeof location !== 'undefined' &&
          (location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1' ||
            location.hostname === '[::1]');
        finishLocal(loopback ? 'local-demo' : 'unreachable');
        return;
      }

      const config = useWorkspaceConfigStore.getState();
      const apiList = await fetchWorkspaceList();
      const visible = config.getVisibleWorkspaces();
      const workspaceList = visible.length ? visible : apiList;
      const catalogs = {
        ...(await fetchAllWorkspaceCatalogs(workspaceList.map((item) => item.id))),
        ...config.getCustomCatalogs(),
      };
      set({
        workspaceList,
        catalogs,
        catalogReady: true,
        catalogLoading: false,
        apiConnected: true,
        nestLlmEnvConfigured: health.llmEnvConfigured,
        apiStatus: 'connected',
      });
    } catch {
      finishLocal('unreachable');
    }
  },

  getCatalog: (workspaceId) => {
    const { catalogs } = get();
    return catalogs[workspaceId] ?? getWorkspaceCatalog(workspaceId);
  },

  currentWorkspace: () => {
    const catalog = get().getCatalog(get().workspaceId);
    return useWorkspaceConfigStore.getState().resolveWorkspace(catalog.workspace);
  },

  switchWorkspace: (workspaceId) => {
    const config = useWorkspaceConfigStore.getState();
    if (!config.isEnabled(workspaceId)) {
      set({ switchToast: '该租户已隐藏，请在「租户配置」中启用' });
      return get().getCatalog(get().workspaceId).defaultChatId;
    }
    const catalog = get().getCatalog(workspaceId);
    const displayName = useWorkspaceConfigStore.getState().resolveWorkspace(catalog.workspace).name;
    set({
      workspaceId,
      selectedResourceId: null,
      expandedSections: { ...DEFAULT_EXPANDED },
      switchToast: `已切换到「${displayName}」`,
    });

    if (isApiEnabled() && !get().catalogs[workspaceId]) {
      void fetchWorkspaceCatalog(workspaceId).then((fresh) => {
        set((state) => ({
          catalogs: { ...state.catalogs, [workspaceId]: fresh },
        }));
      });
    }

    return catalog.defaultChatId;
  },

  toggleSection: (section) =>
    set((state) => ({
      expandedSections: {
        ...state.expandedSections,
        [section]: !state.expandedSections[section],
      },
    })),

  selectResource: (resourceId) => set({ selectedResourceId: resourceId }),

  resourceToModule: (kind) => {
    const map = {
      agent: 'agent',
      workflow: 'workflow',
      knowledge: 'knowledge',
      prompt: 'prompt',
    } as const;
    return map[kind];
  },

  dismissSwitchToast: () => set({ switchToast: null }),
}));

export { WORKSPACE_LIST };
