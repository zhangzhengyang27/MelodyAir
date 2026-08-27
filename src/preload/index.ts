import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * 扫描进度信息（与主进程 ScanProgress 保持一致）
 */
export interface ScanProgress {
  status: 'scanning' | 'parsing' | 'completed' | 'error'
  currentFile: string
  scannedCount: number
  totalCount: number
  parsedCount: number
  errorCount: number
}

/**
 * 扫描结果（与主进程 ScanResult 保持一致）
 */
export interface ScanResult {
  files: Array<{
    filePath: string
    fileName: string
    fileSize: number
    title?: string
    artist?: string
    album?: string
    duration?: number
    error?: string
  }>
  totalFiles: number
  successCount: number
  errorCount: number
  duration: number
}

/**
 * MelodyAir Electron Preload API
 * 暴露安全的 IPC 通信接口给渲染进程
 *
 * 设计参考：YesPlayMusic 的 preload 脚本
 */

const api = {
  // ==================== 窗口控制 ====================

  /** 最小化窗口 */
  windowMinimize: () => ipcRenderer.send('window:minimize'),

  /** 最大化/还原窗口 */
  windowMaximize: () => ipcRenderer.send('window:maximize'),

  /** 关闭窗口（或最小化到托盘） */
  windowClose: () => ipcRenderer.send('window:close'),

  /** 获取窗口是否已最大化 */
  windowIsMaximized: (): Promise<boolean> =>
    ipcRenderer.invoke('window:isMaximized'),

  /** 聚焦窗口 */
  windowFocus: () => ipcRenderer.send('window:focus'),

  // ==================== 播放器通信 ====================

  /**
   * 发送播放器状态更新到主进程（用于更新托盘、任务栏等）
   */
  sendIpcEvent: (channel: string, data?: unknown) => {
    // 白名单机制：允许 player: 命名空间下的所有频道
    // 新增 player:xxx 频道无需修改此处，非 player: 频道需要显式添加
    const allowedPrefixes = ['player:']
    const allowedChannels: string[] = []

    const isAllowed = allowedPrefixes.some(prefix => channel.startsWith(prefix)) ||
                      allowedChannels.includes(channel)

    if (isAllowed) {
      if (data !== undefined) {
        ipcRenderer.send(channel, data)
      } else {
        ipcRenderer.send(channel)
      }
    } else {
      console.warn(`[IPC] Blocked unauthorized channel: ${channel}`)
    }
  },

  /**
   * 监听来自主进程的播放器操作
   * （全局快捷键、托盘菜单点击等触发）
   */
  onPlayerAction: (callback: (action: 'toggle' | 'next' | 'prev' | 'toggleLike') => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => {
      callback(action as 'toggle' | 'next' | 'prev' | 'toggleLike')
    }

    ipcRenderer.on('player:action', handler)

    // 返回取消监听的函数
    return () => {
      ipcRenderer.removeListener('player:action', handler)
    }
  },

  /**
   * 监听当前播放歌曲信息更新（主窗口 -> 其他窗口）
   */
  onTrackUpdated: (callback: (track: { title: string; artist: string; album: string; cover?: string; duration: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, track: { title: string; artist: string; album: string; cover?: string; duration: number }) => {
      callback(track)
    }
    ipcRenderer.on('player:trackUpdated', handler)
    return () => {
      ipcRenderer.removeListener('player:trackUpdated', handler)
    }
  },

  /**
   * 监听播放状态更新（主窗口 -> 其他窗口）
   */
  onPlayStateUpdated: (callback: (isPlaying: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isPlaying: boolean) => {
      callback(isPlaying)
    }
    ipcRenderer.on('player:playStateUpdated', handler)
    return () => {
      ipcRenderer.removeListener('player:playStateUpdated', handler)
    }
  },

  /**
   * 通用 IPC 事件监听（主进程 -> 渲染进程）
   */
  onIpcEvent: (channel: string, callback: (...args: any[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: any[]) => {
      callback(...args)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },

  // ==================== 音频引擎控制 ====================

  /** 播放音频 */
  audioPlay: (url: string, songId: string | number, html5 = false) => ipcRenderer.send('audio:play', { url, songId, html5 }),
  /** 暂停 */
  audioPause: () => ipcRenderer.send('audio:pause'),
  /** 继续播放 */
  audioResume: () => ipcRenderer.send('audio:resume'),
  /** 切换播放/暂停 */
  audioToggle: () => ipcRenderer.send('audio:toggle'),
  /** 跳转 */
  audioSeek: (time: number) => ipcRenderer.send('audio:seek', { time }),
  /** 设置音量 */
  audioSetVolume: (volume: number) => ipcRenderer.send('audio:setVolume', { volume }),
  /** 切换静音 */
  audioToggleMute: () => ipcRenderer.send('audio:toggleMute'),
  /** 设置播放速率 */
  audioSetPlaybackRate: (rate: number) => ipcRenderer.send('audio:setPlaybackRate', { rate }),
  /** 设置均衡器单频段 */
  audioSetEqualizerBand: (bandIndex: number, gain: number) => ipcRenderer.send('audio:setEqualizerBand', { bandIndex, gain }),
  /** 批量设置均衡器 */
  audioSetEqualizerBands: (gains: number[]) => ipcRenderer.send('audio:setEqualizerBands', { gains }),
  /** 启用/禁用均衡器 */
  audioSetEqualizerEnabled: (enabled: boolean) => ipcRenderer.send('audio:setEqualizerEnabled', { enabled }),
  /** 停止播放 */
  audioStop: () => ipcRenderer.send('audio:stop'),

  /** 监听音频时间更新 */
  onAudioTimeUpdate: (callback: (data: { currentTime: number; duration: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { currentTime: number; duration: number }) => callback(data)
    ipcRenderer.on('audio:timeUpdate', handler)
    return () => ipcRenderer.removeListener('audio:timeUpdate', handler)
  },
  /** 监听音频状态变化 */
  onAudioStateChange: (callback: (data: { status: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { status: string }) => callback(data)
    ipcRenderer.on('audio:stateChange', handler)
    return () => ipcRenderer.removeListener('audio:stateChange', handler)
  },
  /** 监听音频播放结束 */
  onAudioEnded: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('audio:ended', handler)
    return () => ipcRenderer.removeListener('audio:ended', handler)
  },
  /** 监听音频错误 */
  onAudioError: (callback: (data: { message: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { message: string }) => callback(data)
    ipcRenderer.on('audio:error', handler)
    return () => ipcRenderer.removeListener('audio:error', handler)
  },
  /** 监听缓冲进度更新 */
  onAudioBuffered: (callback: (data: { progress: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { progress: number }) => callback(data)
    ipcRenderer.on('audio:buffered', handler)
    return () => ipcRenderer.removeListener('audio:buffered', handler)
  },
  /** 监听音频引擎就绪 */
  onAudioReady: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('audio:ready', handler)
    return () => ipcRenderer.removeListener('audio:ready', handler)
  },
  /** 监听音频频率数据（用于可视化） */
  onAudioFrequencyData: (callback: (data: { frequencyData: number[] }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { frequencyData: number[] }) => callback(data)
    ipcRenderer.on('audio:frequencyData', handler)
    return () => ipcRenderer.removeListener('audio:frequencyData', handler)
  },

  // ==================== 应用设置 ====================

  /** 设置开机自启动 */
  setAutoLaunch: (enable: boolean): Promise<boolean> =>
    ipcRenderer.invoke('app:setAutoLaunch', enable),

  /** 设置是否最小化到托盘 */
  setMinimizeToTray: (enable: boolean): Promise<boolean> =>
    ipcRenderer.invoke('app:setMinimizeToTray', enable),

  /** 设置是否启用全局快捷键 */
  setGlobalShortcuts: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('app:setGlobalShortcuts', enabled),

  /** 设置自定义全局快捷键 */
  setCustomShortcuts: (shortcuts: { playPause: string; prev: string; next: string }): Promise<boolean> =>
    ipcRenderer.invoke('app:setCustomShortcuts', shortcuts),

  /** 获取当前操作系统平台 */
  getPlatform: (): Promise<string> =>
    ipcRenderer.invoke('app:getPlatform'),

  // ==================== 迷你悬浮窗 ====================

  /** 打开迷你悬浮窗 */
  openMiniWindow: (): Promise<boolean> =>
    ipcRenderer.invoke('miniWindow:open'),

  /** 关闭迷你悬浮窗 */
  closeMiniWindow: (): Promise<boolean> =>
    ipcRenderer.invoke('miniWindow:close'),

  /** 检查迷你悬浮窗是否打开 */
  isMiniWindowOpen: (): Promise<boolean> =>
    ipcRenderer.invoke('miniWindow:isOpen'),

  // ==================== 桌面歌词窗口 ====================

  /** 打开桌面歌词窗口 */
  openLyricsWindow: (): Promise<boolean> =>
    ipcRenderer.invoke('lyricsWindow:open'),

  /** 关闭桌面歌词窗口 */
  closeLyricsWindow: (): Promise<boolean> =>
    ipcRenderer.invoke('lyricsWindow:close'),

  /** 检查桌面歌词窗口是否打开 */
  isLyricsWindowOpen: (): Promise<boolean> =>
    ipcRenderer.invoke('lyricsWindow:isOpen'),

  /** 设置桌面歌词窗口置顶 */
  setLyricsWindowAlwaysOnTop: (flag: boolean): Promise<boolean> =>
    ipcRenderer.invoke('lyricsWindow:setAlwaysOnTop', flag),

  /** 设置桌面歌词窗口锁定（鼠标穿透） */
  setLyricsWindowLocked: (locked: boolean): Promise<boolean> =>
    ipcRenderer.invoke('lyricsWindow:setLocked', locked),

  /** 临时设置桌面歌词窗口是否忽略鼠标事件（用于锁定状态下控制栏交互） */
  setLyricsWindowIgnoreMouse: (ignore: boolean): Promise<boolean> =>
    ipcRenderer.invoke('lyricsWindow:setIgnoreMouse', ignore),

  // ==================== 主题同步 ====================

  /** 向主进程同步暗色模式设置 */
  setDarkMode: (isDark: boolean) => {
    ipcRenderer.send('theme:setDarkMode', isDark)
  },

  /** 获取系统是否应该使用深色颜色 */
  shouldUseDarkColors: (): Promise<boolean> =>
    ipcRenderer.invoke('theme:shouldUseDarkColors'),

  // ==================== 本地音乐扫描 ====================

  /** 选择扫描目录 */
  selectScanDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('scan:selectDirectory'),

  /** 开始扫描 */
  startScan: (dirPath: string): Promise<ScanResult> =>
    ipcRenderer.invoke('scan:start', dirPath),

  /** 中止扫描 */
  abortScan: (): Promise<boolean> =>
    ipcRenderer.invoke('scan:abort'),

  /** 提取封面 */
  extractCover: (filePath: string): Promise<{ data: string; mimeType: string } | null> =>
    ipcRenderer.invoke('scan:extractCover', filePath),

  /** 计算文件校验和 */
  calculateChecksum: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('scan:calculateChecksum', filePath),

  /** 保存封面图片 */
  saveCover: (coverData: string, fileName: string): Promise<string | null> =>
    ipcRenderer.invoke('scan:saveCover', coverData, fileName),

  /** 监听扫描进度 */
  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => {
      callback(progress)
    }

    ipcRenderer.on('scan:progress', handler)

    return () => {
      ipcRenderer.removeListener('scan:progress', handler)
    }
  }
}

// 通过 contextBridge 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', api)

// Only expose electron API if context isolation is enabled
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error('[Preload] Failed to expose electron API:', error)
  }
}
