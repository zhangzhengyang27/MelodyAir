// Electron API 类型定义
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

  // 主题同步
  setDarkMode: (isDark: boolean) => void
  shouldUseDarkColors: () => Promise<boolean>

  // 本地音乐扫描
  selectScanDirectory: () => Promise<string | null>
  startScan: (dirPath: string) => Promise<any>
  abortScan: () => Promise<boolean>
  extractCover: (filePath: string) => Promise<{ data: string; mimeType: string } | null>
  calculateChecksum: (filePath: string) => Promise<string | null>
  saveCover: (coverData: string, fileName: string) => Promise<string | null>
  onScanProgress: (callback: (progress: any) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
