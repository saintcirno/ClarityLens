import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  },
  build: {
    target: 'esnext'
  },
  optimizeDeps: {
    include: ['tesseract.js']
  }
});
