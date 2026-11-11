import { defineConfig } from 'vite';

// 개발: `npm run dev`(5173) 가 /ws 를 `npm run worker`(wrangler dev, 8787) 로 프록시
export default defineConfig({
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2020' },
  server: {
    proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } },
  },
});
