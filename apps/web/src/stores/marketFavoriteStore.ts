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
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import type { MarketAssetType } from '@/api/marketEngagementApi';

const MAX = 40;
const DOC_KIND = 'market-favorites' as const;

export type MarketFavoriteItem = {
  id: string;
  kind: MarketShelfKind;
  /** 资产事件维度；旧收藏记录没有该字段时按 kind 兼容推断。 */
  assetType?: Exclude<MarketAssetType, 'unknown'>;
  title: string;
  icon?: string;
  logoUrl?: string;
  at: number;
  /** 用户给收藏工具写的备注 */
  note?: string;
};

/**
 * A legacy favorite may not have assetType. Treat it as compatible with the
 * typed row for migration, but keep two explicitly typed same-ID assets apart.
 */
function sameFavoriteAsset(
  a: Pick<MarketFavoriteItem, 'id' | 'kind' | 'assetType'>,
  b: Pick<MarketFavoriteItem, 'id' | 'kind' | 'assetType'>,
): boolean {
  if (a.id !== b.id || a.kind !== b.kind) return false;
  return !a.assetType || !b.assetType || a.assetType === b.assetType;
}

type FavoritesDoc = {
  byUserId?: Record<string, MarketFavoriteItem[]>;
  /** @deprecated 旧版工作区共享列表 */
  items?: MarketFavoriteItem[];
};

function userBucket(): string | null {
  return getCurrentUserId() || null;
}

function readUserItems(doc: FavoritesDoc | null | undefined, uid: string): MarketFavoriteItem[] {
  const fromUser = doc?.byUserId?.[uid];
  if (Array.isArray(fromUser)) return fromUser.slice(0, MAX);
  if (Array.isArray(doc?.items)) return doc.items.slice(0, MAX);
  return [];
}

function persistForUser(items: MarketFavoriteItem[]) {
  const uid = userBucket();
  if (!uid || !canUsePlatformDocsApi()) return;
  const ws = currentWorkspaceId();
  const mem = peekPlatformDocMemory<FavoritesDoc>(ws, DOC_KIND) ?? {};
  const byUserId: Record<string, MarketFavoriteItem[]> = { ...(mem.byUserId ?? {}) };
  byUserId[uid] = items.slice(0, MAX);
  const payload: FavoritesDoc = { byUserId };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
}

interface MarketFavoriteState {
  items: MarketFavoriteItem[];
  hydrate: () => Promise<void>;
  isFavorite: (id: string, kind: MarketShelfKind, assetType?: MarketFavoriteItem['assetType']) => boolean;
  toggle: (item: Omit<MarketFavoriteItem, 'at'>) => boolean;
  setNote: (id: string, kind: MarketShelfKind, note: string, assetType?: MarketFavoriteItem['assetType']) => void;
}

export const useMarketFavoriteStore = create<MarketFavoriteState>((set, get) => ({
  items: [],

  hydrate: async () => {
    const uid = userBucket();
    if (!uid || !canUsePlatformDocsApi()) {
      set({ items: [] });
      return;
    }
    try {
      const remote = await fetchPlatformDoc<FavoritesDoc>(currentWorkspaceId(), DOC_KIND);
      const list = readUserItems(remote, uid);
      if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
      set({ items: list });
    } catch {
      set({ items: [] });
    }
  },

  isFavorite: (id, kind, assetType) =>
    get().items.some((x) => sameFavoriteAsset(x, { id, kind, assetType })),

  toggle: (item) => {
    if (!userBucket() || !canUsePlatformDocsApi()) return false;
    const previous = get().items;
    const exists = previous.some((x) => sameFavoriteAsset(x, item));
    const next = exists
      ? previous.filter((x) => !sameFavoriteAsset(x, item))
      : [{ ...item, at: Date.now() }, ...previous].slice(0, MAX);
    persistForUser(next);
    set({ items: next });
    const favorited = !exists;
    // 个人收藏清单与门户互动计数是两份持久化数据。统一在 Store 内同步，
    // 避免详情弹窗、个人中心等入口只更新星标而漏记外层卡片计数。
    // 以资产类型 + ID 做差分，避免同一 ID 在 Skill/Agent/Tool 间互相吞掉事件；
    // 超过 MAX 时被淘汰的旧收藏也会得到对应的取消事件。
    const keyOf = (entry: MarketFavoriteItem) =>
      `${entry.assetType ?? entry.kind}:${entry.id}`;
    const previousIds = new Set(previous.map(keyOf));
    const nextIds = new Set(next.map(keyOf));
    const engagement = useContentEngagementStore.getState();
    new Set([...previousIds, ...nextIds]).forEach((key) => {
      if (previousIds.has(key) !== nextIds.has(key)) {
        const favorite = next.find((entry) => keyOf(entry) === key) ?? previous.find((entry) => keyOf(entry) === key);
        if (!favorite) return;
        const assetType =
          favorite?.assetType ??
          (favorite?.kind === 'external' || favorite?.kind === 'internal' ? 'tool' : undefined);
        engagement.bumpFavorite(favorite.id, nextIds.has(key) ? 1 : -1, assetType);
      }
    });
    return favorited;
  },

  setNote: (id, kind, note, assetType) => {
    if (!userBucket() || !canUsePlatformDocsApi()) return;
    const next = get().items.map((x) =>
      sameFavoriteAsset(x, { id, kind, assetType })
        ? { ...x, note: note.trim() || undefined }
        : x,
    );
    persistForUser(next);
    set({ items: next });
  },
}));
