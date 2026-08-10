import { create } from 'zustand';
import {
  STATION_ANNOUNCEMENT_SEEDS,
  type StationAnnouncement,
  type StationAnnouncementBadge,
} from '@/domain/stationAnnouncementSeeds';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

export type StationAnnouncementRecord = StationAnnouncement & {
  /** 是否在首页跑马灯露出 */
  published: boolean;
};

const VALID_BADGES: StationAnnouncementBadge[] = ['AI上线', 'AI培训'];

function migrateBadge(raw: string | undefined): StationAnnouncementBadge | null {
  if (!raw) return null;
  if ((VALID_BADGES as string[]).includes(raw)) return raw as StationAnnouncementBadge;
  if (raw === '上线') return 'AI上线';
  if (raw === '培训') return 'AI培训';
  return null;
}

function normalize(list: StationAnnouncementRecord[]): StationAnnouncementRecord[] {
  return [...list]
    .filter((a) => a?.id && a?.title?.trim())
    .map((a) => {
      const badge = migrateBadge(a.badge as string);
      if (!badge) return null;
      return {
        id: a.id,
        title: a.title.trim(),
        body: (a.body ?? '').trim(),
        badge,
        publishedAt: a.publishedAt || new Date().toISOString(),
        published: a.published !== false,
      };
    })
    .filter((a): a is StationAnnouncementRecord => Boolean(a))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function seedItems(): StationAnnouncementRecord[] {
  if (!isDemoContentEnabled()) return [];
  return normalize(STATION_ANNOUNCEMENT_SEEDS.map((a) => ({ ...a, published: true })));
}

function persist(items: StationAnnouncementRecord[]) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'station-announcements', { items });
}

interface StationAnnouncementState {
  items: StationAnnouncementRecord[];
  toast: string | null;
  hydrate: () => void;
  listPublished: () => StationAnnouncement[];
  upsert: (item: StationAnnouncementRecord, isNew?: boolean) => void;
  remove: (id: string) => void;
  togglePublished: (id: string) => void;
  resetToSeeds: () => void;
  dismissToast: () => void;
}

export const useStationAnnouncementStore = create<StationAnnouncementState>((set, get) => ({
  items: seedItems(),
  toast: null,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ items: seedItems() });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ items?: StationAnnouncementRecord[] }>(
          currentWorkspaceId(),
          'station-announcements',
        );
        const list = Array.isArray(remote?.items) ? remote.items : [];
        set({ items: list.length ? normalize(list) : seedItems() });
      } catch {
        set({ items: seedItems() });
      }
    })();
  },

  listPublished: () =>
    get()
      .items.filter((a) => a.published)
      .map(({ published: _p, ...rest }) => rest),

  upsert: (item, isNew = false) => {
    const nextItem = normalize([item])[0];
    if (!nextItem) {
      set({ toast: '请填写公告标题，且类型须为 AI上线 / AI培训' });
      return;
    }
    const items = get().items;
    const exists = items.some((a) => a.id === nextItem.id);
    const next = exists
      ? items.map((a) => (a.id === nextItem.id ? nextItem : a))
      : [nextItem, ...items];
    const normalized = normalize(next);
    persist(normalized);
    set({
      items: normalized,
      toast: isNew || !exists ? '已新增站内公告' : '已保存站内公告',
    });
  },

  remove: (id) => {
    const normalized = normalize(get().items.filter((a) => a.id !== id));
    persist(normalized);
    set({ items: normalized, toast: '已删除公告' });
  },

  togglePublished: (id) => {
    const normalized = normalize(
      get().items.map((a) => (a.id === id ? { ...a, published: !a.published } : a)),
    );
    persist(normalized);
    const hit = normalized.find((a) => a.id === id);
    set({
      items: normalized,
      toast: hit?.published ? '已上架到首页跑马灯' : '已从首页跑马灯下架',
    });
  },

  resetToSeeds: () => {
    const normalized = seedItems();
    persist(normalized);
    set({ items: normalized, toast: '已恢复默认公告示例' });
  },

  dismissToast: () => set({ toast: null }),
}));
