import { create } from 'zustand';
import {
  DEFAULT_EXTERNAL_FEATURED_PINS,
  LEGACY_EXTERNAL_FEATURED_PINS,
} from '@/domain/externalToolTaxonomy';
import type { MarketShelfKind } from '@/domain/marketShelf';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

const MAX_PER_KIND = 12;

export type MarketFeaturedPins = Record<MarketShelfKind, string[]>;

const EMPTY: MarketFeaturedPins = {
  external: [],
  internal: [],
  projects: [],
};

function defaultPins(): MarketFeaturedPins {
  return {
    ...EMPTY,
    external: [...DEFAULT_EXTERNAL_FEATURED_PINS],
    internal: [],
    projects: [],
  };
}

function sameIdList(a: string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function normalizePins(parsed: Partial<MarketFeaturedPins> | null | undefined): MarketFeaturedPins {
  if (!parsed) return defaultPins();
  const rawExternal = Array.isArray(parsed.external)
    ? parsed.external.slice(0, MAX_PER_KIND)
    : [];
  const external =
    !rawExternal.length || sameIdList(rawExternal, LEGACY_EXTERNAL_FEATURED_PINS)
      ? [...DEFAULT_EXTERNAL_FEATURED_PINS]
      : rawExternal;
  return {
    external,
    internal: Array.isArray(parsed.internal) ? parsed.internal.slice(0, MAX_PER_KIND) : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, MAX_PER_KIND) : [],
  };
}

function persist(pins: MarketFeaturedPins) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'market-featured', { pins });
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
  pins: defaultPins(),

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ pins: defaultPins() });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ pins?: MarketFeaturedPins } | MarketFeaturedPins>(
          currentWorkspaceId(),
          'market-featured',
        );
        const pins =
          remote && typeof remote === 'object' && 'pins' in remote && remote.pins
            ? normalizePins(remote.pins)
            : normalizePins(remote as Partial<MarketFeaturedPins> | null);
        set({ pins });
      } catch {
        set({ pins: defaultPins() });
      }
    })();
  },

  pinsFor: (kind) => get().pins[kind] ?? [],

  setPins: (kind, ids) => {
    const pins = {
      ...get().pins,
      [kind]: ids.slice(0, MAX_PER_KIND),
    };
    persist(pins);
    set({ pins });
  },

  togglePin: (kind, id) => {
    const cur = get().pins[kind] ?? [];
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : [...cur, id].slice(0, MAX_PER_KIND);
    const pins = { ...get().pins, [kind]: next };
    persist(pins);
    set({ pins });
  },

  isPinned: (kind, id) => (get().pins[kind] ?? []).includes(id),
}));

export const MARKET_FEATURED_MAX = MAX_PER_KIND;
