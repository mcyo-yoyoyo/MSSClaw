import { create } from 'zustand';
import { type PortalContentItem } from '@/domain/prototype/portalContent';
import {
  loadPortalContent,
  scheduleSavePortalContent,
} from '@/domain/persistence/portalStorage';
import {
  deletePortalContentItemApi,
  savePortalContentItemApi,
} from '@/api/persistenceApi';
import { useDataFetchNotice } from '@/domain/dataFetchNotice';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface PortalContentState {
  ready: boolean;
  items: PortalContentItem[];
  toast: string | null;
  bootstrap: () => Promise<void>;
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
  scheduleSavePortalContent({ items }, 600, {
    onApplied: (next, meta) => {
      get().applyAuthoritativeItems(next, meta);
    },
  });
}

export const usePortalContentStore = create<PortalContentState>((set, get) => ({
  ready: false,
  items: [],
  toast: null,

  bootstrap: async () => {
    const snapshot = await loadPortalContent();
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
    const creating = isNew || !get().items.some((row) => row.id === item.id);
    set((s) => ({
      items: creating
        ? [item, ...s.items.filter((row) => row.id !== item.id)]
        : s.items.map((row) => (row.id === item.id ? item : row)),
    }));
    if (!useWorkspaceStore.getState().apiConnected) {
      get().showToast('已保存在当前页面；未连共享 API，其他电脑看不到此内容');
      return;
    }
    void savePortalContentItemApi(item, creating).catch(() => {
      useDataFetchNotice.getState().markFailed();
      get().showToast('数据获取失败，请稍候重试');
    });
  },

  deleteItem: (id) => {
    set((s) => ({ items: s.items.filter((row) => row.id !== id) }));
    if (!useWorkspaceStore.getState().apiConnected) return;
    void deletePortalContentItemApi(id).catch(() => {
      useDataFetchNotice.getState().markFailed();
    });
  },

  togglePublished: (id) => {
    const next = get().items.find((row) => row.id === id);
    if (!next) return;
    const updated = { ...next, published: next.published === false };
    set((s) => ({
      items: s.items.map((row) => (row.id === id ? updated : row)),
    }));
    if (!useWorkspaceStore.getState().apiConnected) return;
    void savePortalContentItemApi(updated, false).catch(() => {
      useDataFetchNotice.getState().markFailed();
    });
  },

  getPublishedItems: () => get().items.filter((i) => i.published !== false),

  resetToSeeds: () => {
    set({ toast: null });
  },

  showToast: (msg) => set({ toast: msg }),
  dismissToast: () => set({ toast: null }),
}));
