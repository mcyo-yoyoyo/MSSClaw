import { apiAuthHeaders, apiUrl } from '@/api/client';
import type { ContentEngagement } from '@/domain/contentEngagement';

export type MarketUserVote = 'like' | 'dislike' | null;
export type MarketEngagementAction =
  | 'view'
  | 'use'
  | 'download'
  | 'favorite'
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

export async function fetchMarketEngagementApi(
  workspaceId: string,
  userId: string,
): Promise<MarketEngagementSnapshot> {
  const query = new URLSearchParams({ userId });
  const res = await fetch(
    apiUrl(`/api/v1/workspaces/${workspaceId}/market-engagement?${query.toString()}`),
    { headers: { Accept: 'application/json', ...apiAuthHeaders() }, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`market_engagement_get_${res.status}`);
  return (await res.json()) as MarketEngagementSnapshot;
}

export async function mutateMarketEngagementApi(
  workspaceId: string,
  contentId: string,
  input: { action: MarketEngagementAction; userId: string; active?: boolean },
): Promise<MarketEngagementMutation> {
  const res = await fetch(
    apiUrl(
      `/api/v1/workspaces/${workspaceId}/market-engagement/${encodeURIComponent(contentId)}/actions`,
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
  );
  if (!res.ok) throw new Error(`market_engagement_mutate_${res.status}`);
  return (await res.json()) as MarketEngagementMutation;
}
