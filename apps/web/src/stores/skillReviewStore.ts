import { create } from 'zustand';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  scheduleSavePlatformDoc,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

const DOC_KIND = 'skill-reviews' as const;
const MAX_PER_SKILL = 80;

export type SkillReviewItem = {
  id: string;
  skillId: string;
  userId: string;
  userName: string;
  /** 1–5 */
  rating: number;
  text: string;
  at: number;
  reply?: string;
  replyAt?: number;
};

type ReviewsDoc = {
  bySkillId?: Record<string, SkillReviewItem[]>;
};

function persist(bySkillId: Record<string, SkillReviewItem[]>) {
  if (!canUsePlatformDocsApi()) return;
  const ws = currentWorkspaceId();
  const payload: ReviewsDoc = { bySkillId };
  setPlatformDocMemory(ws, DOC_KIND, payload);
  void scheduleSavePlatformDoc(ws, DOC_KIND, payload);
}

interface SkillReviewState {
  bySkillId: Record<string, SkillReviewItem[]>;
  hydrate: () => void;
  listFor: (skillId: string) => SkillReviewItem[];
  statsFor: (skillId: string) => { count: number; avg: number; good: number; bad: number };
  addReview: (skillId: string, rating: number, text: string) => void;
  replyReview: (skillId: string, reviewId: string, reply: string) => void;
}

export const useSkillReviewStore = create<SkillReviewState>((set, get) => ({
  bySkillId: {},

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ bySkillId: {} });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<ReviewsDoc>(currentWorkspaceId(), DOC_KIND);
        const bySkillId =
          remote?.bySkillId && typeof remote.bySkillId === 'object' ? remote.bySkillId : {};
        if (remote) setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, remote);
        set({ bySkillId });
      } catch {
        set({ bySkillId: {} });
      }
    })();
  },

  listFor: (skillId) => {
    const mem = peekPlatformDocMemory<ReviewsDoc>(currentWorkspaceId(), DOC_KIND);
    const fromMem = mem?.bySkillId?.[skillId];
    if (Array.isArray(fromMem)) return fromMem;
    return get().bySkillId[skillId] ?? [];
  },

  statsFor: (skillId) => {
    const list = get().listFor(skillId);
    if (!list.length) return { count: 0, avg: 0, good: 0, bad: 0 };
    const sum = list.reduce((n, r) => n + r.rating, 0);
    const good = list.filter((r) => r.rating >= 4).length;
    const bad = list.filter((r) => r.rating <= 2).length;
    return { count: list.length, avg: Math.round((sum / list.length) * 10) / 10, good, bad };
  },

  addReview: (skillId, rating, text) => {
    const clamped = Math.min(5, Math.max(1, Math.round(rating)));
    const item: SkillReviewItem = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      skillId,
      userId: getCurrentUserId() || 'anonymous',
      userName: getCurrentUserName() || '匿名用户',
      rating: clamped,
      text: text.trim().slice(0, 500),
      at: Date.now(),
    };
    const prev = get().bySkillId[skillId] ?? [];
    const nextList = [item, ...prev].slice(0, MAX_PER_SKILL);
    const bySkillId = { ...get().bySkillId, [skillId]: nextList };
    set({ bySkillId });
    persist(bySkillId);
  },

  replyReview: (skillId, reviewId, reply) => {
    const prev = get().bySkillId[skillId] ?? [];
    const nextList = prev.map((r) =>
      r.id === reviewId
        ? { ...r, reply: reply.trim().slice(0, 500), replyAt: Date.now() }
        : r,
    );
    const bySkillId = { ...get().bySkillId, [skillId]: nextList };
    set({ bySkillId });
    persist(bySkillId);
  },
}));
