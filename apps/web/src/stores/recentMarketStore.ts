import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';
import { getCurrentUserId } from '@/domain/currentUser';
import { RETIRED_DEMO_TOOL_IDS } from '@/domain/prototype/tools';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  scheduleSavePlatformDoc,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

const MAX = 12;
const DOC_KIND = 'market-recent' as const;
const LEGACY_LS_KEY = 'mssclaw:market-recent-v1';
const RETIRED = new Set<string>(RETIRED_DEMO_TOOL_IDS);

export type RecentMarketItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
  at: number;
};

type RecentDoc = {
  byUserId?: Record<string, RecentMarketItem[]>;
  /** @deprecated 旧版工作区共享列表 */
  items?: RecentMarketItem[];
};

function userBucket(): string | null {
  return getCurrentUserId() || null;
}

function pruneItems(items: RecentMarketItem[]): RecentMarketItem[] {
  return items.filter((x) => !RETIRED.has(x.id)).slice(0, MAX);
}

function readUserItems(doc: RecentDoc | null | undefined, uid: string): RecentMarketItem[] {
  const fromUser = doc?.byUserId?.[uid];
  if (Array.isArray(fromUser)) return pruneItems(fromUser);
  if (Array.isArray(doc?.items)) return pruneItems(doc.items);
  return [];
}

/** 一次性迁出旧 localStorage，之后不再读写浏览器缓存 */
function takeLegacyLocal(): RecentMarketItem[] {
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return [];
    localStorage.removeItem(LEGACY_LS_KEY);
    return readUserItems(JSON.parse(raw) as RecentDoc, userBucket() ?? '');
  } catch {
    return [];
  }
}

function persistForUser(items: RecentMarketItem[]) {
  const next = pruneItems(items);
  const uid = userBucket();
  if (!uid || !canUsePlatformDocsApi()) return next;
  const ws = currentWorkspaceId();
  const mem = peekPlatformDocMemory<RecentDoc>(ws, DOC_KIND) ?? {};
  const byUserId: Record<string, RecentMarketItem[]> = { ...(mem.byUserId ?? {}) };
  byUserId[uid] = next;
  const payload: RecentDoc = { byUserId };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
  return next;
}

interface RecentMarketState {
  items: RecentMarketItem[];
  hydrate: () => void;
  push: (item: Omit<RecentMarketItem, 'at'>) => void;
}

export const useRecentMarketStore = create<RecentMarketState>((set, get) => ({
  items: [],

  hydrate: () => {
    void (async () => {
      const leftover = takeLegacyLocal();
      const uid = userBucket();
      if (!uid || !canUsePlatformDocsApi()) {
        set({ items: leftover });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<RecentDoc>(currentWorkspaceId(), DOC_KIND);
        const items = readUserItems(remote, uid);
        if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
        if (items.length) {
          set({ items });
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

  push: (item) => {
    if (RETIRED.has(item.id)) return;
    const next = persistForUser([
      { ...item, at: Date.now() },
      ...get().items.filter((x) => !(x.id === item.id && x.kind === item.kind)),
    ]);
    set({ items: next });
  },
}));
