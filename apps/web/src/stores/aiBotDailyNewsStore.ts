import { create } from 'zustand';
import {
  AI_BOT_DAILY_NEWS_FALLBACK,
  fetchAiBotDailyNews,
  flattenAiBotNews,
  readCachedAiBotDailyNews,
  type AiBotDailyNewsPayload,
  type AiBotNewsItem,
} from '@/domain/aiBotDailyNews';

type SyncResult = {
  ok: boolean;
  message: string;
  itemCount: number;
  latestDate: string | null;
};

type State = {
  payload: AiBotDailyNewsPayload;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  hydrate: (force?: boolean) => Promise<void>;
  /** 平台运营：强制拉取 ai-bot.cn 并刷新展示 */
  syncFromSource: () => Promise<SyncResult>;
  latest: () => AiBotNewsItem | null;
};

let inflight: Promise<void> | null = null;
let lastHydratedAt = 0;
const TTL_MS = 10 * 60 * 1000;

function initialPayload(): AiBotDailyNewsPayload {
  return readCachedAiBotDailyNews() ?? AI_BOT_DAILY_NEWS_FALLBACK;
}

export const useAiBotDailyNewsStore = create<State>((set, get) => ({
  payload: initialPayload(),
  loading: false,
  syncing: false,
  error: null,
  lastSyncedAt: readCachedAiBotDailyNews()?.fetchedAt ?? null,

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
          lastSyncedAt: payload.fromFallback ? get().lastSyncedAt : payload.fetchedAt,
        });
      } catch {
        set({
          loading: false,
          error: null,
          payload: readCachedAiBotDailyNews() ?? AI_BOT_DAILY_NEWS_FALLBACK,
        });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  syncFromSource: async () => {
    set({ syncing: true, error: null });
    try {
      const payload = await fetchAiBotDailyNews();
      if (payload.fromFallback || !payload.groups.length) {
        set({ syncing: false, error: '同步失败，已保留当前内容' });
        return {
          ok: false,
          message: '未能从 ai-bot.cn 拉取最新快讯（接口不可用），已保留当前内容',
          itemCount: get().payload.groups.reduce((n, g) => n + g.items.length, 0),
          latestDate: get().payload.groups[0]?.dateLabel ?? null,
        };
      }
      lastHydratedAt = Date.now();
      set({
        payload,
        syncing: false,
        error: null,
        lastSyncedAt: payload.fetchedAt,
      });
      const itemCount = payload.groups.reduce((n, g) => n + g.items.length, 0);
      const latestDate = payload.groups[0]?.dateLabel ?? null;
      return {
        ok: true,
        message: `已同步 ${itemCount} 条快讯${latestDate ? `（最新：${latestDate}）` : ''}`,
        itemCount,
        latestDate,
      };
    } catch {
      set({ syncing: false, error: '同步失败' });
      return {
        ok: false,
        message: '同步失败，请稍后重试',
        itemCount: 0,
        latestDate: null,
      };
    }
  },

  latest: () => flattenAiBotNews(get().payload)[0] ?? null,
}));
