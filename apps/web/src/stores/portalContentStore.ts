import { create } from 'zustand';
import { PROTOTYPE_PORTAL_CONTENT, type PortalContentItem } from '@/domain/prototype/portalContent';
import {
  loadPortalContent,
  scheduleSavePortalContent,
} from '@/domain/persistence/portalStorage';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface PortalContentState {
  ready: boolean;
  items: PortalContentItem[];
  toast: string | null;
  bootstrap: (workspaceId: string) => Promise<void>;
  persist: () => void;
  upsertItem: (item: PortalContentItem, isNew?: boolean) => void;
  deleteItem: (id: string) => void;
  togglePublished: (id: string) => void;
  getPublishedItems: () => PortalContentItem[];
  resetToSeeds: () => void;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}

export const usePortalContentStore = create<PortalContentState>((set, get) => ({
  ready: false,
  items: structuredClone(PROTOTYPE_PORTAL_CONTENT),
  toast: null,

  bootstrap: async (workspaceId) => {
    const snapshot = await loadPortalContent(workspaceId);
    set({ items: snapshot.items, ready: true });
  },

  persist: () => {
    const { items } = get();
    const workspaceId = useWorkspaceStore.getState().workspaceId;
    scheduleSavePortalContent(workspaceId, { items });
  },

  upsertItem: (item, isNew = false) => {
    set((s) => ({
      items: isNew
        ? [item, ...s.items]
        : s.items.map((row) => (row.id === item.id ? item : row)),
    }));
    get().persist();
  },

  deleteItem: (id) => {
    const seedIds = new Set(PROTOTYPE_PORTAL_CONTENT.map((p) => p.id));
    if (seedIds.has(id)) {
      // 内置种子不可物理删除，改为下架
      set((s) => ({
        items: s.items.map((row) => (row.id === id ? { ...row, published: false } : row)),
      }));
    } else {
      set((s) => ({ items: s.items.filter((row) => row.id !== id) }));
    }
    get().persist();
  },

  togglePublished: (id) => {
    set((s) => ({
      items: s.items.map((row) =>
        row.id === id ? { ...row, published: row.published === false } : row,
      ),
    }));
    get().persist();
  },

  getPublishedItems: () => get().items.filter((i) => i.published !== false),

  resetToSeeds: () => {
    set({ items: structuredClone(PROTOTYPE_PORTAL_CONTENT) });
    get().persist();
  },

  showToast: (msg) => set({ toast: msg }),
  dismissToast: () => set({ toast: null }),
}));
