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
