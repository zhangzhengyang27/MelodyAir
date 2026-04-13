import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 音质选项
 */
export type MusicQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires'

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

  // 歌词设置
  showLyricTranslation: boolean
  lyricFontSize: number
  lyricFontFamily: string
  lyricAlignment: 'left' | 'center' | 'right'

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

  // 歌词设置
  const showLyricTranslation = ref(true)
  const lyricFontSize = ref(16)
  const lyricFontFamily = ref('system-ui')
  const lyricAlignment = ref<'left' | 'center' | 'right'>('center')

  // Electron 设置
  const minimizeToTray = ref(true)
  const globalShortcut = ref(true)
  const autoLaunch = ref(false)

  // 网络设置（开发环境强制走 Vite 代理）
  const _apiBase = ref('http://localhost:3000')
  const apiBase = import.meta.env.DEV
    ? computed(() => '/api')
    : _apiBase

  /**
   * 音质显示名称映射
   */
  const qualityLabels: Record<MusicQuality, string> = {
    standard: '标准音质 (128K)',
    higher: '较高音质 (192K)',
    exhigh: '高品质 (320K)',
    lossless: '无损音质',
    hires: 'Hi-Res 无损'
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
    _apiBase.value = url
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
    showLyricTranslation,
    lyricFontSize,
    lyricFontFamily,
    lyricAlignment,
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
      'enableCache', 'cacheLimitMB', 'autoCacheNextTrack',
      'showLyricTranslation', 'lyricFontSize', 'lyricFontFamily', 'lyricAlignment',
      'minimizeToTray', 'globalShortcut', 'autoLaunch', '_apiBase'
    ]
  }
})
