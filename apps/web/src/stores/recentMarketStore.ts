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

function userBucket(): string {
  return getCurrentUserId() || 'anonymous';
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

function persistForUser(items: RecentMarketItem[]) {
  if (!canUsePlatformDocsApi()) return;
  const ws = currentWorkspaceId();
  const uid = userBucket();
  const mem = peekPlatformDocMemory<RecentDoc>(ws, DOC_KIND) ?? {};
  const byUserId: Record<string, RecentMarketItem[]> = { ...(mem.byUserId ?? {}) };
  byUserId[uid] = pruneItems(items);
  const payload: RecentDoc = { byUserId };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
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
      if (!canUsePlatformDocsApi()) {
        set({ items: [] });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<RecentDoc>(currentWorkspaceId(), DOC_KIND);
        const uid = userBucket();
        const items = readUserItems(remote, uid);
        if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
        set({ items });
      } catch {
        set({ items: [] });
      }
    })();
  },

  push: (item) => {
    if (RETIRED.has(item.id)) return;
    const next = pruneItems([
      { ...item, at: Date.now() },
      ...get().items.filter((x) => !(x.id === item.id && x.kind === item.kind)),
    ]);
    persistForUser(next);
    set({ items: next });
  },
}));
