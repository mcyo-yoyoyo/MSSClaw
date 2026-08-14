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
const LS_KEY = 'mssclaw:market-favorites-v1';

export type MarketFavoriteItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
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

function readLocal(): MarketFavoriteItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoritesDoc;
    return readUserItems(parsed, userBucket());
  } catch {
    return [];
  }
}

function writeLocal(items: MarketFavoriteItem[]) {
  try {
    const uid = userBucket();
    const prev = (() => {
      try {
        return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as FavoritesDoc;
      } catch {
        return {} as FavoritesDoc;
      }
    })();
    const byUserId = { ...(prev.byUserId ?? {}), [uid]: items.slice(0, MAX) };
    localStorage.setItem(LS_KEY, JSON.stringify({ byUserId } satisfies FavoritesDoc));
  } catch {
    /* ignore quota */
  }
}

function persistForUser(items: MarketFavoriteItem[]) {
  writeLocal(items);
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
        set({ items: readLocal() });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<FavoritesDoc>(currentWorkspaceId(), DOC_KIND);
        const uid = userBucket();
        const list = readUserItems(remote, uid);
        if (list.length) {
          if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
          writeLocal(list);
          set({ items: list });
          return;
        }
        const local = readLocal();
        if (local.length) {
          persistForUser(local);
          set({ items: local });
          return;
        }
        if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
        set({ items: [] });
      } catch {
        set({ items: readLocal() });
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
