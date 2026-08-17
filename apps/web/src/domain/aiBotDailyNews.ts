/**
 * AI 快讯：聚合自 AIHOT REST API v1。
 * 浏览器侧走同源 `/api/ai-daily-news`（Vite 中间件 / Vercel Function）规避 CORS。
 */

import { AI_BOT_DAILY_NEWS_FALLBACK as FALLBACK_SEED } from '@/domain/aiBotDailyNewsFallback';

export const AI_BOT_DAILY_NEWS_URL = 'https://aihot.virxact.com';

export type AiBotNewsItem = {
  id: string;
  dateLabel: string;
  title: string;
  summary: string;
  url: string;
  source?: string;
  category?: string;
  reason?: string;
  score?: number;
  aihotUrl?: string;
};

export type AiBotNewsGroup = {
  dateLabel: string;
  items: AiBotNewsItem[];
};

export type AiBotDailyNewsPayload = {
  sourceUrl: string;
  fetchedAt: string;
  sourceName?: string;
  groups: AiBotNewsGroup[];
  /** true 表示接口失败后使用本地兜底 / 运营缓存 */
  fromFallback?: boolean;
};

/** 离线兜底（接口不可用时仍可演示）；由 scripts/refresh-ai-bot-fallback.mjs 刷新 */
export const AI_BOT_DAILY_NEWS_FALLBACK: AiBotDailyNewsPayload =
  FALLBACK_SEED as AiBotDailyNewsPayload;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8221;/g, '”')
    .replace(/&#8220;/g, '“')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return `aibot-${(h >>> 0).toString(36)}`;
}

/** 解析 ai-bot.cn 日报页 HTML */
export function parseAiBotDailyNewsHtml(html: string): AiBotDailyNewsPayload {
  const sections = html.split(/class="news-list"/i).slice(1);
  const groups: AiBotNewsGroup[] = [];

  for (const section of sections) {
    const dateMatch = section.match(/class="news-date"[^>]*>([^<]+)/i);
    const dateLabel = (dateMatch?.[1] ?? '').trim();
    if (!dateLabel) continue;

    const items: AiBotNewsItem[] = [];
    const itemRe =
      /class="news-content"[\s\S]*?<h2>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(section))) {
      const url = m[1].trim();
      const title = stripTags(m[2]);
      const summary = stripTags(m[3]);
      if (!title) continue;
      items.push({
        id: hashId(`${dateLabel}|${url}|${title}`),
        dateLabel,
        title,
        summary,
        url,
      });
    }
    if (items.length) groups.push({ dateLabel, items });
  }

  return {
    sourceUrl: AI_BOT_DAILY_NEWS_URL,
    fetchedAt: new Date().toISOString(),
    groups,
  };
}

export function flattenAiBotNews(payload: AiBotDailyNewsPayload): AiBotNewsItem[] {
  return payload.groups.flatMap((g) => g.items);
}

export function apiAiDailyNewsPath(): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}api/v1/ai-daily-news`;
}

function legacyAiDailyNewsPath(): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}api/ai-daily-news`;
}

/** @deprecated 保留导出以免旧引用报错；不再作为真相源 */
export function readCachedAiBotDailyNews(): AiBotDailyNewsPayload | null {
  return null;
}

/** @deprecated */
export function writeCachedAiBotDailyNews(_payload: AiBotDailyNewsPayload): void {
  /* no-op：快讯不再写入浏览器缓存 */
}

/** 优先 Nest /api/v1；兼容 Vercel /api；失败回退内置兜底 */
export async function fetchAiBotDailyNews(signal?: AbortSignal): Promise<AiBotDailyNewsPayload> {
  for (const path of [apiAiDailyNewsPath(), legacyAiDailyNewsPath()]) {
    try {
      const res = await fetch(path, {
        signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const data = (await res.json()) as AiBotDailyNewsPayload;
      if (!data?.groups?.length) continue;
      return { ...data, fromFallback: false };
    } catch {
      /* try next */
    }
  }
  return { ...AI_BOT_DAILY_NEWS_FALLBACK, fetchedAt: new Date().toISOString(), fromFallback: true };
}
