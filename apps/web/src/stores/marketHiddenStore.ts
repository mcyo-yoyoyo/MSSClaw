import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';
import { getCurrentUserId } from '@/domain/currentUser';
import { canUsePlatformDocsApi } from '@/api/platformDocsApi';
import { fetchHidden, hideMarketItem } from '@/api/personalDataApi';

export type MarketHiddenKey = `${MarketShelfKind}:${string}`;

function signedIn(): boolean {
  return Boolean(getCurrentUserId()) && canUsePlatformDocsApi();
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
      if (!signedIn()) {
        set({ keys: [] });
        return;
      }
      try {
        const remote = await fetchHidden();
        set({ keys: remote.keys as MarketHiddenKey[] });
      } catch {
        set({ keys: [] });
      }
    })();
  },

  isHidden: (id, kind) => get().keys.includes(`${kind}:${id}`),

  hide: (id, kind) => {
    const key: MarketHiddenKey = `${kind}:${id}`;
    if (get().keys.includes(key)) return;
    const previous = get().keys;
    set({ keys: [...previous, key] });
    if (!signedIn()) return;
    void hideMarketItem(kind, id)
      .then((result) => set({ keys: result.keys as MarketHiddenKey[] }))
      .catch(() => set({ keys: previous }));
  },
}));
