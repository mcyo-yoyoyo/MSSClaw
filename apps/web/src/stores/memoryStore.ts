import { create } from 'zustand';
import { fetchMemoryStores, patchMemoryLayerPolicyApi, runMemoryReflectionApi } from '@/api/centerApi';
import {
  findMemoryStoreByName,
  getMemoryStoresByWorkspace,
  type MemoryLayer,
  type MemoryScope,
  type MemoryStore,
} from '@/domain/memory';

interface MemoryState {
  workspaceId: string;
  stores: MemoryStore[];
  selectedStoreId: string | null;
  selectedLayer: MemoryLayer;
  scopeFilter: MemoryScope | 'all';
  reflectionRunning: boolean;
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  selectStore: (id: string | null) => void;
  selectStoreByName: (name: string) => void;
  setSelectedLayer: (layer: MemoryLayer) => void;
  setScopeFilter: (filter: MemoryScope | 'all') => void;
  updateLayerPolicy: (
    storeId: string,
    layer: MemoryLayer,
    patch: Partial<{ retentionDays: number; maxTokens: number; reflectionEnabled: boolean; decayRate: number }>,
  ) => void;
  runReflection: (storeId: string) => Promise<void>;
  dismissToast: () => void;
  selectedStore: () => MemoryStore | null;
  filteredStores: () => MemoryStore[];
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  workspaceId: 'ws-cn-marketing',
  stores: getMemoryStoresByWorkspace('ws-cn-marketing'),
  selectedStoreId: getMemoryStoresByWorkspace('ws-cn-marketing')[0]?.id ?? null,
  selectedLayer: 'session',
  scopeFilter: 'all',
  reflectionRunning: false,
  toast: null,

  loadWorkspace: (workspaceId) => {
    void (async () => {
      const stores = await fetchMemoryStores(workspaceId);
      set({
        workspaceId,
        stores,
        selectedStoreId: stores[0]?.id ?? null,
        selectedLayer: 'session',
        scopeFilter: 'all',
      });
    })();
  },

  selectStore: (id) => set({ selectedStoreId: id, selectedLayer: 'session' }),

  selectStoreByName: (name) => {
    const store = findMemoryStoreByName(get().workspaceId, name);
    if (store) set({ selectedStoreId: store.id, selectedLayer: 'session' });
  },

  setSelectedLayer: (layer) => set({ selectedLayer: layer }),

  setScopeFilter: (filter) => set({ scopeFilter: filter }),

  updateLayerPolicy: (storeId, layer, patch) => {
    void (async () => {
      const { stores, workspaceId } = get();
      const nextStores = await patchMemoryLayerPolicyApi(workspaceId, storeId, layer, patch, stores);
      set({
        stores: nextStores,
        toast: `${layer} �?Retention 策略已更新`,
      });
    })();
  },

  runReflection: async (storeId) => {
    const store = get().stores.find((s) => s.id === storeId);
    if (!store || get().reflectionRunning) return;

    set({ reflectionRunning: true });

    await new Promise((r) => setTimeout(r, 800));
    await new Promise((r) => setTimeout(r, 700));
    await new Promise((r) => setTimeout(r, 600));

    const { workspaceId, stores } = get();
    const nextStores = await runMemoryReflectionApi(workspaceId, storeId, stores);
    const newLog = nextStores.find((s) => s.id === storeId)?.reflectionLogs[0];

    set({
      stores: nextStores,
      reflectionRunning: false,
      toast: newLog
        ? `�?{store.name}」Reflection 完成 · 晋升 ${newLog.promoted} / 清理 ${newLog.pruned}`
        : `�?{store.name}」Reflection 完成`,
    });
  },

  dismissToast: () => set({ toast: null }),

  selectedStore: () => {
    const { stores, selectedStoreId } = get();
    if (!selectedStoreId) return null;
    return stores.find((s) => s.id === selectedStoreId) ?? null;
  },

  filteredStores: () => {
    const { stores, scopeFilter } = get();
    if (scopeFilter === 'all') return stores;
    return stores.filter((s) => s.scope === scopeFilter);
  },
}));

export function resolveMemoryStoreIdFromResource(
  resourceId: string,
  resourceName?: string | null,
  workspaceId?: string,
) {
  if (resourceId.startsWith('mem-')) return resourceId;
  if (resourceName && workspaceId) return findMemoryStoreByName(workspaceId, resourceName)?.id ?? null;
  return null;
}
