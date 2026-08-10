import { create } from 'zustand';
import {
  emptyEngagement,
  mergeEngagement,
  needsOptimization,
  resolveEngagement,
  seedEngagement,
  type ContentEngagement,
} from '@/domain/contentEngagement';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

type UserVote = 'like' | 'dislike' | null;

type EngagementDoc = {
  byId?: Record<string, ContentEngagement>;
  userVotes?: Record<string, UserVote>;
};

function persist(map: Record<string, ContentEngagement>, votes: Record<string, UserVote>) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'content-engagement', {
    byId: map,
    userVotes: votes,
  });
}

interface ContentEngagementState {
  byId: Record<string, ContentEngagement>;
  userVotes: Record<string, UserVote>;
  hydrate: () => void;
  get: (id: string) => ContentEngagement;
  userVote: (id: string) => UserVote;
  bumpUse: (id: string) => void;
  bumpDownload: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleDislike: (id: string) => void;
  optimizationQueue: () => ContentEngagement[];
}

function ensure(map: Record<string, ContentEngagement>, id: string): ContentEngagement {
  if (map[id]) return map[id];
  return isDemoContentEnabled() ? seedEngagement(id) : emptyEngagement(id);
}

export const useContentEngagementStore = create<ContentEngagementState>((set, get) => ({
  byId: {},
  userVotes: {},

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ byId: {}, userVotes: {} });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<EngagementDoc>(
          currentWorkspaceId(),
          'content-engagement',
        );
        const byId =
          remote?.byId && typeof remote.byId === 'object' ? remote.byId : {};
        const userVotes =
          remote?.userVotes && typeof remote.userVotes === 'object'
            ? remote.userVotes
            : {};
        set({ byId, userVotes });
      } catch {
        set({ byId: {}, userVotes: {} });
      }
    })();
  },

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
    return list.filter((e) => needsOptimization(e)).sort((a, b) => dislikeRatioDesc(b, a));
  },
}));

function dislikeRatioDesc(a: ContentEngagement, b: ContentEngagement) {
  const ra = a.dislikes / Math.max(1, a.likes + a.dislikes);
  const rb = b.dislikes / Math.max(1, b.likes + b.dislikes);
  return ra - rb;
}

/** ???? id ??????? */
export function ensureEngagementSeeds(ids: string[]) {
  if (!isDemoContentEnabled()) return;
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

let demoQueueSeeded = false;

/** ??????????????????? */
export function forceQueueDemoSeeds(ids: string[]) {
  if (!isDemoContentEnabled()) return;
  if (demoQueueSeeded) return;
  demoQueueSeeded = true;
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
}
