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

// ===== Umami 访问统计 =====
// - Web 构建（.env.web，VITE_ROUTER_MODE=history）：自动跟踪，计入「MelodyAir Web」站点；
//   umami script.js 自带 SPA 支持，跟踪 history.pushState/replaceState 路由跳转。
// - Electron 生产构建：计入独立的「MelodyAir Desktop」站点。必须关自动跟踪——生产走 file://，
//   自动上报会把本地文件路径（含本机用户名）记进 URL 统计；改由 router.afterEach 上报干净路由。
//   仅主窗口上报：迷你播放器/桌面歌词窗口加载同一入口，各自上报会重复计数。
// - Electron dev：不上报（import.meta.env.PROD=false）。
const UMAMI_SRC = 'https://analytics.zhangzhengyang.com/script.js'
const UMAMI_WEB_ID = '7ad68d7c-b004-4945-afe1-efb4682dcc20'
const UMAMI_DESKTOP_ID = 'b9d75c1f-92a6-431c-bb2c-4c5d19365b4c'
const UMAMI_DESKTOP_HOST = 'desktop.melodyair'

interface UmamiTracker {
  track: (fn: (props: Record<string, unknown>) => Record<string, unknown>) => void
}

function injectUmami(id: string, opts: { autoTrack?: boolean; onload?: () => void } = {}): void {
  const script = document.createElement('script')
  script.defer = true
  script.src = UMAMI_SRC
  script.setAttribute('data-website-id', id)
  if (opts.autoTrack === false) script.setAttribute('data-auto-track', 'false')
  if (opts.onload) script.onload = opts.onload
  document.head.appendChild(script)
}

if (import.meta.env.VITE_ROUTER_MODE === 'history') {
  injectUmami(UMAMI_WEB_ID)
} else if (import.meta.env.PROD && window.electronAPI && isMainWindow()) {
  // tracker 由 script.js 异步创建，就绪前先排队，onload 后冲刷
  const pending: string[] = []
  const win = window as unknown as { umami?: UmamiTracker }
  const trackPage = (url: string): void => {
    if (win.umami) win.umami.track((props) => ({ ...props, url, hostname: UMAMI_DESKTOP_HOST }))
    else pending.push(url)
  }
  router.afterEach((to) => trackPage(to.fullPath))
  injectUmami(UMAMI_DESKTOP_ID, {
    autoTrack: false,
    onload: () => pending.splice(0).forEach(trackPage)
  })
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

// ★ 启动时把桌面端设置回灌给主进程。
// 主进程侧的变量（minimizeToTray / globalShortcutsEnabled / customShortcuts）都有代码默认值，
// 若不回灌，重启后会回到默认值，表现为「设置项重启后失效」。
if (isMainWindow() && window.electronAPI) {
  import('@/stores/settings').then(({ useSettingsStore }) => {
    const settingsStore = useSettingsStore()
    const api = window.electronAPI!
    api.setMinimizeToTray?.(settingsStore.minimizeToTray)
    api.setAutoLaunch?.(settingsStore.autoLaunch)
    api.setGlobalShortcuts?.(settingsStore.globalShortcut)
    if (settingsStore.customShortcutsEnabled) {
      api.setCustomShortcuts?.({
        playPause: settingsStore.shortcutPlayPause,
        prev: settingsStore.shortcutPrev,
        next: settingsStore.shortcutNext,
      })
    }
  })
}
