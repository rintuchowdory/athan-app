import { defineConfig } from 'vite';
const base = process.env.VITE_BASE ?? '/athan-app/';
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? base : '/',
  server: { port: 4000, open: true },
  build:  { outDir: 'dist', sourcemap: true },
});
