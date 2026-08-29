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

const DOC_KIND = 'market-hidden' as const;

export type MarketHiddenKey = `${MarketShelfKind}:${string}`;

type HiddenDoc = {
  byUserId?: Record<string, MarketHiddenKey[]>;
};

function userBucket(): string | null {
  return getCurrentUserId() || null;
}

function persistForUser(keys: MarketHiddenKey[]) {
  const uid = userBucket();
  if (!uid || !canUsePlatformDocsApi()) return;
  const ws = currentWorkspaceId();
  const mem = peekPlatformDocMemory<HiddenDoc>(ws, DOC_KIND) ?? {};
  const byUserId = { ...(mem.byUserId ?? {}), [uid]: keys };
  const payload: HiddenDoc = { byUserId };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
}

interface MarketHiddenState {
  keys: MarketHiddenKey[];
  hydrate: () => void;
  isHidden: (id: string, kind: MarketShelfKind) => boolean;
  hide: (id: string, kind: MarketShelfKind) => void;
}

export const useMarketHiddenStore = create<MarketHiddenState>((set, get) => ({
  keys: [],

  hydrate: () => {
    void (async () => {
      const uid = userBucket();
      if (!uid || !canUsePlatformDocsApi()) {
        set({ keys: [] });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<HiddenDoc>(currentWorkspaceId(), DOC_KIND);
        const keys = Array.isArray(remote?.byUserId?.[uid]) ? remote.byUserId[uid] : [];
        if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
        set({ keys });
      } catch {
        set({ keys: [] });
      }
    })();
  },

  isHidden: (id, kind) => get().keys.includes(`${kind}:${id}`),

  hide: (id, kind) => {
    const key: MarketHiddenKey = `${kind}:${id}`;
    if (get().keys.includes(key)) return;
    const next = [...get().keys, key];
    persistForUser(next);
    set({ keys: next });
  },
}));
