// Electron API 类型定义（唯一权威声明）
// 与 src/preload/index.ts 暴露的 api 一一对应，新增 preload 方法时需同步更新此处
import type { ElectronAPI as ToolkitElectronAPI } from '@electron-toolkit/preload'

/** 桌面歌词同步载荷（含译文与逐字时间轴） */
export interface DesktopLyricPayload {
  currentText: string
  translation?: string
  prevText?: string
  nextText?: string
  hasLyrics: boolean
  /** 当前行起始时间（毫秒） */
  lineTime?: number
  /** 逐字时间轴（毫秒，绝对时间） */
  words?: Array<{ time: number; text: string }>
}

/** 桌面歌词偏好（持久化在主进程 userData/window-state.json） */
export interface LyricsWindowPrefs {
  locked: boolean
  fontSize: number
  alwaysOnTop: boolean
  showTranslation: boolean
}

/** 推送给子窗口的曲目信息，duration 单位为秒 */
export interface WindowTrackInfo {
  title: string
  artist: string
  album: string
  cover?: string
  duration: number
}

export interface ElectronAPI {
  // 窗口控制
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  windowIsMaximized: () => Promise<boolean>
  windowFocus: () => void
  /** 唤起主窗口（子窗口使用） */
  windowShowMain: () => void

  // 播放器通信
  sendIpcEvent: (channel: string, data?: unknown) => void
  onIpcEvent: (channel: string, callback: (...args: any[]) => void) => () => void
  onPlayerAction: (callback: (action: 'toggle' | 'next' | 'prev' | 'toggleLike') => void) => () => void
  /** 发送控制动作到主窗口：toggle | prev | next | toggleLike | toggleMute | seek:<秒> | volume:<0~1> */
  sendPlayerAction: (action: string) => void
  onTrackUpdated: (callback: (track: WindowTrackInfo) => void) => () => void
  onPlayStateUpdated: (callback: (isPlaying: boolean) => void) => () => void
  onLikeStateUpdated: (callback: (liked: boolean) => void) => () => void
  onProgressUpdated: (callback: (currentTime: number) => void) => () => void
  onVolumeUpdated: (callback: (data: { volume: number; muted: boolean }) => void) => () => void
  onLyricsUpdated: (callback: (data: DesktopLyricPayload) => void) => () => void

  // 音频引擎控制
  audioPlay: (url: string, songId: string | number, html5?: boolean) => void
  audioPause: () => void
  audioResume: () => void
  audioToggle: () => void
  audioSeek: (time: number) => void
  audioSetVolume: (volume: number) => void
  audioToggleMute: () => void
  audioSetPlaybackRate: (rate: number) => void
  audioStop: () => void
  // 注意：preload 未暴露查询类音频 API（引擎在隐藏窗口，单向 send 拿不到返回值），
  // 播放状态统一通过 onAudioTimeUpdate / onAudioStateChange 等事件获取
  onAudioTimeUpdate: (callback: (data: { currentTime: number; duration: number }) => void) => () => void
  onAudioStateChange: (callback: (data: { status: string }) => void) => () => void
  onAudioEnded: (callback: () => void) => () => void
  onAudioError: (callback: (data: { message: string }) => void) => () => void
  onAudioBuffered: (callback: (data: { progress: number }) => void) => () => void
  onAudioReady: (callback: () => void) => () => void
  onAudioFrequencyData: (callback: (data: { frequencyData: number[] }) => void) => () => void

  // 应用设置
  setAutoLaunch: (enable: boolean) => Promise<boolean>
  setMinimizeToTray: (enable: boolean) => Promise<boolean>
  setGlobalShortcuts: (enabled: boolean) => Promise<boolean>
  setCustomShortcuts: (shortcuts: { playPause: string; prev: string; next: string }) => Promise<boolean>
  getPlatform: () => Promise<string>

  // 迷你悬浮窗
  openMiniWindow: () => Promise<boolean>
  closeMiniWindow: () => Promise<boolean>
  isMiniWindowOpen: () => Promise<boolean>

  // 桌面歌词窗口
  openLyricsWindow: () => Promise<boolean>
  closeLyricsWindow: () => Promise<boolean>
  isLyricsWindowOpen: () => Promise<boolean>
  setLyricsWindowAlwaysOnTop: (flag: boolean) => Promise<boolean>
  setLyricsWindowLocked: (locked: boolean) => Promise<boolean>
  setLyricsWindowIgnoreMouse: (ignore: boolean) => Promise<boolean>
  getLyricsWindowPrefs: () => Promise<LyricsWindowPrefs>
  setLyricsWindowPrefs: (patch: Partial<LyricsWindowPrefs>) => Promise<boolean>

  // 应用更新
  checkForUpdates: () => Promise<boolean>
  downloadUpdate: () => Promise<boolean>
  installUpdate: () => Promise<boolean>
  openReleases: () => Promise<boolean>
  onUpdateAvailable: (callback: (info: { version: string; currentVersion: string }) => void) => () => void
  onUpdateDownloadProgress: (callback: (data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
  onMacUpdateAvailable: (callback: (info: { version: string; currentVersion: string; downloadUrl: string; releasesUrl: string }) => void) => () => void
  onUpdateStatus: (callback: (data: { state: string; version?: string }) => void) => () => void
  onUpdateError: (callback: (data: { message: string }) => void) => () => void

  // 主题同步
  setDarkMode: (isDark: boolean) => void
  shouldUseDarkColors: () => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    /**
     * @electron-toolkit/preload 暴露的 toolkit API（contextIsolated 时以 window.electron 暴露）。
     * 仅包含 ipcRenderer/webFrame 等底层能力，业务代码请优先使用 electronAPI。
     */
    electron?: ToolkitElectronAPI
  }
}

export {}
