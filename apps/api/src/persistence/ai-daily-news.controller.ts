import { Controller, Get, Header } from '@nestjs/common';

const SOURCE = 'https://aihot.virxact.com';
const ITEMS_API = `${SOURCE}/api/v1/items?mode=selected&window=7d&limit=100`;

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

function mapPayload(items: AihotItem[]) {
  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const item of items) {
    const title = item.title?.trim();
    if (!item.id || !title) continue;
    const label = dateLabel(item.publishedAt ?? item.discoveredAt);
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
    grouped.set(label, [...(grouped.get(label) ?? []), mapped]);
  }
  return {
    sourceUrl: SOURCE,
    sourceName: 'AIHOT',
    fetchedAt: new Date().toISOString(),
    groups: [...grouped].map(([label, groupedItems]) => ({
      dateLabel: label,
      items: groupedItems,
    })),
  };
}

/** 公司局域网 Nest 侧代理 AIHOT，并转换为前端既有快讯结构。 */
@Controller('ai-daily-news')
export class AiDailyNewsController {
  @Get()
  @Header('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  async fetchDaily() {
    try {
      const upstream = await fetch(ITEMS_API, {
        headers: {
          'User-Agent': 'mssclaw-ai-brief/1.0',
          Accept: 'application/json',
        },
      });
      if (!upstream.ok) {
        return { error: `upstream ${upstream.status}`, groups: [], sourceUrl: SOURCE };
      }
      const data = (await upstream.json()) as { items?: AihotItem[] };
      const payload = mapPayload(Array.isArray(data.items) ? data.items : []);
      if (!payload.groups.length) {
        return { error: 'upstream empty', groups: [], sourceUrl: SOURCE };
      }
      return payload;
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'fetch failed',
        groups: [],
        sourceUrl: SOURCE,
      };
    }
  }
}
