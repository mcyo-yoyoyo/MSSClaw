import { create } from 'zustand';
import {
  CenterApiError,
  fetchMemoryStores,
  patchMemoryLayerPolicyApi,
  runMemoryReflectionApi,
} from '@/api/centerApi';
import {
  findMemoryStoreByName,
  MEMORY_SEEDS,
  type MemoryLayer,
  type MemoryScope,
  type MemoryStore,
} from '@/domain/memory';

interface MemoryState {
  stores: MemoryStore[];
  selectedStoreId: string | null;
  selectedLayer: MemoryLayer;
  scopeFilter: MemoryScope | 'all';
  reflectionRunning: boolean;
  toast: string | null;

  load: () => void;
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
  stores: MEMORY_SEEDS,
  selectedStoreId: MEMORY_SEEDS[0]?.id ?? null,
  selectedLayer: 'session',
  scopeFilter: 'all',
  reflectionRunning: false,
  toast: null,

  load: () => {
    void (async () => {
      const stores = await fetchMemoryStores();
      set({
        stores,
        selectedStoreId: stores[0]?.id ?? null,
        selectedLayer: 'session',
        scopeFilter: 'all',
      });
    })();
  },

  selectStore: (id) => set({ selectedStoreId: id, selectedLayer: 'session' }),

  selectStoreByName: (name) => {
    const store = findMemoryStoreByName(name);
    if (store) set({ selectedStoreId: store.id, selectedLayer: 'session' });
  },

  setSelectedLayer: (layer) => set({ selectedLayer: layer }),

  setScopeFilter: (filter) => set({ scopeFilter: filter }),

  updateLayerPolicy: (storeId, layer, patch) => {
    void (async () => {
      const { stores } = get();
      try {
        const updated = await patchMemoryLayerPolicyApi(storeId, layer, patch);
        set({
          stores: stores.map((s) => (s.id === storeId ? updated : s)),
          toast: `${layer} · Retention 策略已写入共享库`,
        });
      } catch (err) {
        set({
          toast: err instanceof CenterApiError ? err.message : '策略保存失败',
        });
      }
    })();
  },

  runReflection: async (storeId) => {
    const store = get().stores.find((s) => s.id === storeId);
    if (!store || get().reflectionRunning) return;

    set({ reflectionRunning: true });
    const { stores } = get();
    try {
      const updated = await runMemoryReflectionApi(storeId);
      const newLog = updated.reflectionLogs[0];
      set({
        stores: stores.map((s) => (s.id === storeId ? updated : s)),
        reflectionRunning: false,
        toast: newLog
          ? `「${store.name}」Reflection 完成 · 晋升 ${newLog.promoted} / 清理 ${newLog.pruned}`
          : `「${store.name}」Reflection 完成`,
      });
    } catch (err) {
      set({
        reflectionRunning: false,
        toast: err instanceof CenterApiError ? err.message : 'Reflection 写入失败',
      });
    }
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
  resourceName?: string | null
) {
  if (resourceId.startsWith('mem-')) return resourceId;
  if (resourceName) return findMemoryStoreByName(resourceName)?.id ?? null;
  return null;
}
