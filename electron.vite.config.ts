import { resolve } from 'path'
import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// 构建期注入应用版本，避免在渲染层硬编码版本号导致与实际发布版本漂移
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    // env 文件（.env.production）放在项目根；不指定时 envDir 跟随 root（src/renderer），
    // 会读不到。dev（mode=development）不加载 .env.production，本地调试仍默认 localhost
    envDir: __dirname,
    plugins: [vue(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          'audio-engine': resolve(__dirname, 'src/renderer/audio-engine.html')
        }
      }
    }
  }
})
