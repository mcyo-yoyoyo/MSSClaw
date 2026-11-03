import { create } from 'zustand';
import { type AiNewsCadence, type AiNewsItem } from '@/domain/aiNewsSeeds';
import { useDataFetchNotice } from '@/domain/dataFetchNotice';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  writeDocItem,
} from '@/api/platformDocsApi';

export type AiNewsRecord = AiNewsItem & {
  published: boolean;
};

function newsDayKey(iso: string): string {
  return (iso || '').slice(0, 10);
}

function normalize(list: AiNewsRecord[]): AiNewsRecord[] {
  return [...list]
    .filter((a) => a?.id && a?.title?.trim())
    .map((a) => ({
      id: a.id,
      title: a.title.trim(),
      summary: a.summary?.trim() || undefined,
      body: (a.body ?? '').trim(),
      cadence: (a.cadence === 'weekly' ? 'weekly' : 'daily') as AiNewsCadence,
      publishedAt: a.publishedAt || new Date().toISOString(),
      source: a.source?.trim() || undefined,
      published: a.published !== false,
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function dedupeByCadence(list: AiNewsRecord[]): AiNewsRecord[] {
  const seenDay = new Set<string>();
  const seenWeek = new Set<string>();
  const out: AiNewsRecord[] = [];
  for (const item of list) {
    if (item.cadence === 'weekly') {
      const d = new Date(item.publishedAt);
      const week = `${d.getUTCFullYear()}-W${Math.ceil(
        ((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7,
      )}`;
      if (seenWeek.has(week)) continue;
      seenWeek.add(week);
      out.push(item);
      continue;
    }
    const day = newsDayKey(item.publishedAt);
    if (seenDay.has(day)) continue;
    seenDay.add(day);
    out.push(item);
  }
  return out;
}

function persist(previous: AiNewsRecord[], items: AiNewsRecord[]) {
  if (!canUsePlatformDocsApi()) return;
  const created = items.filter((item) => !previous.some((row) => row.id === item.id));
  const removed = previous.filter((item) => !items.some((row) => row.id === item.id));
  const updated = items.filter((item) => {
    const before = previous.find((row) => row.id === item.id);
    return before && JSON.stringify(before) !== JSON.stringify(item);
  });
  void (async () => {
    try {
      for (const item of created) await writeDocItem('/api/v1/docs/ai-news/items', 'POST', item);
      for (const item of updated) {
        await writeDocItem(`/api/v1/docs/ai-news/items/${encodeURIComponent(item.id)}`, 'PUT', item);
      }
      for (const item of removed) {
        await writeDocItem(`/api/v1/docs/ai-news/items/${encodeURIComponent(item.id)}`, 'DELETE');
      }
    } catch {
      useDataFetchNotice.getState().markFailed();
    }
  })();
}

interface AiNewsState {
  items: AiNewsRecord[];
  toast: string | null;
  hydrate: () => void;
  listPublished: () => AiNewsItem[];
  upsert: (item: AiNewsRecord, isNew?: boolean) => void;
  remove: (id: string) => void;
  togglePublished: (id: string) => void;
  resetToSeeds: () => void;
  dismissToast: () => void;
}

export const useAiNewsStore = create<AiNewsState>((set, get) => ({
  items: [],
  toast: null,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        useDataFetchNotice.getState().markFailed();
        set({ items: [] });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ items?: AiNewsRecord[] }>('ai-news',
        );
        const list = Array.isArray(remote?.items) ? remote.items : [];
        set({
          items: dedupeByCadence(normalize(list)),
        });
      } catch {
        useDataFetchNotice.getState().markFailed();
        set({ items: [] });
      }
    })();
  },

  listPublished: () => get().items.filter((i) => i.published),

  upsert: (item, isNew = false) => {
    const next = dedupeByCadence(
      normalize(
        isNew
          ? [item, ...get().items]
          : get().items.map((x) => (x.id === item.id ? item : x)),
      ),
    );
    persist(get().items, next);
    set({ items: next, toast: isNew ? '已新增 AI 新闻' : '已保存 AI 新闻' });
  },

  remove: (id) => {
    const previous = get().items;
    const next = previous.filter((x) => x.id !== id);
    persist(previous, next);
    set({ items: next, toast: '已删除' });
  },

  togglePublished: (id) => {
    const previous = get().items;
    const next = previous.map((x) =>
      x.id === id ? { ...x, published: !x.published } : x,
    );
    persist(previous, next);
    set({ items: next });
  },

  resetToSeeds: () => {
    set({ toast: null });
  },

  dismissToast: () => set({ toast: null }),
}));
