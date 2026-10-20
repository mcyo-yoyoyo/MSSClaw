import { create } from 'zustand';
import type { MarketShelfKind } from '@/domain/marketShelf';
import type { MarketAssetType } from '@/api/marketEngagementApi';
import { getCurrentUserId } from '@/domain/currentUser';
import { RETIRED_DEMO_TOOL_IDS } from '@/domain/prototype/tools';
import { canUsePlatformDocsApi } from '@/api/platformDocsApi';
import { fetchRecent, pushRecentView } from '@/api/personalDataApi';

const MAX = 12;
const LEGACY_LS_KEY = 'mssclaw:market-recent-v1';
const RETIRED = new Set<string>(RETIRED_DEMO_TOOL_IDS);

export type RecentMarketItem = {
  id: string;
  kind: MarketShelfKind;
  title: string;
  icon?: string;
  logoUrl?: string;
  /** 资产看板维度；场景项目卡可不传。 */
  assetType?: Exclude<MarketAssetType, 'unknown'>;
  at: number;
};

/**
 * Recent history is keyed by the catalog asset, not just the display shelf.
 * Keep legacy rows without assetType compatible while allowing a same-ID
 * Skill and Agent to coexist once both rows carry their explicit type.
 */
function sameRecentAsset(a: RecentMarketItem, b: RecentMarketItem): boolean {
  if (a.id !== b.id || a.kind !== b.kind) return false;
  return !a.assetType || !b.assetType || a.assetType === b.assetType;
}

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

function signedIn(): boolean {
  return Boolean(userBucket()) && canUsePlatformDocsApi();
}

/** 浏览记录写入串行，最后一次响应即服务端最新清单；失败不打扰用户，保留本地顺序。 */
let writeQueue: Promise<void> = Promise.resolve();

function saveView(item: Omit<RecentMarketItem, 'at'>, set: (partial: Partial<RecentMarketState>) => void) {
  writeQueue = writeQueue.then(async () => {
    try {
      const result = await pushRecentView<RecentMarketItem>(item);
      set({ items: pruneItems(result.items) });
    } catch {
      /* 最近浏览只是便利功能 */
    }
  });
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
      if (!signedIn()) {
        set({ items: leftover });
        return;
      }
      try {
        const remote = await fetchRecent<RecentMarketItem>();
        const items = pruneItems(remote.items);
        set({ items: items.length ? items : leftover });
        // 旧版本地缓存一次性写回服务端：从最早的开始，保持原顺序
        if (!items.length) [...leftover].reverse().forEach((item) => saveView(item, set));
      } catch {
        set({ items: leftover });
      }
    })();
  },

  push: (item) => {
    if (RETIRED.has(item.id)) return;
    set({
      items: pruneItems([
        { ...item, at: Date.now() },
        ...get().items.filter((x) => !sameRecentAsset(x, item as RecentMarketItem)),
      ]),
    });
    if (signedIn()) saveView(item, set);
  },
}));
