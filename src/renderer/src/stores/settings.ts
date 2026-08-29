import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { cacheManager } from '../utils/db'
import { throttledPersistStorage } from '../utils/persistStorage'
import { settingsDefaults, migrateWithDefaults } from './defaults'

/**
 * 音质选项
 */
export type MusicQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' | 'jyeffect' | 'sky' | 'dolby' | 'jymaster'

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 歌词背景类型
 */
export type LyricsBackgroundType = 'blur' | 'gradient' | 'cover' | 'none'

export interface SettingsState {
  // 外观设置
  theme: ThemeMode
  lyricsBackground: LyricsBackgroundType

  // 播放设置
  musicQuality: MusicQuality
  autoPlay: boolean
  fadeDuration: number // 淡入淡出时长(ms)
  playbackSpeed: number // 播放速率 (0.5 - 2)

  // 缓存设置
  enableCache: boolean
  cacheLimitMB: number
  autoCacheNextTrack: boolean

  // 解灰设置
  enableUnblock: boolean

  // 歌词设置
  showLyricTranslation: boolean
  showLyricRomanization: boolean
  lyricFontSize: number
  lyricFontFamily: string
  lyricAlignment: 'left' | 'center' | 'right'
  enableEnhancedLyric: boolean // 逐字歌词

  // Electron 设置
  minimizeToTray: boolean
  globalShortcut: boolean
  autoLaunch: boolean
  enableDesktopNotification: boolean
  customShortcutsEnabled: boolean
  shortcutPlayPause: string
  shortcutPrev: string
  shortcutNext: string

  // 网络设置
  apiBase: string
}

export const useSettingsStore = defineStore('settings', () => {
  // 外观设置
  const theme = ref<ThemeMode>('system')
  const lyricsBackground = ref<LyricsBackgroundType>('blur')

  // 播放设置
  const musicQuality = ref<MusicQuality>('exhigh')
  const autoPlay = ref(true)
  const fadeDuration = ref(200)
  const playbackSpeed = ref(1)

  // 缓存设置
  const enableCache = ref(true)
  const cacheLimitMB = ref(500) // 默认 500MB
  const autoCacheNextTrack = ref(true)

  // 解灰设置
  const enableUnblock = ref(true)

  // 歌词设置
  const showLyricTranslation = ref(true)
  const showLyricRomanization = ref(false)
  const lyricFontSize = ref(16)
  const lyricFontFamily = ref('system-ui')
  const lyricAlignment = ref<'left' | 'center' | 'right'>('center')
  const enableEnhancedLyric = ref(true) // 逐字歌词（默认开启）

  // Electron 设置
  const minimizeToTray = ref(true)
  const globalShortcut = ref(true)
  const autoLaunch = ref(false)
  const enableDesktopNotification = ref(true)
  const customShortcutsEnabled = ref(false)
  const shortcutPlayPause = ref('MediaPlayPause')
  const shortcutPrev = ref('MediaPreviousTrack')
  const shortcutNext = ref('MediaNextTrack')

  // 网络设置（统一直连后端，不再走 Vite proxy）
  // Web 构建（.env.web / build:web）默认指向线上 API；Electron/本地开发默认 localhost
  const apiBase = ref(import.meta.env.VITE_API_BASE || 'http://localhost:3001')

  // ★ 初始化时同步缓存大小到 CacheManager
  cacheManager.setMaxCacheSize(cacheLimitMB.value)

  // ★ 监听缓存大小变更，动态同步
  watch(cacheLimitMB, (newVal) => {
    cacheManager.setMaxCacheSize(newVal)
  })

  /**
   * 音质显示名称映射
   */
  const qualityLabels: Record<MusicQuality, string> = {
    standard: '标准音质 (128K)',
    higher: '较高音质 (192K)',
    exhigh: '高品质 (320K)',
    lossless: '无损音质',
    hires: 'Hi-Res 无损',
    jyeffect: '高清环绕声',
    sky: '沉浸环绕声',
    dolby: '杜比全景声',
    jymaster: '超清母带'
  }

  /**
   * 获取当前音质的显示标签
   */
  const currentQualityLabel = computed(() => qualityLabels[musicQuality.value])

  function setTheme(t: ThemeMode): void {
    theme.value = t
  }

  function setMusicQuality(quality: MusicQuality): void {
    musicQuality.value = quality
  }

  function setApiBase(url: string): void {
    apiBase.value = url
  }

  function toggleMinimizeToTray(): void {
    minimizeToTray.value = !minimizeToTray.value
  }

  function toggleGlobalShortcut(): void {
    globalShortcut.value = !globalShortcut.value
  }

  function toggleAutoLaunch(): void {
    autoLaunch.value = !autoLaunch.value
  }

  return {
    // State
    theme,
    lyricsBackground,
    musicQuality,
    autoPlay,
    fadeDuration,
    playbackSpeed,
    enableCache,
    cacheLimitMB,
    autoCacheNextTrack,
    enableUnblock,
    showLyricTranslation,
    showLyricRomanization,
    lyricFontSize,
    lyricFontFamily,
    lyricAlignment,
    enableEnhancedLyric,
    minimizeToTray,
    globalShortcut,
    autoLaunch,
    enableDesktopNotification,
    customShortcutsEnabled,
    shortcutPlayPause,
    shortcutPrev,
    shortcutNext,
    apiBase,

    // Computed
    currentQualityLabel,

    // Actions
    setTheme,
    setMusicQuality,
    setApiBase,
    toggleMinimizeToTray,
    toggleGlobalShortcut,
    toggleAutoLaunch,

    // Labels
    qualityLabels
  }
}, {
  persist: {
    storage: throttledPersistStorage,
    pick: [
      'theme', 'lyricsBackground', 'musicQuality', 'autoPlay', 'fadeDuration', 'playbackSpeed',
      'enableCache', 'cacheLimitMB', 'autoCacheNextTrack', 'enableUnblock',
      'showLyricTranslation', 'showLyricRomanization', 'lyricFontSize', 'lyricFontFamily', 'lyricAlignment',
      'enableEnhancedLyric',
      'minimizeToTray', 'globalShortcut', 'autoLaunch', 'enableDesktopNotification', 'customShortcutsEnabled', 'shortcutPlayPause', 'shortcutPrev', 'shortcutNext', 'apiBase'
    ],
    afterHydrate: (ctx) => {
      try {
        const merged = migrateWithDefaults(settingsDefaults, ctx.store.$state as Partial<typeof settingsDefaults>)
        Object.assign(ctx.store.$state, merged)
      } catch {
        // 迁移失败时使用当前值（已是代码中的默认值）
      }
    }
  }
})
