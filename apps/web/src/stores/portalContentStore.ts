import { create } from 'zustand';
import { PROTOTYPE_PORTAL_CONTENT, type PortalContentItem } from '@/domain/prototype/portalContent';
import {
  loadPortalContent,
  scheduleSavePortalContent,
} from '@/domain/persistence/portalStorage';
import { demoDefaults } from '@/domain/demoContentPolicy';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface PortalContentState {
  ready: boolean;
  items: PortalContentItem[];
  toast: string | null;
  bootstrap: (workspaceId: string) => Promise<void>;
  persist: () => void;
  applyAuthoritativeItems: (items: PortalContentItem[], meta?: { conflict?: boolean }) => void;
  upsertItem: (item: PortalContentItem, isNew?: boolean) => void;
  deleteItem: (id: string) => void;
  togglePublished: (id: string) => void;
  getPublishedItems: () => PortalContentItem[];
  resetToSeeds: () => void;
  showToast: (msg: string) => void;
  dismissToast: () => void;
}

function schedulePersist(get: () => PortalContentState) {
  const { items } = get();
  const workspaceId = useWorkspaceStore.getState().workspaceId;
  scheduleSavePortalContent(workspaceId, { items }, 600, {
    onApplied: (next, meta) => {
      get().applyAuthoritativeItems(next, meta);
    },
  });
}

export const usePortalContentStore = create<PortalContentState>((set, get) => ({
  ready: false,
  items: structuredClone(demoDefaults(PROTOTYPE_PORTAL_CONTENT)),
  toast: null,

  bootstrap: async (workspaceId) => {
    const snapshot = await loadPortalContent(workspaceId);
    set({ items: snapshot.items, ready: true });
  },

  persist: () => {
    schedulePersist(get);
  },

  /** 外提成功或冲突重载后，用权威快照替换内存（去掉 dataUrl） */
  applyAuthoritativeItems: (items, meta) => {
    set({ items });
    if (meta?.conflict) {
      get().showToast('检测到他人已更新门户内容，已加载最新版本，请重新编辑后再保存');
    }
  },

  upsertItem: (item, isNew = false) => {
    set((s) => ({
      items: isNew
        ? [item, ...s.items]
        : s.items.map((row) => (row.id === item.id ? item : row)),
    }));
    get().persist();
    if (!useWorkspaceStore.getState().apiConnected) {
      get().showToast('已保存到本机；未连共享 API，其他电脑看不到此附件');
    }
  },

  deleteItem: (id) => {
    const seedIds = new Set(demoDefaults(PROTOTYPE_PORTAL_CONTENT).map((p) => p.id));
    if (seedIds.has(id)) {
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
    set({ items: structuredClone(demoDefaults(PROTOTYPE_PORTAL_CONTENT)) });
    get().persist();
  },

  showToast: (msg) => set({ toast: msg }),
  dismissToast: () => set({ toast: null }),
}));
