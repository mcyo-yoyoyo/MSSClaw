import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';

const LS_KEY = 'mssclaw_recent_market_v1';
const MAX = 12;

export type RecentMarketItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
  at: number;
};

function readLocal(): RecentMarketItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentMarketItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: RecentMarketItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
}

interface RecentMarketState {
  items: RecentMarketItem[];
  hydrate: () => void;
  push: (item: Omit<RecentMarketItem, 'at'>) => void;
}

export const useRecentMarketStore = create<RecentMarketState>((set, get) => ({
  items: [],

  hydrate: () => set({ items: readLocal() }),

  push: (item) => {
    const next: RecentMarketItem[] = [
      { ...item, at: Date.now() },
      ...get().items.filter((x) => !(x.id === item.id && x.kind === item.kind)),
    ].slice(0, MAX);
    writeLocal(next);
    set({ items: next });
  },
}));
