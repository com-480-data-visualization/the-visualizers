import { defineConfig } from 'vite';

export default defineConfig({
  base: '/the-visualizers/',
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true
  }
});