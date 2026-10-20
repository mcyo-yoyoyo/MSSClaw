import { create } from 'zustand';
import type { ModuleId } from '@/domain/chat';
import { EXPLORER_SECTIONS, PLATFORM_CATALOG, type ExplorerSection, type WorkspaceCatalog } from '@/domain/workspace';
import { fetchPlatformCatalog } from '@/api/workspaceApi';
import { fetchApiHealthInfo } from '@/api/persistenceApi';
import { isApiEnabled, isForceLocalDemo } from '@/api/client';

/** 平台目录（资源树、对话列表）与共享 API 连接状态；平台只有一个空间。 */
interface WorkspaceState {
  catalog: WorkspaceCatalog;
  catalogReady: boolean;
  catalogLoading: boolean;
  apiConnected: boolean;
  /** 共享 API 是否配置了部署级 LLM_*（平台文档配置另计） */
  nestLlmEnvConfigured: boolean;
  /** connected | unreachable | local-demo（强制本地） */
  apiStatus: 'unknown' | 'connected' | 'unreachable' | 'local-demo';
  expandedSections: Record<ExplorerSection, boolean>;
  selectedResourceId: string | null;

  bootstrap: () => Promise<void>;
  toggleSection: (section: ExplorerSection) => void;
  selectResource: (resourceId: string | null) => void;
  resourceToModule: (kind: 'agent' | 'workflow' | 'knowledge' | 'prompt') => ModuleId;
}

const DEFAULT_EXPANDED = EXPLORER_SECTIONS.reduce(
  (acc, section) => {
    acc[section] = section === 'conversations' || section === 'agents';
    return acc;
  },
  {} as Record<ExplorerSection, boolean>,
);

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  catalog: PLATFORM_CATALOG,
  catalogReady: false,
  catalogLoading: false,
  apiConnected: false,
  nestLlmEnvConfigured: false,
  apiStatus: 'unknown',
  expandedSections: DEFAULT_EXPANDED,
  selectedResourceId: null,

  bootstrap: async () => {
    if (get().catalogReady || get().catalogLoading) return;

    set({ catalogLoading: true });

    const finishLocal = (status: 'unreachable' | 'local-demo') => {
      set({
        catalog: PLATFORM_CATALOG,
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
        finishLocal('unreachable');
        return;
      }

      set({
        catalog: await fetchPlatformCatalog(),
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
}));
