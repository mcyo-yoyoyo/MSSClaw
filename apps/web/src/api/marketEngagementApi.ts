import { apiAuthHeaders, apiUrl, fetchWithTimeout } from '@/api/client';
import type { ContentEngagement } from '@/domain/contentEngagement';

export type MarketUserVote = 'like' | 'dislike' | null;
export type MarketAssetType = 'tool' | 'skill' | 'agent' | 'office-scene' | 'case' | 'unknown';
export type MarketEngagementAction =
  | 'detail'
  | 'detail_direct'
  | 'share'
  | 'view'
  | 'use'
  | 'redirect'
  | 'download'
  | 'favorite'
  | 'unfavorite'
  | 'like'
  | 'dislike';

export type MarketEngagementSnapshot = {
  byId: Record<string, ContentEngagement>;
  userVotes: Record<string, MarketUserVote>;
  favorites: Record<string, boolean>;
};

export type MarketEngagementMutation = {
  engagement: ContentEngagement;
  userVote: MarketUserVote;
  favorited: boolean;
};

/** 身份由会话 token 决定：游客只拿到聚合计数，个人态为空 */
export async function fetchMarketEngagementApi(
): Promise<MarketEngagementSnapshot> {
  const res = await fetch(
    apiUrl(`/api/v1/market-engagement`),
    { headers: { Accept: 'application/json', ...apiAuthHeaders() }, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`market_engagement_get_${res.status}`);
  return (await res.json()) as MarketEngagementSnapshot;
}

/** 当前账号分享这个资产用的编号；同一账号同一资产始终相同。游客不能分享。 */
export async function fetchMarketShareCodeApi(contentId: string): Promise<string> {
  const res = await fetchWithTimeout(
    apiUrl(`/api/v1/market-engagement/${encodeURIComponent(contentId)}/share-code`),
    {
      method: 'POST',
      headers: { Accept: 'application/json', ...apiAuthHeaders() },
    },
    20_000,
  );
  if (!res.ok) throw new Error(`market_share_code_${res.status}`);
  return ((await res.json()) as { shareCode: string }).shareCode;
}

export async function mutateMarketEngagementApi(
  contentId: string,
  input: {
    action: MarketEngagementAction;
    active?: boolean;
    eventId: string;
    visitorId: string;
    assetType?: MarketAssetType;
    /** detail_direct 时带上：打开的分享链接上的编号 */
    shareCode?: string;
  },
): Promise<MarketEngagementMutation> {
  const res = await fetchWithTimeout(
    apiUrl(
      `/api/v1/market-engagement/${encodeURIComponent(contentId)}/actions`,
    ),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...apiAuthHeaders(),
      },
      body: JSON.stringify(input),
    },
    20_000,
  );
  if (!res.ok) throw new Error(`market_engagement_mutate_${res.status}`);
  return (await res.json()) as MarketEngagementMutation;
}
