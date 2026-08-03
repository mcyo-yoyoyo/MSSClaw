import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';

const LS_KEY = 'mssclaw_market_featured_pins_v1';
const MAX_PER_KIND = 8;

export type MarketFeaturedPins = Record<MarketShelfKind, string[]>;

const EMPTY: MarketFeaturedPins = {
  external: [],
  internal: [],
  projects: [],
};

function readLocal(): MarketFeaturedPins {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY, external: [], internal: [], projects: [] };
    const parsed = JSON.parse(raw) as Partial<MarketFeaturedPins>;
    return {
      external: Array.isArray(parsed.external) ? parsed.external.slice(0, MAX_PER_KIND) : [],
      internal: Array.isArray(parsed.internal) ? parsed.internal.slice(0, MAX_PER_KIND) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, MAX_PER_KIND) : [],
    };
  } catch {
    return { external: [], internal: [], projects: [] };
  }
}

function writeLocal(pins: MarketFeaturedPins) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(pins));
  } catch {
    /* ignore */
  }
}

interface MarketFeaturedState {
  pins: MarketFeaturedPins;
  hydrate: () => void;
  pinsFor: (kind: MarketShelfKind) => string[];
  setPins: (kind: MarketShelfKind, ids: string[]) => void;
  togglePin: (kind: MarketShelfKind, id: string) => void;
  isPinned: (kind: MarketShelfKind, id: string) => boolean;
}

export const useMarketFeaturedStore = create<MarketFeaturedState>((set, get) => ({
  pins: { external: [], internal: [], projects: [] },

  hydrate: () => set({ pins: readLocal() }),

  pinsFor: (kind) => get().pins[kind] ?? [],

  setPins: (kind, ids) => {
    const pins = {
      ...get().pins,
      [kind]: ids.slice(0, MAX_PER_KIND),
    };
    writeLocal(pins);
    set({ pins });
  },

  togglePin: (kind, id) => {
    const cur = get().pins[kind] ?? [];
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : [...cur, id].slice(0, MAX_PER_KIND);
    const pins = { ...get().pins, [kind]: next };
    writeLocal(pins);
    set({ pins });
  },

  isPinned: (kind, id) => (get().pins[kind] ?? []).includes(id),
}));

export const MARKET_FEATURED_MAX = MAX_PER_KIND;
