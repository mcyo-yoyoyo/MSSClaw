import { create } from 'zustand';
import { fetchTools } from '@/api/centerApi';
import {
  findToolByName,
  TOOL_SEEDS,
  type PlatformTool,
  type ToolStatus,
  type ToolType,
} from '@/domain/tool';

interface ToolState {
  tools: PlatformTool[];
  selectedToolId: string | null;
  typeFilter: ToolType | 'all';
  statusFilter: ToolStatus | 'all';
  testRunning: boolean;
  toast: string | null;

  load: () => void;
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
  tools: TOOL_SEEDS,
  selectedToolId: TOOL_SEEDS[0]?.id ?? null,
  typeFilter: 'all',
  statusFilter: 'all',
  testRunning: false,
  toast: null,

  load: () => {
    void (async () => {
      // legacy Tool 中心保留 workspace 参数以兼容路由，但目录本身已是全局单例。
      const tools = await fetchTools();
      set({
        tools,
        selectedToolId: tools[0]?.id ?? null,
        typeFilter: 'all',
        statusFilter: 'all',
      });
    })();
  },

  selectTool: (id) => set({ selectedToolId: id }),

  selectToolByName: (name) => {
    const tool = get().tools.find((item) => item.name === name || item.displayName === name);
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

export function resolveToolIdFromResource(resourceId: string, resourceName?: string | null) {
  if (resourceId.startsWith('tool-')) return resourceId;
  if (resourceName) {
    const loaded = useToolStore.getState().tools.find(
      (tool) => tool.name === resourceName || tool.displayName === resourceName,
    );
    if (loaded) return loaded.id;
    // 仅保留静态目录作为离线/旧数据兜底，不参与在线 workspace 分叉。
      return findToolByName(resourceName)?.id ?? null;
  }
  return null;
}
