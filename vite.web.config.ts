import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * 纯浏览器构建配置（`pnpm dev:web` 开发 / `pnpm build:web` 生产，均带 --mode web）
 * 复用 electron.vite.config.ts 的 renderer 段，不启动 Electron 主进程。
 * 端口固定 5173（与后端 CORS 白名单一致），被占用时快速失败而不是静默换端口
 * （换端口会导致 API 请求被 CORS 拦截且难以排查）。
 *
 * 生产产物输出到项目根 dist-web/：
 * - 路由为 history 模式（.env.web 的 VITE_ROUTER_MODE），部署端需 try_files 回退 /index.html
 * - 默认 API 地址由 build:web 注入 VITE_API_BASE（Electron 桌面构建不受影响）
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  // env 文件（.env.web）放在项目根；不指定时 envDir 跟随 root，会读不到
  envDir: __dirname,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // web 端只打包主入口；audio-engine.html 是 Electron 主进程专用窗口，浏览器端不引用
        index: resolve(__dirname, 'src/renderer/index.html')
      }
    }
  }
})
