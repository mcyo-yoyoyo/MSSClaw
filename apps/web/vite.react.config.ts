import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/** GitHub Pages 项目页需要带仓库名前缀；本地开发保持 `/` */
const base = process.env.GITHUB_PAGES === 'true' ? '/MSSClaw/' : '/';

type AihotDevItem = {
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

function aihotDateLabel(value?: string): string {
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

function aihotDateKey(value?: string): string {
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

function mapAihotDevPayload(items: AihotDevItem[]) {
  const grouped = new Map<
    string,
    { dateLabel: string; items: Array<Record<string, unknown>> }
  >();
  for (const item of items) {
    const title = item.title?.trim();
    if (!item.id || !title) continue;
    const publishedAt = item.publishedAt ?? item.discoveredAt ?? new Date().toISOString();
    const dateKey = aihotDateKey(publishedAt);
    const dateLabel = aihotDateLabel(publishedAt);
    const mapped = {
      id: `aihot-${item.id}`,
      dateLabel,
      title,
      summary: item.summary?.trim() ?? '',
      url: item.links?.original || item.links?.aihot || 'https://aihot.virxact.com',
      source: item.source?.name?.trim() || undefined,
      category: item.category || undefined,
      reason: item.reason?.trim() || undefined,
      score: typeof item.score === 'number' ? item.score : undefined,
      aihotUrl: item.links?.aihot || undefined,
    };
    const group = grouped.get(dateKey);
    if (group) group.items.push(mapped);
    else grouped.set(dateKey, { dateLabel, items: [mapped] });
  }
  return {
    sourceUrl: 'https://aihot.virxact.com',
    sourceName: 'AIHOT',
    fetchedAt: new Date().toISOString(),
    groups: [...grouped].map(([dateKey, group]) => ({
      dateKey,
      dateLabel: group.dateLabel,
      items: group.items,
    })),
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
            const upstream = await fetch(
              'https://aihot.virxact.com/api/v1/items?mode=selected&window=7d&limit=100',
              {
              headers: {
                  'User-Agent': 'mssclaw-ai-brief-dev/1.0',
                  Accept: 'application/json',
                },
              },
            );
            if (!upstream.ok) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: `upstream ${upstream.status}`, groups: [] }));
              return;
            }
            const data = (await upstream.json()) as { items?: AihotDevItem[] };
            const payload = mapAihotDevPayload(Array.isArray(data.items) ? data.items : []);
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
  // 这里只使用 @lobehub/icons 的纯数据子路径；预构建整个包会误扫它未安装的可选 UI peer。
  optimizeDeps: {
    exclude: ['@lobehub/icons'],
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
          if (id.includes('pdfjs-dist')) return 'vendor-pdf-preview';
          if (id.includes('@office-kit/pptx')) return 'vendor-pptx-preview';
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
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            const r = res as { writeHead?: (code: number, h: Record<string, string>) => void; end?: (b: string) => void; headersSent?: boolean };
            if (!r.writeHead || r.headersSent) return;
            r.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            r.end?.(
              JSON.stringify({
                status: 'unreachable',
                message: 'Nest API 未启动。请另开终端运行 npm run dev:api（默认 http://localhost:3000）。',
              }),
            );
          });
        },
      },
    },
  },
});
