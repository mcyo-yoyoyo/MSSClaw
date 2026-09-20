import { create } from 'zustand';
import {
  STATION_ANNOUNCEMENT_SEEDS,
  type StationAnnouncement,
} from '@/domain/stationAnnouncementSeeds';
import {
  normalizeAnnouncementColor,
  normalizeAnnouncementTag,
} from '@/domain/stationAnnouncementTags';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  peekPlatformDocMemory,
  savePlatformDoc,
} from '@/api/platformDocsApi';

export type StationAnnouncementRecord = StationAnnouncement & {
  /** 是否在首页公告条露出 */
  published: boolean;
};

const DOC_KIND = 'station-announcements' as const;

interface AnnouncementDoc {
  items?: StationAnnouncementRecord[];
  revision?: number;
}

function normalize(list: readonly StationAnnouncementRecord[]): StationAnnouncementRecord[] {
  return [...list]
    .filter((a) => a?.id && a?.title?.trim())
    .map((a) => ({
      id: a.id,
      title: a.title.trim(),
      body: (a.body ?? '').trim(),
      badge: normalizeAnnouncementTag(a.badge),
      badgeColor: normalizeAnnouncementColor(a.badgeColor) || undefined,
      publishedAt: a.publishedAt || new Date().toISOString(),
      published: a.published !== false,
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function seedItems(): StationAnnouncementRecord[] {
  if (!isDemoContentEnabled()) return [];
  return normalize(STATION_ANNOUNCEMENT_SEEDS.map((a) => ({ ...a, published: true })));
}

function docRevision(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

interface StationAnnouncementState {
  items: StationAnnouncementRecord[];
  /** 服务端乐观锁版本；0 表示还没有落过库 */
  revision: number;
  /** hydrate 是否跑完：没跑完之前首页不渲染，避免闪一条库里没有的种子公告 */
  loaded: boolean;
  toast: string | null;
  hydrate: () => void;
  listPublished: () => StationAnnouncement[];
  /** 运营已填过的标签，供输入框做候选 */
  listTags: () => string[];
  upsert: (item: StationAnnouncementRecord, isNew?: boolean) => void;
  remove: (id: string) => void;
  togglePublished: (id: string) => void;
  dismissToast: () => void;
}

export const useStationAnnouncementStore = create<StationAnnouncementState>((set, get) => ({
  items: seedItems(),
  revision: 0,
  loaded: false,
  toast: null,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        // 静态演示构建没有库，用种子撑起首页公告条
        set({ items: seedItems(), revision: 0, loaded: true });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<AnnouncementDoc>(currentWorkspaceId(), DOC_KIND);
        const list = Array.isArray(remote?.items) ? remote.items : [];
        // 连了后端就以库为准：空文档就是「还没有公告」。再灌种子会让首页出现
        // 库里不存在的公告，点开也没有对应的消息详情。运营要示例可以点「恢复默认示例」。
        set({ items: normalize(list), revision: docRevision(remote?.revision), loaded: true });
      } catch {
        set({ items: [], revision: 0, loaded: true });
      }
    })();
  },

  listPublished: () =>
    get()
      .items.filter((a) => a.published)
      .map(({ published: _p, ...rest }) => rest),

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

  togglePublished: (id) => {
    const next = get().items.map((a) => (a.id === id ? { ...a, published: !a.published } : a));
    const willPublish = next.find((a) => a.id === id)?.published;
    commit(
      set,
      get,
      next,
      willPublish ? '已上架到首页公告条' : '已从首页公告条下架，我的消息中保留该通知',
    );
  },

  dismissToast: () => set({ toast: null }),
}));

/**
 * 本地先更新、再落库。服务端会规范化并把已上架公告广播成站内消息，
 * 所以写入成功后以服务端返回的 payload 为准（含新的 revision）。
 */
function commit(
  set: (partial: Partial<StationAnnouncementState>) => void,
  get: () => StationAnnouncementState,
  nextItems: readonly StationAnnouncementRecord[],
  toast: string,
) {
  const normalized = normalize(nextItems);
  set({ items: normalized, toast });
  if (!canUsePlatformDocsApi()) return;

  const workspaceId = currentWorkspaceId();
  void (async () => {
    try {
      await savePlatformDoc(workspaceId, DOC_KIND, {
        items: normalized,
        revision: get().revision,
      });
      const saved = peekPlatformDocMemory<AnnouncementDoc>(workspaceId, DOC_KIND);
      set({
        items: Array.isArray(saved?.items) ? normalize(saved.items) : normalized,
        revision: docRevision(saved?.revision) || get().revision + 1,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.endsWith('_409')) {
        // 另一个运营先提交了：拉回最新内容，不保留本地草稿，避免把别人的公告覆盖掉。
        try {
          const fresh = await fetchPlatformDoc<AnnouncementDoc>(workspaceId, DOC_KIND, {
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
      set({ toast: '保存失败：公告改动未写入服务器，请检查登录状态后重试' });
    }
  })();
}
