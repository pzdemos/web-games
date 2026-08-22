import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: '/var/www/mines',
    emptyOutDir: true,
    rollupOptions: {
      // m.html（手机版，自包含单文件）作为第二入口一起构建，
      // 避免 emptyOutDir 清空部署目录后丢失手工文件
      input: {
        main: resolve(__dirname, 'index.html'),
        mobile: resolve(__dirname, 'm.html')
      }
    }
  }
});
