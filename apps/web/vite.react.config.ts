import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/** GitHub Pages 项目页需要带仓库名前缀；本地开发保持 `/` */
const base = process.env.GITHUB_PAGES === 'true' ? '/MSSClaw/' : '/';

function stripAiBotTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8221;/g, '”')
    .replace(/&#8220;/g, '“')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashAiBotId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return `aibot-${(h >>> 0).toString(36)}`;
}

function parseAiBotDailyNewsHtml(html: string) {
  const sections = html.split(/class="news-list"/i).slice(1);
  const groups: {
    dateLabel: string;
    items: { id: string; dateLabel: string; title: string; summary: string; url: string }[];
  }[] = [];
  for (const section of sections) {
    const dateMatch = section.match(/class="news-date"[^>]*>([^<]+)/i);
    const dateLabel = (dateMatch?.[1] ?? '').trim();
    if (!dateLabel) continue;
    const items: { id: string; dateLabel: string; title: string; summary: string; url: string }[] =
      [];
    const itemRe =
      /class="news-content"[\s\S]*?<h2>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(section))) {
      const url = m[1].trim();
      const title = stripAiBotTags(m[2]);
      const summary = stripAiBotTags(m[3]);
      if (!title) continue;
      items.push({
        id: hashAiBotId(`${dateLabel}|${url}|${title}`),
        dateLabel,
        title,
        summary,
        url,
      });
    }
    if (items.length) groups.push({ dateLabel, items });
  }
  return {
    sourceUrl: 'https://ai-bot.cn/daily-ai-news',
    fetchedAt: new Date().toISOString(),
    groups,
  };
}

/** React 工程化前端（npm run dev 默认入口） */
export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'ai-daily-news-dev-api',
      configureServer(server) {
        server.middlewares.use('/api/ai-daily-news', async (_req, res) => {
          try {
            const upstream = await fetch('https://ai-bot.cn/daily-ai-news', {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MSSClawDev/1.0)',
                Accept: 'text/html',
              },
            });
            if (!upstream.ok) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: `upstream ${upstream.status}`, groups: [] }));
              return;
            }
            const html = await upstream.text();
            const payload = parseAiBotDailyNewsHtml(html);
            res.statusCode = payload.groups.length ? 200 : 502;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(payload));
          } catch (e) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                error: e instanceof Error ? e.message : 'fetch failed',
                groups: [],
              }),
            );
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/features/_legacy/agent/')) return 'platform-agent';
            if (id.includes('/features/_legacy/workflow/')) return 'platform-workflow';
            if (id.includes('/features/_legacy/tool/')) return 'platform-tool';
            if (id.includes('/features/_legacy/memory/')) return 'platform-memory';
            if (id.includes('/features/_legacy/prompt/')) return 'platform-prompt';
            if (id.includes('/features/_legacy/settings/')) return 'platform-admin';
            if (id.includes('/features/task/')) return 'page-task';
            if (id.includes('/components/artifact/')) return 'artifact';
            return undefined;
          }
          if (id.includes('chart.js') || id.includes('react-chartjs')) return 'vendor-charts';
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('zustand')) return 'vendor-zustand';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 精确快讯接口由上面中间件处理；其余 /api 仍转 Nest
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          if (req.url?.startsWith('/api/ai-daily-news')) return req.url;
        },
      },
    },
  },
});
