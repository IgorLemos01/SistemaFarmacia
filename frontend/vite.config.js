import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sistema: resolve(__dirname, 'sistema.html')
      }
    }
  },
  server: {
    port: 5173
  },
  test: {
    environment: 'jsdom'
  }
});
