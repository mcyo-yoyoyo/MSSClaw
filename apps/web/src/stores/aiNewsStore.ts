import { create } from 'zustand';
import { AI_NEWS_SEEDS, type AiNewsCadence, type AiNewsItem } from '@/domain/aiNewsSeeds';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';

const LS_KEY = 'mssclaw_ai_news_v1';

export type AiNewsRecord = AiNewsItem & {
  /** 是否在首页跑马灯露出 */
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

/** 日更：同一自然日只保留一条；周报按周保留一条（列表已按新→旧） */
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

function load(): AiNewsRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AiNewsRecord[];
      if (Array.isArray(parsed)) return dedupeByCadence(normalize(parsed));
    }
  } catch {
    /* ignore */
  }
  if (isDemoContentEnabled()) {
    return dedupeByCadence(
      normalize(AI_NEWS_SEEDS.map((a) => ({ ...a, published: true }))),
    );
  }
  return [];
}

function persist(items: AiNewsRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
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

const initial = load();

export const useAiNewsStore = create<AiNewsState>((set, get) => ({
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
      set({ toast: '请填写新闻标题' });
      return;
    }
    const items = get().items;
    const day = newsDayKey(nextItem.publishedAt);
    const sameDay = items.find(
      (a) =>
        a.cadence === 'daily' &&
        nextItem.cadence === 'daily' &&
        newsDayKey(a.publishedAt) === day,
    );
    const merged: AiNewsRecord =
      sameDay && sameDay.id !== nextItem.id
        ? { ...nextItem, id: sameDay.id }
        : nextItem;
    const next = [
      merged,
      ...items.filter((a) => {
        if (a.id === merged.id) return false;
        if (merged.cadence === 'daily' && a.cadence === 'daily') {
          return newsDayKey(a.publishedAt) !== day;
        }
        return true;
      }),
    ];
    const normalized = dedupeByCadence(normalize(next));
    persist(normalized);
    const covered = Boolean(sameDay && sameDay.id !== nextItem.id);
    set({
      items: normalized,
      toast: covered
        ? '已更新当日 AI 新闻（每天仅一条）'
        : isNew
          ? '已新增 AI 新闻'
          : '已保存 AI 新闻',
    });
  },

  remove: (id) => {
    const normalized = dedupeByCadence(
      normalize(get().items.filter((a) => a.id !== id)),
    );
    persist(normalized);
    set({ items: normalized, toast: '已删除新闻' });
  },

  togglePublished: (id) => {
    const normalized = dedupeByCadence(
      normalize(
        get().items.map((a) => (a.id === id ? { ...a, published: !a.published } : a)),
      ),
    );
    persist(normalized);
    const hit = normalized.find((a) => a.id === id);
    set({
      items: normalized,
      toast: hit?.published ? '已上架到首页与总览' : '已下架',
    });
  },

  resetToSeeds: () => {
    const normalized = dedupeByCadence(
      normalize(AI_NEWS_SEEDS.map((a) => ({ ...a, published: true }))),
    );
    persist(normalized);
    set({ items: normalized, toast: '已恢复默认 AI 新闻示例' });
  },

  dismissToast: () => set({ toast: null }),
}));
