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
import { useContentEngagementStore } from '@/stores/contentEngagementStore';

const MAX = 40;
const DOC_KIND = 'market-favorites' as const;

export type MarketFavoriteItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
  at: number;
  /** 用户给收藏工具写的备注 */
  note?: string;
};

type FavoritesDoc = {
  byUserId?: Record<string, MarketFavoriteItem[]>;
  /** @deprecated 旧版工作区共享列表 */
  items?: MarketFavoriteItem[];
};

function userBucket(): string | null {
  return getCurrentUserId() || null;
}

function readUserItems(doc: FavoritesDoc | null | undefined, uid: string): MarketFavoriteItem[] {
  const fromUser = doc?.byUserId?.[uid];
  if (Array.isArray(fromUser)) return fromUser.slice(0, MAX);
  if (Array.isArray(doc?.items)) return doc.items.slice(0, MAX);
  return [];
}

function persistForUser(items: MarketFavoriteItem[]) {
  const uid = userBucket();
  if (!uid || !canUsePlatformDocsApi()) return;
  const ws = currentWorkspaceId();
  const mem = peekPlatformDocMemory<FavoritesDoc>(ws, DOC_KIND) ?? {};
  const byUserId: Record<string, MarketFavoriteItem[]> = { ...(mem.byUserId ?? {}) };
  byUserId[uid] = items.slice(0, MAX);
  const payload: FavoritesDoc = { byUserId };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
}

interface MarketFavoriteState {
  items: MarketFavoriteItem[];
  hydrate: () => Promise<void>;
  isFavorite: (id: string, kind: MarketShelfKind) => boolean;
  toggle: (item: Omit<MarketFavoriteItem, 'at'>) => boolean;
  setNote: (id: string, kind: MarketShelfKind, note: string) => void;
}

export const useMarketFavoriteStore = create<MarketFavoriteState>((set, get) => ({
  items: [],

  hydrate: async () => {
    const uid = userBucket();
    if (!uid || !canUsePlatformDocsApi()) {
      set({ items: [] });
      return;
    }
    try {
      const remote = await fetchPlatformDoc<FavoritesDoc>(currentWorkspaceId(), DOC_KIND);
      const list = readUserItems(remote, uid);
      if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
      set({ items: list });
    } catch {
      set({ items: [] });
    }
  },

  isFavorite: (id, kind) =>
    get().items.some((x) => x.id === id && x.kind === kind),

  toggle: (item) => {
    if (!userBucket() || !canUsePlatformDocsApi()) return false;
    const previous = get().items;
    const exists = previous.some((x) => x.id === item.id && x.kind === item.kind);
    const next = exists
      ? previous.filter((x) => !(x.id === item.id && x.kind === item.kind))
      : [{ ...item, at: Date.now() }, ...previous].slice(0, MAX);
    persistForUser(next);
    set({ items: next });
    const favorited = !exists;
    // 个人收藏清单与门户互动计数是两份持久化数据。统一在 Store 内同步，
    // 避免详情弹窗、个人中心等入口只更新星标而漏记外层卡片计数。
    // 后端以 contentId（不含 kind）为唯一口径，集合差分还能正确处理同 id
    // 跨分类记录，以及超过 MAX 时被淘汰的旧收藏。
    const previousIds = new Set(previous.map((entry) => entry.id));
    const nextIds = new Set(next.map((entry) => entry.id));
    const engagement = useContentEngagementStore.getState();
    new Set([...previousIds, ...nextIds]).forEach((id) => {
      if (previousIds.has(id) !== nextIds.has(id)) {
        engagement.bumpFavorite(id, nextIds.has(id) ? 1 : -1);
      }
    });
    return favorited;
  },

  setNote: (id, kind, note) => {
    if (!userBucket() || !canUsePlatformDocsApi()) return;
    const next = get().items.map((x) =>
      x.id === id && x.kind === kind ? { ...x, note: note.trim() || undefined } : x,
    );
    persistForUser(next);
    set({ items: next });
  },
}));
