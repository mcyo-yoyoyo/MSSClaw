import { create } from 'zustand';
import { fetchTools } from '@/api/centerApi';
import {
  findToolByName,
  getToolsByWorkspace,
  type PlatformTool,
  type ToolStatus,
  type ToolType,
} from '@/domain/tool';

interface ToolState {
  workspaceId: string;
  tools: PlatformTool[];
  selectedToolId: string | null;
  typeFilter: ToolType | 'all';
  statusFilter: ToolStatus | 'all';
  testRunning: boolean;
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  selectTool: (id: string | null) => void;
  selectToolByName: (name: string) => void;
  setTypeFilter: (filter: ToolType | 'all') => void;
  setStatusFilter: (filter: ToolStatus | 'all') => void;
  testConnection: (toolId: string) => Promise<void>;
  dismissToast: () => void;
  selectedTool: () => PlatformTool | null;
  filteredTools: () => PlatformTool[];
}

export const useToolStore = create<ToolState>((set, get) => ({
  workspaceId: 'ws-cn-marketing',
  tools: getToolsByWorkspace('ws-cn-marketing'),
  selectedToolId: getToolsByWorkspace('ws-cn-marketing')[0]?.id ?? null,
  typeFilter: 'all',
  statusFilter: 'all',
  testRunning: false,
  toast: null,

  loadWorkspace: (workspaceId) => {
    void (async () => {
      const tools = await fetchTools(workspaceId);
      set({
        workspaceId,
        tools,
        selectedToolId: tools[0]?.id ?? null,
        typeFilter: 'all',
        statusFilter: 'all',
      });
    })();
  },

  selectTool: (id) => set({ selectedToolId: id }),

  selectToolByName: (name) => {
    const tool = findToolByName(get().workspaceId, name);
    if (tool) set({ selectedToolId: tool.id });
  },

  setTypeFilter: (filter) => set({ typeFilter: filter }),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  testConnection: async (toolId) => {
    const tool = get().tools.find((t) => t.id === toolId);
    if (!tool || get().testRunning) return;

    set({ testRunning: true });
    await new Promise((r) => setTimeout(r, 1100));
    set({
      testRunning: false,
      toast: `�?{tool.displayName}」连接成�?· ${tool.endpoint} · ${tool.rateLimit}`,
    });
  },

  dismissToast: () => set({ toast: null }),

  selectedTool: () => {
    const { tools, selectedToolId } = get();
    if (!selectedToolId) return null;
    return tools.find((t) => t.id === selectedToolId) ?? null;
  },

  filteredTools: () => {
    const { tools, typeFilter, statusFilter } = get();
    return tools.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });
  },
}));

export function resolveToolIdFromResource(resourceId: string, resourceName?: string | null, workspaceId?: string) {
  if (resourceId.startsWith('tool-')) return resourceId;
  if (resourceName && workspaceId) return findToolByName(workspaceId, resourceName)?.id ?? null;
  return null;
}
