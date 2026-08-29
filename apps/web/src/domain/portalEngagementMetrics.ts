import type { ContentEngagement } from './contentEngagement';

export type PortalEngagementAssetKind = 'tool' | 'skill' | 'agent';

export interface PortalEngagementCounts {
  likes: number;
  dislikes: number;
  favorites: number;
}

export interface PortalEngagementMetricRow extends PortalEngagementCounts {
  kind: PortalEngagementAssetKind;
  label: string;
  assetCount: number;
}

export interface PortalEngagementMetrics {
  rows: PortalEngagementMetricRow[];
  total: PortalEngagementCounts & { assetCount: number };
}

export interface PortalEngagementAssetIds {
  tools: readonly string[];
  skills: readonly string[];
  agents: readonly string[];
}

type EngagementCountsById = Readonly<
  Record<
    string,
    Pick<ContentEngagement, 'likes' | 'dislikes' | 'favorites'> | undefined
  >
>;

const ASSET_GROUPS: Array<{
  kind: PortalEngagementAssetKind;
  label: string;
  ids: keyof PortalEngagementAssetIds;
}> = [
  { kind: 'tool', label: '工具', ids: 'tools' },
  { kind: 'skill', label: 'Skill', ids: 'skills' },
  { kind: 'agent', label: 'Agent', ids: 'agents' },
];

function count(value: number | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Math.trunc(Number(value)) : 0;
}

/**
 * 按当前资产目录汇总互动指标。只统计传入的 ID，历史上已删除的内容不会进入看板；
 * 同一类型内重复的 ID 只计算一次。
 */
export function buildPortalEngagementMetrics(
  assetIds: PortalEngagementAssetIds,
  byId: EngagementCountsById,
): PortalEngagementMetrics {
  const rows = ASSET_GROUPS.map(({ kind, label, ids }): PortalEngagementMetricRow => {
    const uniqueIds = [...new Set(assetIds[ids].filter(Boolean))];
    const totals = uniqueIds.reduce<PortalEngagementCounts>(
      (sum, id) => {
        const engagement = byId[id];
        if (!engagement) return sum;
        sum.likes += count(engagement.likes);
        sum.dislikes += count(engagement.dislikes);
        sum.favorites += count(engagement.favorites);
        return sum;
      },
      { likes: 0, dislikes: 0, favorites: 0 },
    );

    return { kind, label, assetCount: uniqueIds.length, ...totals };
  });

  const total = rows.reduce<PortalEngagementMetrics['total']>(
    (sum, row) => ({
      assetCount: sum.assetCount + row.assetCount,
      likes: sum.likes + row.likes,
      dislikes: sum.dislikes + row.dislikes,
      favorites: sum.favorites + row.favorites,
    }),
    { assetCount: 0, likes: 0, dislikes: 0, favorites: 0 },
  );

  return { rows, total };
}
