import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'
import App from './App.vue'
import './assets/styles/tailwind.css'
import { cleanupInvalidCookieEntries } from './api/cookie'

// 启动时清理历史上被错误存储的 cookie 属性项（必须在任何 API 请求之前执行）
cleanupInvalidCookieEntries()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')

// Listen for player actions from Electron main process (media keys, tray)
window.electronAPI?.onPlayerAction?.((action: string) => {
  // Dynamic import to avoid circular dependency at module init time
  import('@/stores/player').then(({ usePlayerStore }) => {
    const playerStore = usePlayerStore()
    switch (action) {
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
        // Import userStore for like functionality
        import('@/stores/user').then(({ useUserStore }) => {
          const userStore = useUserStore()
          if (playerStore.currentSong) {
            userStore.toggleLike(playerStore.currentSong.id)
          }
        })
        break
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
const isSecondaryWindow = window.location.hash.includes('/desktop-lyrics') || window.location.hash.includes('/mini-player')
if (!isSecondaryWindow) {
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
