import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';
import { RETIRED_DEMO_TOOL_IDS } from '@/domain/prototype/tools';

const LS_KEY = 'mssclaw_recent_market_v1';
const MAX = 12;
const RETIRED = new Set<string>(RETIRED_DEMO_TOOL_IDS);

export type RecentMarketItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
  at: number;
};

function pruneItems(items: RecentMarketItem[]): RecentMarketItem[] {
  return items.filter((x) => !RETIRED.has(x.id)).slice(0, MAX);
}

function readLocal(): RecentMarketItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentMarketItem[];
    return Array.isArray(parsed) ? pruneItems(parsed) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: RecentMarketItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(pruneItems(items)));
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

  hydrate: () => {
    const items = readLocal();
    writeLocal(items);
    set({ items });
  },

  push: (item) => {
    if (RETIRED.has(item.id)) return;
    const next: RecentMarketItem[] = pruneItems([
      { ...item, at: Date.now() },
      ...get().items.filter((x) => !(x.id === item.id && x.kind === item.kind)),
    ]);
    writeLocal(next);
    set({ items: next });
  },
}));
