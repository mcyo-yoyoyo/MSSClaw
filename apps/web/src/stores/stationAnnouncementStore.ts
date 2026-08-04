import { create } from 'zustand';
import {
  STATION_ANNOUNCEMENT_SEEDS,
  type StationAnnouncement,
  type StationAnnouncementBadge,
} from '@/domain/stationAnnouncementSeeds';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';

const LS_KEY = 'mssclaw_station_announce_v1';

export type StationAnnouncementRecord = StationAnnouncement & {
  /** 是否在首页跑马灯露出 */
  published: boolean;
};

function normalize(list: StationAnnouncementRecord[]): StationAnnouncementRecord[] {
  return [...list]
    .filter((a) => a?.id && a?.title?.trim())
    .map((a) => ({
      id: a.id,
      title: a.title.trim(),
      body: (a.body ?? '').trim(),
      badge: (['上线', '培训', '通知'] as StationAnnouncementBadge[]).includes(a.badge)
        ? a.badge
        : '通知',
      publishedAt: a.publishedAt || new Date().toISOString(),
      published: a.published !== false,
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function load(): StationAnnouncementRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StationAnnouncementRecord[];
      if (Array.isArray(parsed)) return normalize(parsed);
    }
  } catch {
    /* ignore */
  }
  if (isDemoContentEnabled()) {
    return normalize(
      STATION_ANNOUNCEMENT_SEEDS.map((a) => ({ ...a, published: true })),
    );
  }
  return [];
}

function persist(items: StationAnnouncementRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
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

const initial = load();

export const useStationAnnouncementStore = create<StationAnnouncementState>((set, get) => ({
  items: initial,
  toast: null,

  hydrate: () => {
    set({ items: load() });
  },

  listPublished: () =>
    get()
      .items.filter((a) => a.published)
      .map(({ published: _p, ...rest }) => rest),

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
    const normalized = normalize(
      STATION_ANNOUNCEMENT_SEEDS.map((a) => ({ ...a, published: true })),
    );
    persist(normalized);
    set({ items: normalized, toast: '已恢复默认公告示例' });
  },

  dismissToast: () => set({ toast: null }),
}));
