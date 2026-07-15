/** 内容运营 · 统一互动指标与排行（P2） */

export type RankMode = 'trending' | 'newest' | 'top_rated' | 'most_used';

export const RANK_MODE_OPTIONS: { id: RankMode; label: string }[] = [
  { id: 'trending', label: '最热' },
  { id: 'newest', label: '最新' },
  { id: 'top_rated', label: '好评' },
  { id: 'most_used', label: '最多使用' },
];

export interface ContentEngagement {
  id: string;
  likes: number;
  dislikes: number;
  downloads: number;
  /** 打开 / 调用次数（近窗累计，演示用） */
  uses: number;
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
  return {
    id,
    likes,
    dislikes,
    downloads,
    uses,
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

export function resolveEngagement(
  id: string,
  map: Record<string, ContentEngagement>,
): ContentEngagement {
  return map[id] ?? seedEngagement(id);
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
      default:
        return 0;
    }
  });

  return scored.map((s) => s.item);
}
