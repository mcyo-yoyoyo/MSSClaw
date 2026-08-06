import { create } from 'zustand';
import {
  AI_BOT_DAILY_NEWS_FALLBACK,
  fetchAiBotDailyNews,
  flattenAiBotNews,
  type AiBotDailyNewsPayload,
  type AiBotNewsItem,
} from '@/domain/aiBotDailyNews';

type State = {
  payload: AiBotDailyNewsPayload;
  loading: boolean;
  error: string | null;
  hydrate: (force?: boolean) => Promise<void>;
  latest: () => AiBotNewsItem | null;
};

let inflight: Promise<void> | null = null;
let lastHydratedAt = 0;
const TTL_MS = 10 * 60 * 1000;

export const useAiBotDailyNewsStore = create<State>((set, get) => ({
  payload: AI_BOT_DAILY_NEWS_FALLBACK,
  loading: false,
  error: null,

  hydrate: async (force = false) => {
    if (!force && Date.now() - lastHydratedAt < TTL_MS && get().payload.groups.length) {
      return;
    }
    if (inflight) return inflight;
    set({ loading: true, error: null });
    inflight = (async () => {
      try {
        const payload = await fetchAiBotDailyNews();
        lastHydratedAt = Date.now();
        set({
          payload,
          loading: false,
          error: null,
        });
      } catch {
        set({
          loading: false,
          error: null,
          payload: AI_BOT_DAILY_NEWS_FALLBACK,
        });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  latest: () => flattenAiBotNews(get().payload)[0] ?? null,
}));
