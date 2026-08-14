/** 内容运营 · 统一互动指标与排行（P2） */

import { isDemoContentEnabled } from '@/domain/demoContentPolicy';

export type RankMode =
  | 'trending'
  | 'newest'
  | 'top_rated'
  | 'most_used'
  | 'most_downloaded'
  | 'most_viewed'
  | 'most_favorited'
  | 'most_liked'
  | 'most_disliked';

export const RANK_MODE_OPTIONS: { id: RankMode; label: string }[] = [
  { id: 'trending', label: '热门推荐' },
  { id: 'newest', label: '最新上线' },
  { id: 'most_downloaded', label: '最多下载' },
  { id: 'top_rated', label: '最高评分' },
  { id: 'most_used', label: '最多使用' },
];

/** 外部 / 内部 / MSS 货架：按互动指标排序 */
export const SHELF_RANK_TABS: { id: RankMode; label: string }[] = [
  { id: 'most_viewed', label: '查看' },
  { id: 'most_favorited', label: '收藏' },
  { id: 'most_liked', label: '点赞' },
  { id: 'most_disliked', label: '点踩' },
];

/** 首页 MSS 工具集市排行 Tab（去掉最高评分；不含「最多使用」以免与热门重叠） */
export const HOME_RANK_TABS: { id: RankMode; label: string }[] = [
  { id: 'trending', label: '热门推荐' },
  { id: 'newest', label: '最新上线' },
  { id: 'most_downloaded', label: '最多下载' },
];

export interface ContentEngagement {
  id: string;
  likes: number;
  dislikes: number;
  downloads: number;
  /** 打开 / 调用次数（近窗累计，演示用） */
  uses: number;
  /** 收藏人数 */
  favorites: number;
  updatedAt: string;
}

export interface RankableContent {
  id: string;
  publishedAt?: string;
  /** 工具/专家等已有调用量，并入 uses */
  baseUses?: number;
}

/** 热度：近窗使用 ×0.7 + 点赞 ×0.3 */
export function heatScore(e: ContentEngagement): number {
  return e.uses * 0.7 + e.likes * 0.3;
}

export function ratingNet(e: ContentEngagement): number {
  return e.likes - e.dislikes;
}

export function dislikeRatio(e: ContentEngagement): number {
  const total = e.likes + e.dislikes;
  if (total <= 0) return 0;
  return e.dislikes / total;
}

/** 点踩占比 ≥30% 且样本 ≥5 → 进入待优化队列 */
export function needsOptimization(e: ContentEngagement, minVotes = 5, ratio = 0.3): boolean {
  const total = e.likes + e.dislikes;
  if (total < minVotes) return false;
  return dislikeRatio(e) >= ratio;
}

export function emptyEngagement(id: string): ContentEngagement {
  return {
    id,
    likes: 0,
    dislikes: 0,
    downloads: 0,
    uses: 0,
    favorites: 0,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

/** 演示种子：按 id 稳定生成初始互动，避免全 0 */
export function seedEngagement(id: string): ContentEngagement {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const likes = 8 + (h % 40);
  const dislikes = h % 7;
  const downloads = 3 + (h % 25);
  const uses = 20 + (h % 80);
  const favorites = 2 + (h % 18);
  return {
    id,
    likes,
    dislikes,
    downloads,
    uses,
    favorites,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export function mergeEngagement(
  base: ContentEngagement,
  patch: Partial<ContentEngagement>,
): ContentEngagement {
  return {
    ...base,
    ...patch,
    id: base.id,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export function normalizeEngagement(e: ContentEngagement): ContentEngagement {
  return {
    ...e,
    likes: e.likes ?? 0,
    dislikes: e.dislikes ?? 0,
    downloads: e.downloads ?? 0,
    uses: e.uses ?? 0,
    favorites: e.favorites ?? 0,
  };
}

const resolvedMissCache = new Map<string, ContentEngagement>();

function ensureNumericFields(e: ContentEngagement): ContentEngagement {
  if (typeof e.likes !== 'number') e.likes = 0;
  if (typeof e.dislikes !== 'number') e.dislikes = 0;
  if (typeof e.downloads !== 'number') e.downloads = 0;
  if (typeof e.uses !== 'number') e.uses = 0;
  if (typeof e.favorites !== 'number') e.favorites = 0;
  return e;
}

export function resolveEngagement(
  id: string,
  map: Record<string, ContentEngagement>,
): ContentEngagement {
  const existing = map[id];
  if (existing) return ensureNumericFields(existing);
  const cached = resolvedMissCache.get(id);
  if (cached) return cached;
  const created = isDemoContentEnabled() ? seedEngagement(id) : emptyEngagement(id);
  resolvedMissCache.set(id, created);
  return created;
}

export function sortByRankMode<T extends RankableContent>(
  items: T[],
  mode: RankMode,
  engagementOf: (id: string) => ContentEngagement,
): T[] {
  const scored = items.map((item) => {
    const e = engagementOf(item.id);
    const uses = e.uses + (item.baseUses ?? 0);
    const merged = { ...e, uses };
    return { item, e: merged };
  });

  scored.sort((a, b) => {
    switch (mode) {
      case 'trending':
        return heatScore(b.e) - heatScore(a.e);
      case 'newest': {
        const da = a.item.publishedAt ?? a.e.updatedAt;
        const db = b.item.publishedAt ?? b.e.updatedAt;
        return db.localeCompare(da);
      }
      case 'top_rated':
        return ratingNet(b.e) - ratingNet(a.e) || b.e.likes - a.e.likes;
      case 'most_used':
        return b.e.uses - a.e.uses;
      case 'most_downloaded':
        return b.e.downloads - a.e.downloads || b.e.uses - a.e.uses;
      case 'most_viewed':
        return b.e.uses - a.e.uses;
      case 'most_favorited':
        return (b.e.favorites ?? 0) - (a.e.favorites ?? 0) || b.e.uses - a.e.uses;
      case 'most_liked':
        return b.e.likes - a.e.likes || b.e.uses - a.e.uses;
      case 'most_disliked':
        return b.e.dislikes - a.e.dislikes || b.e.uses - a.e.uses;
      default:
        return 0;
    }
  });

  return scored.map((s) => s.item);
}
