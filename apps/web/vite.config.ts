import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

/** 默认 dev：托管项目根目录 index.html 高保真原型（npm run dev:prototype） */
export default defineConfig({
  root: projectRoot,
  publicDir: false,
  server: {
    port: 5173,
    open: '/index.html',
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
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(projectRoot, 'index.html'),
    },
  },
});
