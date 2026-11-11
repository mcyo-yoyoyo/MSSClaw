import { create } from 'zustand';
import { type StationAnnouncement } from '@/domain/stationAnnouncementSeeds';
import {
  normalizeAnnouncementColor,
  normalizeAnnouncementTag,
} from '@/domain/stationAnnouncementTags';
import { useDataFetchNotice } from '@/domain/dataFetchNotice';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  writeDocItem,
} from '@/api/platformDocsApi';

const DOC_KIND = 'station-announcements' as const;

interface AnnouncementDoc {
  items?: StationAnnouncement[];
  revision?: number;
}

function normalize(list: readonly StationAnnouncement[]): StationAnnouncement[] {
  return [...list]
    .filter((a) => a?.id && a?.title?.trim())
    .map((a) => ({
      id: a.id,
      title: a.title.trim(),
      body: (a.body ?? '').trim(),
      badge: normalizeAnnouncementTag(a.badge),
      badgeColor: normalizeAnnouncementColor(a.badgeColor) || undefined,
      publishedAt: a.publishedAt || new Date().toISOString(),
      pinned: a.pinned === true,
      listed: a.listed !== false,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
}

function docRevision(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

interface StationAnnouncementState {
  items: StationAnnouncement[];
  /** 服务端乐观锁版本；0 表示还没有落过库 */
  revision: number;
  /** hydrate 是否跑完：没跑完之前首页不渲染，避免闪一条库里没有的种子公告 */
  loaded: boolean;
  toast: string | null;
  hydrate: () => void;
  /** 首页接口已经带回公告时直接展示，避免再读一遍公告文档。 */
  show: (items: StationAnnouncement[], revision?: number) => void;
  /** 运营已填过的标签，供输入框做候选 */
  listTags: () => string[];
  upsert: (item: StationAnnouncement, isNew?: boolean) => void;
  remove: (id: string) => void;
  togglePinned: (id: string) => void;
  toggleListed: (id: string) => void;
  dismissToast: () => void;
}

export const useStationAnnouncementStore = create<StationAnnouncementState>((set, get) => ({
  items: [],
  revision: 0,
  loaded: false,
  toast: null,

  show: (items, revision) => {
    set({ items: normalize(items), revision: docRevision(revision), loaded: true });
  },

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        useDataFetchNotice.getState().markFailed();
        set({ items: [], revision: 0, loaded: true });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<AnnouncementDoc>(DOC_KIND);
        const list = Array.isArray(remote?.items) ? remote.items : [];
        // 连了后端就以库为准：空文档就是「还没有公告」。再灌种子会让首页出现
        // 库里不存在的公告，点开也没有对应的消息详情。
        set({ items: normalize(list), revision: docRevision(remote?.revision), loaded: true });
      } catch {
        useDataFetchNotice.getState().markFailed();
        set({ items: [], revision: 0, loaded: true });
      }
    })();
  },

  listTags: () => [...new Set(get().items.map((a) => a.badge).filter(Boolean))].sort(),

  upsert: (item, isNew = false) => {
    const nextItem = normalize([item])[0];
    if (!nextItem) {
      set({ toast: '请填写公告标题' });
      return;
    }
    const items = get().items;
    const exists = items.some((a) => a.id === nextItem.id);
    const next = exists
      ? items.map((a) => (a.id === nextItem.id ? nextItem : a))
      : [nextItem, ...items];
    commit(set, get, next, isNew || !exists ? '已新增站内公告' : '已保存站内公告');
  },

  remove: (id) => {
    commit(
      set,
      get,
      get().items.filter((a) => a.id !== id),
      '已删除公告，我的消息中的这条通知同时撤回',
    );
  },

  togglePinned: (id) => {
    const next = get().items.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a));
    const willPin = next.find((a) => a.id === id)?.pinned;
    commit(
      set,
      get,
      next,
      willPin ? '已置顶公告' : '已取消置顶',
    );
  },

  toggleListed: (id) => {
    const next = get().items.map((a) => (a.id === id ? { ...a, listed: !a.listed } : a));
    const willList = next.find((a) => a.id === id)?.listed;
    commit(
      set,
      get,
      next,
      willList ? '已重新上架' : '已下架，首页和我的消息不再展示',
    );
  },

  dismissToast: () => set({ toast: null }),
}));

/**
 * 本地先更新、再落库。服务端会规范化并把公告广播成站内消息，
 * 所以写入成功后以服务端返回的 payload 为准（含新的 revision）。
 */
function commit(
  set: (partial: Partial<StationAnnouncementState>) => void,
  get: () => StationAnnouncementState,
  nextItems: readonly StationAnnouncement[],
  toast: string,
) {
  const previous = get().items;
  const normalized = normalize(nextItems);
  set({ items: normalized, toast });
  if (!canUsePlatformDocsApi()) return;

  void (async () => {
    try {
      const created = normalized.filter((item) => !previous.some((row) => row.id === item.id));
      const removed = previous.filter((item) => !normalized.some((row) => row.id === item.id));
      const updated = normalized.filter((item) => {
        const before = previous.find((row) => row.id === item.id);
        return before && JSON.stringify(before) !== JSON.stringify(item);
      });
      for (const item of created) {
        await writeDocItem('/api/v1/docs/station-announcements/items', 'POST', item);
      }
      for (const item of updated) {
        await writeDocItem(`/api/v1/docs/station-announcements/items/${encodeURIComponent(item.id)}`, 'PUT', item);
      }
      for (const item of removed) {
        await writeDocItem(`/api/v1/docs/station-announcements/items/${encodeURIComponent(item.id)}`, 'DELETE');
      }
      const fresh = await fetchPlatformDoc<AnnouncementDoc>(DOC_KIND, { fresh: true });
      set({
        items: normalize(Array.isArray(fresh?.items) ? fresh.items : normalized),
        revision: docRevision(fresh?.revision),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.endsWith('_409')) {
        // 另一个运营先提交了：拉回最新内容，不保留本地草稿，避免把别人的公告覆盖掉。
        try {
          const fresh = await fetchPlatformDoc<AnnouncementDoc>(DOC_KIND, {
            fresh: true,
          });
          set({
            items: normalize(Array.isArray(fresh?.items) ? fresh.items : []),
            revision: docRevision(fresh?.revision),
            toast: '公告已被其他管理员更新，已拉取最新内容，请重新提交你的改动',
          });
        } catch {
          set({ toast: '公告已被其他管理员更新，请刷新页面后重试' });
        }
        return;
      }
      set({ items: previous, toast: '保存失败：公告改动未写入服务器，请检查登录状态后重试' });
    }
  })();
}
