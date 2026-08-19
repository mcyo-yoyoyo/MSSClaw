/**
 * AI 快讯：聚合自 AIHOT REST API v1。
 * 浏览器侧走同源 `/api/ai-daily-news`（Vite 中间件 / Vercel Function）规避 CORS。
 */

import { AI_BOT_DAILY_NEWS_FALLBACK as FALLBACK_SEED } from '@/domain/aiBotDailyNewsFallback';

export const AI_BOT_DAILY_NEWS_URL = 'https://aihot.virxact.com';

export type AiBotNewsItem = {
  id: string;
  dateLabel: string;
  publishedAt?: string;
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
  /** Asia/Shanghai 自然日，供日期控件筛选；dateLabel 仅用于展示。 */
  dateKey?: string;
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

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

function dateKeyFromParts(year: number, month: number, day: number): string | undefined {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeDateKey(value?: string): string | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const normalized = dateKeyFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
  return normalized === value ? normalized : undefined;
}

function shanghaiDateKey(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : undefined;
}

function inferDateKeyFromLabel(dateLabel: string, referenceKey?: string): string | undefined {
  const labelMatch = dateLabel.match(/(\d{1,2})(?:月|\/)(\d{1,2})/);
  const referenceMatch = referenceKey?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!labelMatch || !referenceMatch) return undefined;

  const month = Number(labelMatch[1]);
  const day = Number(labelMatch[2]);
  const referenceYear = Number(referenceMatch[1]);
  const referenceTime = Date.UTC(
    referenceYear,
    Number(referenceMatch[2]) - 1,
    Number(referenceMatch[3]),
  );

  return [referenceYear - 1, referenceYear, referenceYear + 1]
    .map((year) => dateKeyFromParts(year, month, day))
    .filter((key): key is string => Boolean(key))
    .sort((left, right) => {
      const leftTime = Date.UTC(Number(left.slice(0, 4)), month - 1, day);
      const rightTime = Date.UTC(Number(right.slice(0, 4)), month - 1, day);
      return Math.abs(leftTime - referenceTime) - Math.abs(rightTime - referenceTime);
    })[0];
}

function withStableDateKeys(payload: AiBotDailyNewsPayload): AiBotDailyNewsPayload {
  const referenceKey = shanghaiDateKey(payload.fetchedAt);
  return {
    ...payload,
    groups: payload.groups.map((group) => {
      const dateKey =
        normalizeDateKey(group.dateKey) ||
        shanghaiDateKey(group.items[0]?.publishedAt) ||
        inferDateKeyFromLabel(group.dateLabel, referenceKey);
      return dateKey ? { ...group, dateKey } : group;
    }),
  };
}

/** 离线兜底（接口不可用时仍可演示）；由 scripts/refresh-ai-bot-fallback.mjs 刷新 */
export const AI_BOT_DAILY_NEWS_FALLBACK: AiBotDailyNewsPayload =
  withStableDateKeys(FALLBACK_SEED as AiBotDailyNewsPayload);

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

  return withStableDateKeys({
    sourceUrl: AI_BOT_DAILY_NEWS_URL,
    fetchedAt: new Date().toISOString(),
    groups,
  });
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
      return withStableDateKeys({ ...data, fromFallback: false });
    } catch {
      /* try next */
    }
  }
  return { ...AI_BOT_DAILY_NEWS_FALLBACK, fetchedAt: new Date().toISOString(), fromFallback: true };
}
