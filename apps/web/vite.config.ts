import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const prototypeHtml = path.resolve(projectRoot, 'docs/legacy-prototype/index.html');

/** 默认 dev：托管旧版静态设计稿（npm run dev:prototype） */
export default defineConfig({
  root: projectRoot,
  publicDir: false,
  server: {
    port: 5173,
    open: '/docs/legacy-prototype/index.html',
    fs: {
      allow: [projectRoot],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist-prototype'),
    emptyOutDir: true,
    rollupOptions: {
      input: prototypeHtml,
    },
  },
});
