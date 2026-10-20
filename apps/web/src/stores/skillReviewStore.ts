import { create } from 'zustand';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

/** Skill 评价只读：界面上没有写评价的入口，服务端也不再接受整份覆盖写入 */
const DOC_KIND = 'skill-reviews' as const;

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

interface SkillReviewState {
  bySkillId: Record<string, SkillReviewItem[]>;
  hydrate: () => void;
  listFor: (skillId: string) => SkillReviewItem[];
  statsFor: (skillId: string) => { count: number; avg: number; good: number; bad: number };
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
        const remote = await fetchPlatformDoc<ReviewsDoc>(DOC_KIND);
        const bySkillId =
          remote?.bySkillId && typeof remote.bySkillId === 'object' ? remote.bySkillId : {};
        if (remote) setPlatformDocMemory(DOC_KIND, remote);
        set({ bySkillId });
      } catch {
        set({ bySkillId: {} });
      }
    })();
  },

  listFor: (skillId) => {
    const mem = peekPlatformDocMemory<ReviewsDoc>(DOC_KIND);
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
}));
