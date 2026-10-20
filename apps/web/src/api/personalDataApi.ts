import { apiAuthHeaders, apiUrl } from '@/api/client';
import type { MarketShelfKind } from '@/domain/marketShelf';
import type { MarketAssetType } from '@/api/marketEngagementApi';

/** 当前登录人的个人数据（收藏 / 最近浏览 / 隐藏），服务端按会话识别本人，逐条读写。 */

export type PersonalAssetRef = {
  id: string;
  kind: MarketShelfKind;
  assetType?: Exclude<MarketAssetType, 'unknown'>;
};

export type PersonalAssetSnapshot = PersonalAssetRef & {
  title: string;
  icon?: string;
  logoUrl?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(`/api/v1/me/${path}`), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...apiAuthHeaders(),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`personal_data_${path.split('/')[0]}_${res.status}`);
  return (await res.json()) as T;
}

export function fetchFavorites<T>() {
  return request<{ items: T[] }>('market-favorites');
}

/** 收藏：服务端在同一事务里写收藏、更新收藏数、记行为事实，返回最新清单和该内容的计数 */
export function addFavorite<T>(item: PersonalAssetSnapshot & { note?: string }) {
  return request<{ items: T[]; engagement: unknown }>('market-favorites', {
    method: 'PUT',
    body: JSON.stringify(item),
  });
}

export function removeFavorite<T>(ref: PersonalAssetRef) {
  const query = ref.assetType ? `?assetType=${encodeURIComponent(ref.assetType)}` : '';
  return request<{ items: T[]; engagement: unknown }>(
    `market-favorites/${encodeURIComponent(ref.kind)}/${encodeURIComponent(ref.id)}${query}`,
    { method: 'DELETE' },
  );
}

export function updateFavoriteNote<T>(ref: PersonalAssetRef, note: string) {
  return request<{ items: T[] }>('market-favorites', {
    method: 'PATCH',
    body: JSON.stringify({ ...ref, note }),
  });
}

export function fetchRecent<T>() {
  return request<{ items: T[] }>('market-recent');
}

export function pushRecentView<T>(item: PersonalAssetSnapshot) {
  return request<{ items: T[] }>('market-recent', { method: 'PUT', body: JSON.stringify(item) });
}

export function fetchHidden() {
  return request<{ keys: string[] }>('market-hidden');
}

export function hideMarketItem(kind: MarketShelfKind, id: string) {
  return request<{ keys: string[] }>(
    `market-hidden/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,
    { method: 'PUT' },
  );
}
