/**
 * AI 快讯：聚合自 https://ai-bot.cn/daily-ai-news
 * 浏览器侧走同源 `/api/ai-daily-news`（Vite 中间件 / Vercel Function）规避 CORS。
 */

export const AI_BOT_DAILY_NEWS_URL = 'https://ai-bot.cn/daily-ai-news';

export type AiBotNewsItem = {
  id: string;
  dateLabel: string;
  title: string;
  summary: string;
  url: string;
};

export type AiBotNewsGroup = {
  dateLabel: string;
  items: AiBotNewsItem[];
};

export type AiBotDailyNewsPayload = {
  sourceUrl: string;
  fetchedAt: string;
  groups: AiBotNewsGroup[];
  /** true 表示接口失败后使用本地兜底 */
  fromFallback?: boolean;
};

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

/** 离线兜底（接口不可用时仍可演示） */
export const AI_BOT_DAILY_NEWS_FALLBACK: AiBotDailyNewsPayload = {
  sourceUrl: AI_BOT_DAILY_NEWS_URL,
  fetchedAt: '2026-08-06T00:00:00.000Z',
  fromFallback: true,
  groups: [
    {
      dateLabel: '8月6·周四',
      items: [
        {
          id: 'aibot-fallback-1',
          dateLabel: '8月6·周四',
          title: '兔展智能推出一站式 AI 设计生产工具 RabbitVis',
          summary:
            '兔展智能推出图层级一站式AI设计工具RabbitVis，基于自研UniWorld-Design视觉大模型，将AI生成与图层级编辑深度融合。',
          url: 'https://mp.weixin.qq.com/s/VeNtvie4gpmiBtKGofqbrQ',
        },
        {
          id: 'aibot-fallback-2',
          dateLabel: '8月6·周四',
          title: 'Meta 推出终端编程 AI 智能体 Muse Code',
          summary:
            'Meta 推出首个编程 AI 智能体工具 Muse Code 测试版，可处理大型代码库中的完整软件工程任务。',
          url: 'https://www.ithome.com/0/986/268.htm',
        },
        {
          id: 'aibot-fallback-3',
          dateLabel: '8月6·周四',
          title: '阿里云上线One Key MCP，一键调用多家MCP服务',
          summary:
            '开发者可通过统一的阿里云百炼 API Key 一键调用生态伙伴 MCP 服务，兼容主流 Coding Agent。',
          url: 'https://mp.weixin.qq.com/s/6T8rXdWf5l-5_Y5iA60DoQ',
        },
      ],
    },
    {
      dateLabel: '8月5·周三',
      items: [
        {
          id: 'aibot-fallback-4',
          dateLabel: '8月5·周三',
          title: '腾讯推出 AI 原生数据分析平台 Omega',
          summary:
            '腾讯推出 AI 原生数据分析产品 Omega，用户通过自然语言可生成完整数据仪表盘。',
          url: 'https://ai-bot.cn/omega-marmos/',
        },
        {
          id: 'aibot-fallback-5',
          dateLabel: '8月5·周三',
          title: '阿里推出原生 Computer Use Agent「Qwen-CUA」',
          summary:
            '基于屏幕截图感知界面状态，直接输出键盘鼠标事件操控浏览器与桌面软件。',
          url: 'https://ai-bot.cn/qwen-cua/',
        },
      ],
    },
  ],
};

export function flattenAiBotNews(payload: AiBotDailyNewsPayload): AiBotNewsItem[] {
  return payload.groups.flatMap((g) => g.items);
}

export function apiAiDailyNewsPath(): string {
  const base = import.meta.env.BASE_URL || '/';
  return new URL('api/ai-daily-news', base.endsWith('/') ? base : `${base}/`).pathname;
}

export async function fetchAiBotDailyNews(signal?: AbortSignal): Promise<AiBotDailyNewsPayload> {
  try {
    const res = await fetch(apiAiDailyNewsPath(), {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as AiBotDailyNewsPayload;
    if (!data?.groups?.length) throw new Error('empty feed');
    return { ...data, fromFallback: false };
  } catch {
    return { ...AI_BOT_DAILY_NEWS_FALLBACK, fetchedAt: new Date().toISOString(), fromFallback: true };
  }
}
