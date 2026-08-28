import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * 纯浏览器开发配置（供 `pnpm dev:web` 使用）
 * 复用 electron.vite.config.ts 的 renderer 段，不启动 Electron 主进程。
 * 端口固定 5173（与后端 CORS 白名单一致），被占用时快速失败而不是静默换端口
 * （换端口会导致 API 请求被 CORS 拦截且难以排查）。
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true
  }
})
