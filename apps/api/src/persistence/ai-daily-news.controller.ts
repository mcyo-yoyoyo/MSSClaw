import { Controller, Get, Header } from '@nestjs/common';

const SOURCE = 'https://ai-bot.cn/daily-ai-news';

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8221;/g, '”')
    .replace(/&#8220;/g, '“')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return `aibot-${(h >>> 0).toString(36)}`;
}

function parseHtml(html: string) {
  const sections = html.split(/class="news-list"/i).slice(1);
  const groups: Array<{
    dateLabel: string;
    items: Array<{ id: string; dateLabel: string; title: string; summary: string; url: string }>;
  }> = [];
  for (const section of sections) {
    const dateMatch = section.match(/class="news-date"[^>]*>([^<]+)/i);
    const dateLabel = (dateMatch?.[1] ?? '').trim();
    if (!dateLabel) continue;
    const items: Array<{
      id: string;
      dateLabel: string;
      title: string;
      summary: string;
      url: string;
    }> = [];
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
    sourceUrl: SOURCE,
    fetchedAt: new Date().toISOString(),
    groups,
  };
}

/** 公司局域网 Nest 侧代理 ai-bot.cn，与 Vercel Function 同结构 */
@Controller('ai-daily-news')
export class AiDailyNewsController {
  @Get()
  @Header('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  async fetchDaily() {
    try {
      const upstream = await fetch(SOURCE, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; MSSClawBot/1.0; +https://github.com/mssclaw/ai-brief)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!upstream.ok) {
        return { error: `upstream ${upstream.status}`, groups: [], sourceUrl: SOURCE };
      }
      const html = await upstream.text();
      const payload = parseHtml(html);
      if (!payload.groups.length) {
        return { error: 'parse empty', groups: [], sourceUrl: SOURCE };
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
