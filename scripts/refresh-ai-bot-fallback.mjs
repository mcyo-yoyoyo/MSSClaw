import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(process.env.TEMP || '/tmp', 'ai-bot-daily.html');
const outTs = path.join(root, 'apps/web/src/domain/aiBotDailyNewsFallback.ts');
const KEEP_GROUPS = 8;

function stripTags(html) {
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

function hashId(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return `aibot-${(h >>> 0).toString(36)}`;
}

function parseHtml(html) {
  const sections = html.split(/class="news-list"/i).slice(1);
  const groups = [];
  for (const section of sections) {
    const dateMatch = section.match(/class="news-date"[^>]*>([^<]+)/i);
    const dateLabel = (dateMatch?.[1] ?? '').trim();
    if (!dateLabel) continue;
    const items = [];
    const itemRe =
      /class="news-content"[\s\S]*?<h2>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
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
  return groups;
}

const html = fs.readFileSync(htmlPath, 'utf8');
const groups = parseHtml(html);
const kept = groups.slice(0, KEEP_GROUPS);
const payload = {
  sourceUrl: 'https://ai-bot.cn/daily-ai-news',
  fetchedAt: '2026-08-10T00:00:00.000Z',
  fromFallback: true,
  groups: kept,
};

const body = `/**
 * 由 scripts/refresh-ai-bot-fallback.mjs 自 https://ai-bot.cn/daily-ai-news 生成。
 * 截止覆盖：${kept[0]?.dateLabel ?? '—'} → ${kept[kept.length - 1]?.dateLabel ?? '—'}
 * 请勿手改；需要更新时先下载源站 HTML 再运行本脚本。
 */
export const AI_BOT_DAILY_NEWS_FALLBACK = ${JSON.stringify(payload, null, 2)};
`;

fs.writeFileSync(outTs, `${body}\n`, 'utf8');
console.log(groups.map((g) => `${g.dateLabel}:${g.items.length}`).join('\n'));
console.log(
  `wrote ${kept.length} groups / ${kept.reduce((n, g) => n + g.items.length, 0)} items -> ${outTs}`,
);
