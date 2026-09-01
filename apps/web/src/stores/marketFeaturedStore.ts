import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

const MAX_PER_KIND = 12;
let hydratedKey: string | null = null;
let hydrationInFlightKey: string | null = null;
let localMutationVersion = 0;

export type MarketFeaturedPins = Record<MarketShelfKind, string[]>;

const EMPTY: MarketFeaturedPins = {
  external: [],
  internal: [],
  projects: [],
};

function defaultPins(): MarketFeaturedPins {
  return { ...EMPTY };
}

/** 外部工具精选已迁移到 external-tool-layout；这里仅兼容 MSS 场景卡置顶。 */
function normalizePins(parsed: Partial<MarketFeaturedPins> | null | undefined): MarketFeaturedPins {
  if (!parsed) return defaultPins();
  return {
    // 忽略历史 market-featured.pins.external，避免它成为第二个外部精选来源。
    external: [],
    internal: Array.isArray(parsed.internal) ? parsed.internal.slice(0, MAX_PER_KIND) : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, MAX_PER_KIND) : [],
  };
}

function persist(pins: MarketFeaturedPins) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'market-featured', {
    // 外部工具布局不再写入旧文档；保留 internal/projects 仅为兼容历史场景卡。
    pins: { ...pins, external: [] },
  });
}

function currentHydrationKey() {
  return `${currentWorkspaceId()}::${canUsePlatformDocsApi() ? 'api' : 'offline'}`;
}

function markLocalMutation() {
  localMutationVersion += 1;
  // 本地态已经是当前页面的最新真值；防抖 PUT 完成前禁止重新 hydrate 旧缓存覆盖它。
  hydratedKey = currentHydrationKey();
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
    const workspaceId = currentWorkspaceId();
    const canUseApi = canUsePlatformDocsApi();
    const key = `${workspaceId}::${canUseApi ? 'api' : 'offline'}`;
    if (hydratedKey === key || hydrationInFlightKey === key) return;

    hydrationInFlightKey = key;
    const mutationVersionAtStart = localMutationVersion;
    void (async () => {
      try {
        if (!canUseApi) {
          if (localMutationVersion === mutationVersionAtStart) set({ pins: defaultPins() });
          hydratedKey = key;
          return;
        }
        const remote = await fetchPlatformDoc<{ pins?: MarketFeaturedPins } | MarketFeaturedPins>(
          workspaceId,
          'market-featured',
        );
        const pins =
          remote && typeof remote === 'object' && 'pins' in remote && remote.pins
            ? normalizePins(remote.pins)
            : normalizePins(remote as Partial<MarketFeaturedPins> | null);
        if (currentWorkspaceId() === workspaceId) {
          if (localMutationVersion === mutationVersionAtStart) set({ pins });
          hydratedKey = key;
        }
      } catch {
        if (
          currentWorkspaceId() === workspaceId &&
          localMutationVersion === mutationVersionAtStart
        ) {
          set({ pins: defaultPins() });
        }
      } finally {
        if (hydrationInFlightKey === key) hydrationInFlightKey = null;
      }
    })();
  },

  pinsFor: (kind) => get().pins[kind] ?? [],

  setPins: (kind, ids) => {
    markLocalMutation();
    const pins = {
      ...get().pins,
      [kind]: kind === 'external' ? [] : ids.slice(0, MAX_PER_KIND),
      external: [],
    };
    persist(pins);
    set({ pins });
  },

  togglePin: (kind, id) => {
    markLocalMutation();
    if (kind === 'external') {
      set((state) => ({ pins: { ...state.pins, external: [] } }));
      return;
    }
    const cur = get().pins[kind] ?? [];
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : [...cur, id].slice(0, MAX_PER_KIND);
    const pins = { ...get().pins, external: [], [kind]: next };
    persist(pins);
    set({ pins });
  },

  isPinned: (kind, id) => (get().pins[kind] ?? []).includes(id),
}));

export const MARKET_FEATURED_MAX = MAX_PER_KIND;
