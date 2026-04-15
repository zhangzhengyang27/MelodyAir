import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { cacheManager } from '../utils/db'
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

  // 缓存设置
  enableCache: boolean
  cacheLimitMB: number
  autoCacheNextTrack: boolean

  // 解灰设置
  enableUnblock: boolean

  // 歌词设置
  showLyricTranslation: boolean
  lyricFontSize: number
  lyricFontFamily: string
  lyricAlignment: 'left' | 'center' | 'right'
  enableEnhancedLyric: boolean // 逐字歌词

  // Electron 设置
  minimizeToTray: boolean
  globalShortcut: boolean
  autoLaunch: boolean

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

  // 缓存设置
  const enableCache = ref(true)
  const cacheLimitMB = ref(500) // 默认 500MB
  const autoCacheNextTrack = ref(true)

  // 解灰设置
  const enableUnblock = ref(true)

  // 歌词设置
  const showLyricTranslation = ref(true)
  const lyricFontSize = ref(16)
  const lyricFontFamily = ref('system-ui')
  const lyricAlignment = ref<'left' | 'center' | 'right'>('center')
  const enableEnhancedLyric = ref(true) // 逐字歌词（默认开启）

  // Electron 设置
  const minimizeToTray = ref(true)
  const globalShortcut = ref(true)
  const autoLaunch = ref(false)

  // 网络设置（统一直连后端，不再走 Vite proxy）
  const apiBase = ref('http://localhost:3000')

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
    enableCache,
    cacheLimitMB,
    autoCacheNextTrack,
    enableUnblock,
    showLyricTranslation,
    lyricFontSize,
    lyricFontFamily,
    lyricAlignment,
    enableEnhancedLyric,
    minimizeToTray,
    globalShortcut,
    autoLaunch,
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
    pick: [
      'theme', 'lyricsBackground', 'musicQuality', 'autoPlay', 'fadeDuration',
      'enableCache', 'cacheLimitMB', 'autoCacheNextTrack', 'enableUnblock',
      'showLyricTranslation', 'lyricFontSize', 'lyricFontFamily', 'lyricAlignment',
      'enableEnhancedLyric',
      'minimizeToTray', 'globalShortcut', 'autoLaunch', 'apiBase'
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
