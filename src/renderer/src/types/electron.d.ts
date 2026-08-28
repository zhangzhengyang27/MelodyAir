// Electron API 类型定义（唯一权威声明）
// 与 src/preload/index.ts 暴露的 api 一一对应，新增 preload 方法时需同步更新此处
import type { ElectronAPI as ToolkitElectronAPI } from '@electron-toolkit/preload'

export interface ElectronAPI {
  // 窗口控制
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  windowIsMaximized: () => Promise<boolean>
  windowFocus: () => void

  // 播放器通信
  sendIpcEvent: (channel: string, data?: unknown) => void
  onIpcEvent: (channel: string, callback: (...args: any[]) => void) => () => void
  onPlayerAction: (callback: (action: 'toggle' | 'next' | 'prev' | 'toggleLike') => void) => () => void
  onTrackUpdated: (callback: (track: { title: string; artist: string; album: string; cover?: string; duration: number }) => void) => () => void
  onPlayStateUpdated: (callback: (isPlaying: boolean) => void) => () => void

  // 音频引擎控制
  audioPlay: (url: string, songId: string | number, html5?: boolean) => void
  audioPause: () => void
  audioResume: () => void
  audioToggle: () => void
  audioSeek: (time: number) => void
  audioSetVolume: (volume: number) => void
  audioToggleMute: () => void
  audioSetPlaybackRate: (rate: number) => void
  audioSetEqualizerBand: (bandIndex: number, gain: number) => void
  audioSetEqualizerBands: (gains: number[]) => void
  audioSetEqualizerEnabled: (enabled: boolean) => void
  audioStop: () => void
  // 同步查询类（preload 以 invoke 实现，audioAdapter 通过可选调用使用）
  audioGetVolume?: () => number
  audioGetPlaybackRate?: () => number
  audioGetCurrentTime?: () => number
  audioGetDuration?: () => number
  audioIsPlaying?: () => boolean
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
