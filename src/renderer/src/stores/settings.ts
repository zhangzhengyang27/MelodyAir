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
  fadeDuration: number // 淡入淡出时长(ms)
  playbackSpeed: number // 播放速率 (0.5 - 2)

  // 缓存设置
  enableCache: boolean
  cacheLimitMB: number
  autoCacheNextTrack: boolean

  // 解灰设置
  enableUnblock: boolean

  // 歌词设置
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
  const fadeDuration = ref(200)
  const playbackSpeed = ref(1)

  // 缓存设置
  const enableCache = ref(true)
  const cacheLimitMB = ref(500) // 默认 500MB
  const autoCacheNextTrack = ref(true)

  // 解灰设置
  const enableUnblock = ref(true)

  // 歌词设置
  // 注意：歌词字号 / 译文显示由 lyricsStore 统一负责（播放页与设置页共用同一份状态），
  // 音译（罗马音）暂无实现，不再保留无消费方的设置字段。
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

  return {
    // State
    theme,
    lyricsBackground,
    musicQuality,
    fadeDuration,
    playbackSpeed,
    enableCache,
    cacheLimitMB,
    autoCacheNextTrack,
    enableUnblock,
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

    // Labels
    qualityLabels
  }
}, {
  persist: {
    storage: throttledPersistStorage,
    pick: [
      'theme', 'lyricsBackground', 'musicQuality', 'fadeDuration', 'playbackSpeed',
      'enableCache', 'cacheLimitMB', 'autoCacheNextTrack', 'enableUnblock',
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
