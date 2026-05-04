import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Vite 配置
 * 前端开发服务器和构建配置
 */
export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  }
})
