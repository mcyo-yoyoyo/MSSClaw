import { create } from 'zustand';
import {
  emptyEngagement,
  needsOptimization,
  normalizeEngagement,
  type ContentEngagement,
} from '@/domain/contentEngagement';
import { canUsePlatformDocsApi } from '@/api/platformDocsApi';
import {
  fetchMarketEngagementApi,
  mutateMarketEngagementApi,
  type MarketAssetType,
  type MarketEngagementAction,
  type MarketUserVote,
} from '@/api/marketEngagementApi';
import { guestVisitorRef } from '@/domain/visitorIdentity';
import { isApiEnabled, readSessionToken } from '@/api/client';
import { createDetailEventQueue, createMarketEngagementEventId } from '@/domain/detailEventQueue';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type UserVote = MarketUserVote;

interface ContentEngagementState {
  byId: Record<string, ContentEngagement>;
  userVotes: Record<string, UserVote>;
  hydrated: boolean;
  hydrate: () => void;
  get: (id: string) => ContentEngagement;
  userVote: (id: string) => UserVote;
  bumpExposure: (id: string, assetType?: MarketAssetType) => void;
  /** 详情页直达时 action 传 detail_direct（代替 detail，见 domain/directEntry） */
  bumpDetail: (id: string, assetType?: MarketAssetType, action?: 'detail' | 'detail_direct') => void;
  bumpView: (id: string, assetType?: MarketAssetType) => void;
  bumpUse: (id: string, assetType?: MarketAssetType) => void;
  bumpRedirect: (id: string, assetType?: MarketAssetType) => void;
  bumpDownload: (id: string, assetType?: MarketAssetType) => void;
  /** 收藏接口在服务端同一事务里改了计数，直接写入返回的结果 */
  applyEngagement: (id: string, engagement: unknown) => void;
  toggleLike: (id: string, assetType?: MarketAssetType) => void;
  toggleDislike: (id: string, assetType?: MarketAssetType) => void;
  optimizationQueue: () => ContentEngagement[];
}

type StoreSet = (
  partial:
    | Partial<ContentEngagementState>
    | ((state: ContentEngagementState) => Partial<ContentEngagementState>),
) => void;

type DetailMutation = {
  set: StoreSet;
  id: string;
  input: Parameters<typeof mutateMarketEngagementApi>[1];
};
const detailQueue = createDetailEventQueue({
  // Wait for initial bootstrap, but do not let a stale "unreachable" flag suppress real retries.
  ready: () => isApiEnabled() && useWorkspaceStore.getState().apiStatus !== 'unknown',
  identity: readSessionToken,
  send: (value: DetailMutation) => mutateMarketEngagementApi(value.id, value.input),
  success: ({ set, id }, result) => {
    const engagement = normalizeEngagement(result.engagement);
    set(state => ({ byId: { ...state.byId, [id]: engagement }, userVotes: { ...state.userVotes, [id]: result.userVote } }));
  },
});
useWorkspaceStore.subscribe((state, previous) => {
  if (state.apiStatus !== previous.apiStatus || (state.apiConnected && !previous.apiConnected)) detailQueue.flush();
});
if (typeof window !== 'undefined') window.addEventListener('online', detailQueue.flush);

function runMutation(
  set: StoreSet,
  id: string,
  action: MarketEngagementAction,
  active?: boolean,
  assetType?: MarketAssetType,
) {
  const isDetail = action === 'detail' || action === 'detail_direct';
  if (isDetail ? !isApiEnabled() : !canUsePlatformDocsApi()) return;
  const input = {
    action,
    active,
    eventId: createMarketEngagementEventId(),
    visitorId: guestVisitorRef(),
    ...(assetType ? { assetType } : {}),
  };
  if (isDetail) {
    detailQueue.enqueue(input.eventId, { set, id, input });
    return;
  }
  void mutateMarketEngagementApi(id, input)
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
        const remote = await fetchMarketEngagementApi();
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
  bumpExposure: (id, assetType) => runMutation(set, id, 'exposure', undefined, assetType),
  bumpDetail: (id, assetType, action = 'detail') => runMutation(set, id, action, undefined, assetType),
  bumpView: (id, assetType) => runMutation(set, id, 'view', undefined, assetType),
  bumpUse: (id, assetType) => runMutation(set, id, 'use', undefined, assetType),
  bumpRedirect: (id, assetType) => runMutation(set, id, 'redirect', undefined, assetType),
  bumpDownload: (id, assetType) => runMutation(set, id, 'download', undefined, assetType),
  applyEngagement: (id, engagement) =>
    set((state) => ({ byId: { ...state.byId, [id]: normalizeEngagement(engagement as ContentEngagement) } })),
  toggleLike: (id, assetType) => runMutation(set, id, 'like', undefined, assetType),
  toggleDislike: (id, assetType) => runMutation(set, id, 'dislike', undefined, assetType),

  optimizationQueue: () =>
    Object.values(get().byId)
      .filter((engagement) => needsOptimization(engagement))
      .sort((a, b) => {
        const aRatio = a.dislikes / Math.max(1, a.likes + a.dislikes);
        const bRatio = b.dislikes / Math.max(1, b.likes + b.dislikes);
        return bRatio - aRatio;
      }),
}));
