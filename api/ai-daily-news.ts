/** Vercel Serverless：代理 AIHOT，并转换为前端既有快讯结构。 */

type AihotItem = {
  id?: string;
  title?: string;
  summary?: string | null;
  publishedAt?: string;
  discoveredAt?: string;
  category?: string;
  score?: number;
  reason?: string | null;
  source?: { name?: string };
  links?: { original?: string; aihot?: string };
};

const SOURCE = 'https://aihot.virxact.com';
const ITEMS_API = `${SOURCE}/api/v1/items?mode=selected&window=7d&limit=100`;

function dateLabel(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '日期未知';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
    .format(date)
    .replace(/日周/, '·周');
}

function dateKey(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function mapPayload(items: AihotItem[]) {
  const grouped = new Map<
    string,
    { dateLabel: string; items: Array<Record<string, unknown>> }
  >();
  for (const item of items) {
    const title = item.title?.trim();
    if (!item.id || !title) continue;
    const publishedAt = item.publishedAt ?? item.discoveredAt ?? new Date().toISOString();
    const key = dateKey(publishedAt);
    const label = dateLabel(publishedAt);
    const mapped = {
      id: `aihot-${item.id}`,
      dateLabel: label,
      title,
      summary: item.summary?.trim() ?? '',
      url: item.links?.original || item.links?.aihot || SOURCE,
      source: item.source?.name?.trim() || undefined,
      category: item.category || undefined,
      reason: item.reason?.trim() || undefined,
      score: typeof item.score === 'number' ? item.score : undefined,
      aihotUrl: item.links?.aihot || undefined,
    };
    const group = grouped.get(key);
    if (group) group.items.push(mapped);
    else grouped.set(key, { dateLabel: label, items: [mapped] });
  }
  return {
    sourceUrl: SOURCE,
    sourceName: 'AIHOT',
    fetchedAt: new Date().toISOString(),
    groups: [...grouped].map(([key, group]) => ({
      dateKey: key,
      dateLabel: group.dateLabel,
      items: group.items,
    })),
  };
}

export default async function handler(
  _req: { method?: string },
  res: {
    setHeader: (k: string, v: string) => void;
    status: (n: number) => { json: (b: unknown) => void; end: (b?: string) => void };
  },
) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const upstream = await fetch(ITEMS_API, {
      headers: { 'User-Agent': 'mssclaw-ai-brief/1.0', Accept: 'application/json' },
    });
    if (!upstream.ok) {
      res.status(502).json({ error: `upstream ${upstream.status}`, groups: [] });
      return;
    }
    const data = (await upstream.json()) as { items?: AihotItem[] };
    const payload = mapPayload(Array.isArray(data.items) ? data.items : []);
    if (!payload.groups.length) {
      res.status(502).json({ error: 'upstream empty', groups: [] });
      return;
    }
    res.status(200).json(payload);
  } catch (e) {
    res.status(502).json({
      error: e instanceof Error ? e.message : 'fetch failed',
      groups: [],
    });
  }
}
