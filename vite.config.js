import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: { port: 4000 },
  build:  { outDir: 'dist', sourcemap: true },
});
