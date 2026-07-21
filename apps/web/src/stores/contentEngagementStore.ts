import { create } from 'zustand';
import {
  emptyEngagement,
  mergeEngagement,
  needsOptimization,
  resolveEngagement,
  seedEngagement,
  type ContentEngagement,
} from '@/domain/contentEngagement';

const LS_KEY = 'mssclaw_content_engagement_v1';
const LS_VOTE_KEY = 'mssclaw_content_user_votes_v1';

type UserVote = 'like' | 'dislike' | null;

function loadMap(): Record<string, ContentEngagement> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ContentEngagement>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadVotes(): Record<string, UserVote> {
  try {
    const raw = localStorage.getItem(LS_VOTE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, UserVote>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persist(map: Record<string, ContentEngagement>, votes: Record<string, UserVote>) {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
  localStorage.setItem(LS_VOTE_KEY, JSON.stringify(votes));
}

interface ContentEngagementState {
  byId: Record<string, ContentEngagement>;
  userVotes: Record<string, UserVote>;
  get: (id: string) => ContentEngagement;
  userVote: (id: string) => UserVote;
  bumpUse: (id: string) => void;
  bumpDownload: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleDislike: (id: string) => void;
  optimizationQueue: () => ContentEngagement[];
}

function ensure(map: Record<string, ContentEngagement>, id: string): ContentEngagement {
  return map[id] ?? seedEngagement(id);
}

export const useContentEngagementStore = create<ContentEngagementState>((set, get) => ({
  byId: loadMap(),
  userVotes: loadVotes(),

  get: (id) => resolveEngagement(id, get().byId),

  userVote: (id) => get().userVotes[id] ?? null,

  bumpUse: (id) => {
    const prev = ensure(get().byId, id);
    const next = mergeEngagement(prev, { uses: prev.uses + 1 });
    const byId = { ...get().byId, [id]: next };
    set({ byId });
    persist(byId, get().userVotes);
  },

  bumpDownload: (id) => {
    const prev = ensure(get().byId, id);
    const next = mergeEngagement(prev, { downloads: prev.downloads + 1 });
    const byId = { ...get().byId, [id]: next };
    set({ byId });
    persist(byId, get().userVotes);
  },

  toggleLike: (id) => {
    const prev = ensure(get().byId, id);
    const vote = get().userVotes[id] ?? null;
    let likes = prev.likes;
    let dislikes = prev.dislikes;
    let nextVote: UserVote = 'like';

    if (vote === 'like') {
      likes = Math.max(0, likes - 1);
      nextVote = null;
    } else if (vote === 'dislike') {
      dislikes = Math.max(0, dislikes - 1);
      likes += 1;
      nextVote = 'like';
    } else {
      likes += 1;
    }

    const byId = { ...get().byId, [id]: mergeEngagement(prev, { likes, dislikes }) };
    const userVotes = { ...get().userVotes, [id]: nextVote };
    set({ byId, userVotes });
    persist(byId, userVotes);
  },

  toggleDislike: (id) => {
    const prev = ensure(get().byId, id);
    const vote = get().userVotes[id] ?? null;
    let likes = prev.likes;
    let dislikes = prev.dislikes;
    let nextVote: UserVote = 'dislike';

    if (vote === 'dislike') {
      dislikes = Math.max(0, dislikes - 1);
      nextVote = null;
    } else if (vote === 'like') {
      likes = Math.max(0, likes - 1);
      dislikes += 1;
      nextVote = 'dislike';
    } else {
      dislikes += 1;
    }

    const byId = { ...get().byId, [id]: mergeEngagement(prev, { likes, dislikes }) };
    const userVotes = { ...get().userVotes, [id]: nextVote };
    set({ byId, userVotes });
    persist(byId, userVotes);
  },

  optimizationQueue: () => {
    const { byId } = get();
    const list = Object.values(byId).length
      ? Object.values(byId)
      : [];
    // 确保常见 id 也有种子参与队列演示：仅返回已有记录中需优化�?
    return list.filter((e) => needsOptimization(e)).sort((a, b) => dislikeRatioDesc(b, a));
  },
}));

function dislikeRatioDesc(a: ContentEngagement, b: ContentEngagement) {
  const ra = a.dislikes / Math.max(1, a.likes + a.dislikes);
  const rb = b.dislikes / Math.max(1, b.likes + b.dislikes);
  return ra - rb;
}

/** 演示：对一批内�?id 预热种子，便于运营看板有数据 */
export function ensureEngagementSeeds(ids: string[]) {
  const state = useContentEngagementStore.getState();
  const byId = { ...state.byId };
  let changed = false;
  for (const id of ids) {
    if (!byId[id]) {
      byId[id] = seedEngagement(id);
      changed = true;
    }
  }
  if (changed) {
    useContentEngagementStore.setState({ byId });
    persist(byId, state.userVotes);
  }
}

const DEMO_QUEUE_FLAG = 'mssclaw_engagement_demo_queue_v1';

/** 仅首次写入高踩样本，便于运营看板演示「待优化」队�?*/
export function forceQueueDemoSeeds(ids: string[]) {
  try {
    if (localStorage.getItem(DEMO_QUEUE_FLAG)) return;
  } catch {
    /* ignore */
  }
  const state = useContentEngagementStore.getState();
  const byId = { ...state.byId };
  ids.slice(0, 2).forEach((id, i) => {
    byId[id] = {
      ...(byId[id] ?? emptyEngagement(id)),
      id,
      likes: 3 + i,
      dislikes: 12 + i * 2,
      downloads: 5,
      uses: 30,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  });
  useContentEngagementStore.setState({ byId });
  persist(byId, state.userVotes);
  try {
    localStorage.setItem(DEMO_QUEUE_FLAG, '1');
  } catch {
    /* ignore */
  }
}
