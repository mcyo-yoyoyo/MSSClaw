import { create } from 'zustand';
import { AI_NEWS_SEEDS, type AiNewsCadence, type AiNewsItem } from '@/domain/aiNewsSeeds';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
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

function seedItems(): AiNewsRecord[] {
  if (!isDemoContentEnabled()) return [];
  return dedupeByCadence(normalize(AI_NEWS_SEEDS.map((a) => ({ ...a, published: true }))));
}

function persist(items: AiNewsRecord[]) {
  const ws = currentWorkspaceId();
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(ws, 'ai-news', { items });
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
  items: seedItems(),
  toast: null,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ items: seedItems() });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ items?: AiNewsRecord[] }>(
          currentWorkspaceId(),
          'ai-news',
        );
        const list = Array.isArray(remote?.items) ? remote.items : [];
        set({
          items: list.length ? dedupeByCadence(normalize(list)) : seedItems(),
        });
      } catch {
        set({ items: seedItems() });
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
    persist(next);
    set({ items: next, toast: isNew ? '已新增 AI 新闻' : '已保存 AI 新闻' });
  },

  remove: (id) => {
    const next = get().items.filter((x) => x.id !== id);
    persist(next);
    set({ items: next, toast: '已删除' });
  },

  togglePublished: (id) => {
    const next = get().items.map((x) =>
      x.id === id ? { ...x, published: !x.published } : x,
    );
    persist(next);
    set({ items: next });
  },

  resetToSeeds: () => {
    const next = seedItems();
    persist(next);
    set({ items: next, toast: '已恢复种子稿' });
  },

  dismissToast: () => set({ toast: null }),
}));
