import { create } from 'zustand';
import {
  emptyAiBotDailyNews,
  fetchAiBotDailyNews,
  flattenAiBotNews,
  syncAiBotDailyNews,
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
  /** 平台运营：强制拉取 AIHOT 并刷新展示 */
  syncFromSource: () => Promise<SyncResult>;
  latest: () => AiBotNewsItem | null;
};

let inflight: Promise<void> | null = null;
let syncInflight: Promise<SyncResult> | null = null;
let lastHydratedAt = 0;
const TTL_MS = 10 * 60 * 1000;

function hasNews(payload: AiBotDailyNewsPayload): boolean {
  return payload.groups.some((group) => group.items.length > 0);
}

export const useAiBotDailyNewsStore = create<State>((set, get) => ({
  payload: emptyAiBotDailyNews(),
  loading: true,
  syncing: false,
  error: null,
  lastSyncedAt: null,

  hydrate: async (force = false) => {
    if (!force && hasNews(get().payload) && Date.now() - lastHydratedAt < TTL_MS) {
      return;
    }
    if (inflight) return inflight;
    set({ loading: true, error: null });
    inflight = (async () => {
      try {
        const payload = await fetchAiBotDailyNews();
        if (!hasNews(payload)) {
          set({ loading: !hasNews(get().payload), error: null });
          return;
        }
        lastHydratedAt = Date.now();
        set({
          payload,
          loading: false,
          error: null,
          lastSyncedAt: payload.fetchedAt,
        });
      } catch {
        set({ loading: !hasNews(get().payload), error: null });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  syncFromSource: () => {
    if (syncInflight) return syncInflight;
    const operation = (async (): Promise<SyncResult> => {
      set({ syncing: true, error: null });
      try {
        const sync = await syncAiBotDailyNews();
        if (!sync.ok) {
          const detail = sync.error?.trim();
          const message = detail ? `拉取失败：${detail}` : '未能从 AIHOT 拉取最新快讯';
          set({ syncing: false, error: message });
          return {
            ok: false,
            message: `${message}，已保留当前内容`,
            itemCount: get().payload.groups.reduce((n, g) => n + g.items.length, 0),
            latestDate: get().payload.groups[0]?.dateLabel ?? null,
          };
        }

        const payload = await fetchAiBotDailyNews();
        if (!hasNews(payload)) {
          const message = '快讯已拉取，但页面未能读取最新内容';
          set({ syncing: false, error: message });
          return {
            ok: false,
            message: `${message}，请稍后刷新`,
            itemCount: get().payload.groups.reduce((n, g) => n + g.items.length, 0),
            latestDate: get().payload.groups[0]?.dateLabel ?? null,
          };
        }
        lastHydratedAt = Date.now();
        set({
          payload,
          loading: false,
          syncing: false,
          error: null,
          lastSyncedAt: payload.fetchedAt,
        });
        const itemCount = payload.groups.reduce((n, g) => n + g.items.length, 0);
        const latestDate = payload.groups[0]?.dateLabel ?? null;
        const updateSummary = sync.added
          ? `新增 ${sync.added} 条，当前共 ${sync.total} 条`
          : `已是最新，当前共 ${sync.total} 条`;
        return {
          ok: true,
          message: `AI 快讯已更新：${updateSummary}${latestDate ? `（最新：${latestDate}）` : ''}`,
          itemCount,
          latestDate,
        };
      } catch (error) {
        const detail = error instanceof Error ? error.message.trim() : '';
        const message = detail ? `拉取失败：${detail}` : '拉取失败，请稍后重试';
        const current = get().payload;
        set({ syncing: false, error: message });
        return {
          ok: false,
          message: `${message}，已保留当前内容`,
          itemCount: current.groups.reduce((n, g) => n + g.items.length, 0),
          latestDate: current.groups[0]?.dateLabel ?? null,
        };
      }
    })();
    syncInflight = operation;
    void operation.finally(() => {
      if (syncInflight === operation) syncInflight = null;
    });
    return operation;
  },

  latest: () => flattenAiBotNews(get().payload)[0] ?? null,
}));
