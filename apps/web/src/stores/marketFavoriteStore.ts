import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';

const LS_KEY = 'mssclaw_market_favorites_v1';
const MAX = 40;

export type MarketFavoriteItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
  at: number;
};

function readLocal(): MarketFavoriteItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarketFavoriteItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: MarketFavoriteItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
}

interface MarketFavoriteState {
  items: MarketFavoriteItem[];
  hydrate: () => void;
  isFavorite: (id: string, kind: MarketShelfKind) => boolean;
  toggle: (item: Omit<MarketFavoriteItem, 'at'>) => boolean;
}

export const useMarketFavoriteStore = create<MarketFavoriteState>((set, get) => ({
  items: [],

  hydrate: () => set({ items: readLocal() }),

  isFavorite: (id, kind) =>
    get().items.some((x) => x.id === id && x.kind === kind),

  toggle: (item) => {
    const exists = get().items.some((x) => x.id === item.id && x.kind === item.kind);
    const next = exists
      ? get().items.filter((x) => !(x.id === item.id && x.kind === item.kind))
      : [{ ...item, at: Date.now() }, ...get().items].slice(0, MAX);
    writeLocal(next);
    set({ items: next });
    return !exists;
  },
}));
