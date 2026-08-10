import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';
import { getCurrentUserId } from '@/domain/currentUser';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  scheduleSavePlatformDoc,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

const MAX = 40;
const DOC_KIND = 'market-favorites' as const;

export type MarketFavoriteItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  at: number;
};

type FavoritesDoc = {
  byUserId?: Record<string, MarketFavoriteItem[]>;
  /** @deprecated 旧版工作区共享列表 */
  items?: MarketFavoriteItem[];
};

function userBucket(): string {
  return getCurrentUserId() || 'anonymous';
}

function readUserItems(doc: FavoritesDoc | null | undefined, uid: string): MarketFavoriteItem[] {
  const fromUser = doc?.byUserId?.[uid];
  if (Array.isArray(fromUser)) return fromUser.slice(0, MAX);
  // 兼容旧文档：仅迁移到当前用户桶，避免多人共用一份收藏
  if (Array.isArray(doc?.items)) return doc.items.slice(0, MAX);
  return [];
}

function persistForUser(items: MarketFavoriteItem[]) {
  if (!canUsePlatformDocsApi()) return;
  const ws = currentWorkspaceId();
  const uid = userBucket();
  const mem = peekPlatformDocMemory<FavoritesDoc>(ws, DOC_KIND) ?? {};
  const byUserId: Record<string, MarketFavoriteItem[]> = { ...(mem.byUserId ?? {}) };
  byUserId[uid] = items.slice(0, MAX);
  const payload: FavoritesDoc = { byUserId };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
}

interface MarketFavoriteState {
  items: MarketFavoriteItem[];
  hydrate: () => void;
  isFavorite: (id: string, kind: MarketShelfKind) => boolean;
  toggle: (item: Omit<MarketFavoriteItem, 'at'>) => boolean;
}

export const useMarketFavoriteStore = create<MarketFavoriteState>((set, get) => ({
  items: [],

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ items: [] });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<FavoritesDoc>(currentWorkspaceId(), DOC_KIND);
        const uid = userBucket();
        const list = readUserItems(remote, uid);
        if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
        set({ items: list });
      } catch {
        set({ items: [] });
      }
    })();
  },

  isFavorite: (id, kind) =>
    get().items.some((x) => x.id === id && x.kind === kind),

  toggle: (item) => {
    const exists = get().items.some((x) => x.id === item.id && x.kind === item.kind);
    const next = exists
      ? get().items.filter((x) => !(x.id === item.id && x.kind === item.kind))
      : [{ ...item, at: Date.now() }, ...get().items].slice(0, MAX);
    persistForUser(next);
    set({ items: next });
    return !exists;
  },
}));
