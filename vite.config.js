import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/athan-app/' : '/',
  server: { port: 4000, open: true },
  build:  { outDir: 'dist', sourcemap: true },
});
