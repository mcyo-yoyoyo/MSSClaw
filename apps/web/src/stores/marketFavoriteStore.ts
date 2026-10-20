import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';
import { getCurrentUserId } from '@/domain/currentUser';
import { canUsePlatformDocsApi } from '@/api/platformDocsApi';
import { addFavorite, fetchFavorites, removeFavorite, updateFavoriteNote } from '@/api/personalDataApi';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useConversationStore } from '@/stores/conversationStore';
import type { MarketAssetType } from '@/api/marketEngagementApi';

const MAX = 40;

export type MarketFavoriteItem = {
  id: string;
  kind: MarketShelfKind;
  /** 资产事件维度；旧收藏记录没有该字段时按 kind 兼容推断。 */
  assetType?: Exclude<MarketAssetType, 'unknown'>;
  title: string;
  icon?: string;
  logoUrl?: string;
  at: number;
  /** 用户给收藏工具写的备注 */
  note?: string;
};

/**
 * A legacy favorite may not have assetType. Treat it as compatible with the
 * typed row for migration, but keep two explicitly typed same-ID assets apart.
 */
function sameFavoriteAsset(
  a: Pick<MarketFavoriteItem, 'id' | 'kind' | 'assetType'>,
  b: Pick<MarketFavoriteItem, 'id' | 'kind' | 'assetType'>,
): boolean {
  if (a.id !== b.id || a.kind !== b.kind) return false;
  return !a.assetType || !b.assetType || a.assetType === b.assetType;
}

function signedIn(): boolean {
  return Boolean(getCurrentUserId()) && canUsePlatformDocsApi();
}

/** 收藏写入串行：快速连点收藏 / 取消时按点击顺序落库，最后一次响应即服务端最新清单。 */
let writeQueue: Promise<void> = Promise.resolve();

function enqueue(
  set: (partial: Partial<MarketFavoriteState>) => void,
  previous: MarketFavoriteItem[],
  write: () => Promise<{ items: MarketFavoriteItem[]; engagement?: unknown }>,
  contentId?: string,
) {
  writeQueue = writeQueue.then(async () => {
    try {
      const result = await write();
      set({ items: result.items.slice(0, MAX) });
      // 收藏数由服务端在同一事务里更新，直接用返回的计数
      if (contentId && result.engagement) {
        useContentEngagementStore.getState().applyEngagement(contentId, result.engagement);
      }
    } catch {
      set({ items: previous });
      useConversationStore.setState({ pushToast: '收藏没保存成功，已恢复，请稍后重试' });
    }
  });
}

interface MarketFavoriteState {
  items: MarketFavoriteItem[];
  hydrate: () => Promise<void>;
  isFavorite: (id: string, kind: MarketShelfKind, assetType?: MarketFavoriteItem['assetType']) => boolean;
  toggle: (item: Omit<MarketFavoriteItem, 'at'>) => boolean;
  setNote: (id: string, kind: MarketShelfKind, note: string, assetType?: MarketFavoriteItem['assetType']) => void;
}

export const useMarketFavoriteStore = create<MarketFavoriteState>((set, get) => ({
  items: [],

  hydrate: async () => {
    if (!signedIn()) {
      set({ items: [] });
      return;
    }
    try {
      const remote = await fetchFavorites<MarketFavoriteItem>();
      set({ items: remote.items.slice(0, MAX) });
    } catch {
      set({ items: [] });
    }
  },

  isFavorite: (id, kind, assetType) =>
    get().items.some((x) => sameFavoriteAsset(x, { id, kind, assetType })),

  toggle: (item) => {
    if (!signedIn()) return false;
    const previous = get().items;
    const exists = previous.some((x) => sameFavoriteAsset(x, item));
    const next = exists
      ? previous.filter((x) => !sameFavoriteAsset(x, item))
      : [{ ...item, at: Date.now() }, ...previous].slice(0, MAX);
    set({ items: next });
    const ref = { id: item.id, kind: item.kind, ...(item.assetType ? { assetType: item.assetType } : {}) };
    enqueue(
      set,
      previous,
      () => (exists ? removeFavorite<MarketFavoriteItem>(ref) : addFavorite<MarketFavoriteItem>(item)),
      item.id,
    );
    return !exists;
  },

  setNote: (id, kind, note, assetType) => {
    if (!signedIn()) return;
    const previous = get().items;
    set({
      items: previous.map((x) =>
        sameFavoriteAsset(x, { id, kind, assetType }) ? { ...x, note: note.trim() || undefined } : x,
      ),
    });
    enqueue(set, previous, () =>
      updateFavoriteNote<MarketFavoriteItem>({ id, kind, ...(assetType ? { assetType } : {}) }, note.trim()),
    );
  },
}));
