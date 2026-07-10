import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/** GitHub Pages 项目页需要带仓库名前缀；本地开发保持 `/` */
const base = process.env.GITHUB_PAGES === 'true' ? '/MSSClaw/' : '/';

/** React 工程化前端（npm run dev 默认入口） */
export default defineConfig({
  base,
  plugins: [react()],
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
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
