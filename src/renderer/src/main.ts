import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'
import App from './App.vue'
import './assets/styles/tailwind.css'
import { cleanupInvalidCookieEntries } from './api/cookie'
import { isMainWindow } from './utils/windowRole'

// 启动时清理历史上被错误存储的 cookie 属性项（必须在任何 API 请求之前执行）
cleanupInvalidCookieEntries()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')

// Umami 访问统计：仅在 Web 构建注入（VITE_ROUTER_MODE=history，见 .env.web）。
// Electron 桌面版不注入，避免 file:// 环境的页览污染线上数据。
// umami script.js 自带 SPA 支持，会跟踪 history.pushState/replaceState 路由跳转。
if (import.meta.env.VITE_ROUTER_MODE === 'history') {
  const umami = document.createElement('script')
  umami.defer = true
  umami.src = 'https://analytics.zhangzhengyang.com/script.js'
  umami.setAttribute('data-website-id', '7ad68d7c-b004-4945-afe1-efb4682dcc20')
  document.head.appendChild(umami)
}

// Listen for player actions from Electron main process
// 来源：全局媒体键、系统托盘菜单、迷你播放器窗口、桌面歌词窗口
// 协议：toggle | prev | next | toggleLike | toggleMute | seek:<秒> | volume:<0~1>
window.electronAPI?.onPlayerAction?.((action: string) => {
  // Dynamic import to avoid circular dependency at module init time
  import('@/stores/player').then(({ usePlayerStore }) => {
    const playerStore = usePlayerStore()

    // 带参数的动作统一走 `name:value` 形式
    const separatorIndex = action.indexOf(':')
    const name = separatorIndex === -1 ? action : action.slice(0, separatorIndex)
    const value = separatorIndex === -1 ? '' : action.slice(separatorIndex + 1)

    switch (name) {
      case 'toggle':
        playerStore.togglePlaying()
        break
      case 'prev':
        playerStore.playPrev()
        break
      case 'next':
        playerStore.playNext()
        break
      case 'toggleLike':
        import('@/stores/user').then(({ useUserStore }) => {
          const userStore = useUserStore()
          if (playerStore.currentSong) {
            userStore.toggleLike(playerStore.currentSong.id)
          }
        })
        break
      case 'toggleMute':
        playerStore.toggleMute()
        break
      case 'volume': {
        const volume = Number(value)
        if (Number.isFinite(volume)) {
          playerStore.setVolume(Math.min(1, Math.max(0, volume)))
          if (volume > 0 && playerStore.muted) playerStore.toggleMute()
        }
        break
      }
      case 'seek': {
        const time = Number(value)
        if (Number.isFinite(time) && time >= 0) {
          playerStore.seek(time)
        }
        break
      }
    }
  })
})

// Apply saved theme on startup
const savedTheme = localStorage.getItem('settings')
if (savedTheme) {
  try {
    const parsed = JSON.parse(savedTheme)
    const theme = parsed?.theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    }
    // For 'system' or undefined, let useTheme composable handle it on mount
  } catch {
    // Ignore parse errors - useTheme will handle default behavior
  }
}

// ★ Feature 3: 恢复上次播放状态（异步，不阻塞渲染）
// 只在主窗口恢复播放，桌面歌词窗口和迷你窗口跳过，避免重复播放
// 移动端浏览器受 autoplay 策略限制，启动时无法出声，只恢复队列/历史，待用户首次操作后再播放
const isWebMobile = !window.electronAPI && window.matchMedia('(pointer: coarse)').matches
if (isMainWindow()) {
  import('@/stores/player').then(({ usePlayerStore }) => {
    const playerStore = usePlayerStore()
    // 先恢复持久化状态（睡眠定时、播放历史）
    playerStore.loadPersistentState()
    if (isWebMobile) return
    // 等待音频引擎就绪后恢复播放，带兜底超时
    let restored = false
    const tryRestore = () => {
      if (restored) return
      restored = true
      offReady?.()
      // 引擎就绪后先同步持久化的音量/静音/倍速，再恢复播放
      playerStore.syncAudioEngineState()
      playerStore.restorePlayback()
    }
    const offReady = window.electronAPI?.onIpcEvent?.('audio:ready', tryRestore)
    // 兜底：2 秒后强制尝试（音频引擎通常已就绪）
    setTimeout(tryRestore, 2000)
  })
}

// 恢复用户登录状态
import('@/stores/user').then(({ useUserStore }) => {
  const userStore = useUserStore()
  // 如果有持久化的 profile 和 cookie，检查登录状态
  if (userStore.profile && userStore.cookie) {
    userStore.checkLoginStatus()
  }
})
