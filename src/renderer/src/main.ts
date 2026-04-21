import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'
import App from './App.vue'
import './assets/styles/tailwind.css'

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
import('@/stores/player').then(({ usePlayerStore }) => {
  const playerStore = usePlayerStore()
  // 延迟执行，确保 store 初始化完成
  setTimeout(() => {
    playerStore.restorePlayback()
  }, 1000)
})

// 恢复用户登录状态
import('@/stores/user').then(({ useUserStore }) => {
  const userStore = useUserStore()
  // 如果有持久化的 profile 和 cookie，检查登录状态
  if (userStore.profile && userStore.cookie) {
    userStore.checkLoginStatus()
  }
})
