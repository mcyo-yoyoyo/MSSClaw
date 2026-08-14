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
const LEGACY_LS_KEY = 'mssclaw:market-favorites-v1';

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

function userBucket(): string {
  return getCurrentUserId() || 'anonymous';
}

function readUserItems(doc: FavoritesDoc | null | undefined, uid: string): MarketFavoriteItem[] {
  const fromUser = doc?.byUserId?.[uid];
  if (Array.isArray(fromUser)) return fromUser.slice(0, MAX);
  if (Array.isArray(doc?.items)) return doc.items.slice(0, MAX);
  return [];
}

/** 一次性迁出旧 localStorage，之后不再读写浏览器缓存 */
function takeLegacyLocal(): MarketFavoriteItem[] {
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return [];
    localStorage.removeItem(LEGACY_LS_KEY);
    return readUserItems(JSON.parse(raw) as FavoritesDoc, userBucket());
  } catch {
    return [];
  }
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
  setNote: (id: string, kind: MarketShelfKind, note: string) => void;
}

export const useMarketFavoriteStore = create<MarketFavoriteState>((set, get) => ({
  items: [],

  hydrate: () => {
    void (async () => {
      const leftover = takeLegacyLocal();
      if (!canUsePlatformDocsApi()) {
        set({ items: leftover });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<FavoritesDoc>(currentWorkspaceId(), DOC_KIND);
        const uid = userBucket();
        const list = readUserItems(remote, uid);
        if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
        if (list.length) {
          set({ items: list });
          return;
        }
        if (leftover.length) {
          persistForUser(leftover);
          set({ items: leftover });
          return;
        }
        set({ items: [] });
      } catch {
        set({ items: leftover });
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

  setNote: (id, kind, note) => {
    const next = get().items.map((x) =>
      x.id === id && x.kind === kind ? { ...x, note: note.trim() || undefined } : x,
    );
    persistForUser(next);
    set({ items: next });
  },
}));
