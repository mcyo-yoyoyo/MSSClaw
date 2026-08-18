import { create } from 'zustand';
import {
  emptyEngagement,
  needsOptimization,
  normalizeEngagement,
  type ContentEngagement,
} from '@/domain/contentEngagement';
import { getCurrentUserId } from '@/domain/currentUser';
import { canUsePlatformDocsApi, currentWorkspaceId } from '@/api/platformDocsApi';
import {
  fetchMarketEngagementApi,
  mutateMarketEngagementApi,
  type MarketEngagementAction,
  type MarketUserVote,
} from '@/api/marketEngagementApi';

type UserVote = MarketUserVote;

interface ContentEngagementState {
  byId: Record<string, ContentEngagement>;
  userVotes: Record<string, UserVote>;
  hydrated: boolean;
  hydrate: () => void;
  get: (id: string) => ContentEngagement;
  userVote: (id: string) => UserVote;
  bumpView: (id: string) => void;
  bumpUse: (id: string) => void;
  bumpDownload: (id: string) => void;
  bumpFavorite: (id: string, delta: 1 | -1) => void;
  toggleLike: (id: string) => void;
  toggleDislike: (id: string) => void;
  optimizationQueue: () => ContentEngagement[];
}

type StoreSet = (
  partial:
    | Partial<ContentEngagementState>
    | ((state: ContentEngagementState) => Partial<ContentEngagementState>),
) => void;

function runMutation(
  set: StoreSet,
  id: string,
  action: MarketEngagementAction,
  active?: boolean,
) {
  if (!canUsePlatformDocsApi()) return;
  void mutateMarketEngagementApi(currentWorkspaceId(), id, {
    action,
    userId: getCurrentUserId() || 'anonymous',
    active,
  })
    .then((result) => {
      const engagement = normalizeEngagement(result.engagement);
      set((state) => ({
        byId: { ...state.byId, [id]: engagement },
        userVotes: { ...state.userVotes, [id]: result.userVote },
      }));
    })
    .catch(() => {
      // 后端是唯一真相源；失败时不伪造本地计数，等待下次 hydrate。
    });
}

export const useContentEngagementStore = create<ContentEngagementState>((set, get) => ({
  byId: {},
  userVotes: {},
  hydrated: false,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        // 未连后端：保留已拉到的计数。清空会让统计页整片显示 0，
        // 而全局只在 App 启动时 hydrate 一次，启动时登录态未就绪就会
        // 整个会话都是 0（曾表现为「配置工具」统计卡全零）。
        set({ hydrated: true });
        return;
      }
      try {
        const remote = await fetchMarketEngagementApi(
          currentWorkspaceId(),
          getCurrentUserId() || 'anonymous',
        );
        const byId = Object.fromEntries(
          Object.entries(remote.byId ?? {}).map(([id, value]) => [
            id,
            normalizeEngagement({ ...value, id }),
          ]),
        );
        set({ byId, userVotes: remote.userVotes ?? {}, hydrated: true });
      } catch {
        // 同上：请求失败不覆盖既有计数
        set({ hydrated: true });
      }
    })();
  },

  get: (id) => get().byId[id] ?? emptyEngagement(id),
  userVote: (id) => get().userVotes[id] ?? null,
  bumpView: (id) => runMutation(set, id, 'view'),
  bumpUse: (id) => runMutation(set, id, 'use'),
  bumpDownload: (id) => runMutation(set, id, 'download'),
  bumpFavorite: (id, delta) => runMutation(set, id, 'favorite', delta > 0),
  toggleLike: (id) => runMutation(set, id, 'like'),
  toggleDislike: (id) => runMutation(set, id, 'dislike'),

  optimizationQueue: () =>
    Object.values(get().byId)
      .filter((engagement) => needsOptimization(engagement))
      .sort((a, b) => {
        const aRatio = a.dislikes / Math.max(1, a.likes + a.dislikes);
        const bRatio = b.dislikes / Math.max(1, b.likes + b.dislikes);
        return bRatio - aRatio;
      }),
}));
