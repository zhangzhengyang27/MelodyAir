import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

  /** 打开/关闭主窗口的 DevTools */
  openDevTools: () => ipcRenderer.send('open-devtools'),

  /** 唤起主窗口（子窗口使用，最小化/隐藏到托盘时也能拉回） */
  windowShowMain: () => ipcRenderer.send('window:showMain'),

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
   * 发送播放器控制动作到主窗口（迷你播放器等子窗口使用）
   * 协议：toggle | prev | next | toggleLike | toggleMute | seek:<秒> | volume:<0~1>
   */
  sendPlayerAction: (action: string) => ipcRenderer.send('player:action', action),

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

  /** 监听收藏状态更新（主窗口 -> 其他窗口） */
  onLikeStateUpdated: (callback: (liked: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, liked: boolean) => callback(liked)
    ipcRenderer.on('player:likeStateUpdated', handler)
    return () => {
      ipcRenderer.removeListener('player:likeStateUpdated', handler)
    }
  },

  /** 监听播放进度更新（单位：秒） */
  onProgressUpdated: (callback: (currentTime: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, currentTime: number) => callback(currentTime)
    ipcRenderer.on('player:progressUpdated', handler)
    return () => {
      ipcRenderer.removeListener('player:progressUpdated', handler)
    }
  },

  /** 监听音量/静音状态更新 */
  onVolumeUpdated: (callback: (data: { volume: number; muted: boolean }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { volume: number; muted: boolean }) => callback(data)
    ipcRenderer.on('player:volumeUpdated', handler)
    return () => {
      ipcRenderer.removeListener('player:volumeUpdated', handler)
    }
  },

  /** 监听桌面歌词更新（含译文与逐字时间轴） */
  onLyricsUpdated: (
    callback: (data: {
      currentText: string
      translation?: string
      prevText?: string
      nextText?: string
      hasLyrics: boolean
      lineTime?: number
      words?: Array<{ time: number; text: string }>
    }) => void
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: {
      currentText: string
      translation?: string
      prevText?: string
      nextText?: string
      hasLyrics: boolean
      lineTime?: number
      words?: Array<{ time: number; text: string }>
    }) => callback(data)
    ipcRenderer.on('lyrics:update', handler)
    return () => {
      ipcRenderer.removeListener('lyrics:update', handler)
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
  /** 设置淡入淡出时长（毫秒） */
  audioSetFadeDuration: (ms: number) => ipcRenderer.send('audio:setFadeDuration', { ms }),
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

  /** 读取桌面歌词偏好（锁定 / 字号 / 置顶 / 译文） */
  getLyricsWindowPrefs: (): Promise<{
    locked: boolean
    fontSize: number
    alwaysOnTop: boolean
    showTranslation: boolean
  }> => ipcRenderer.invoke('lyricsWindow:getPrefs'),

  /** 写入桌面歌词偏好（增量合并，持久化到主进程） */
  setLyricsWindowPrefs: (patch: {
    locked?: boolean
    fontSize?: number
    alwaysOnTop?: boolean
    showTranslation?: boolean
  }): Promise<boolean> => ipcRenderer.invoke('lyricsWindow:setPrefs', patch),

  // ==================== 应用更新 ====================

  /** 手动触发一次更新检查（Windows 检查 electron-updater，macOS 检测 GitHub 最新版） */
  checkForUpdates: (): Promise<boolean> =>
    ipcRenderer.invoke('update:check-now'),

  /** 开始下载更新（Windows） */
  downloadUpdate: (): Promise<boolean> =>
    ipcRenderer.invoke('update:download'),

  /** 下载完成后安装并重启（Windows） */
  installUpdate: (): Promise<boolean> =>
    ipcRenderer.invoke('update:install'),

  /** 打开 GitHub Releases 页面 */
  openReleases: (): Promise<boolean> =>
    ipcRenderer.invoke('update:open-releases'),

  /** 监听：发现可用更新（Windows electron-updater） */
  onUpdateAvailable: (callback: (info: { version: string; currentVersion: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string; currentVersion: string }) => callback(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },

  /** 监听：下载进度 */
  onUpdateDownloadProgress: (callback: (data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => callback(data)
    ipcRenderer.on('update:download-progress', handler)
    return () => ipcRenderer.removeListener('update:download-progress', handler)
  },

  /** 监听：下载完成 */
  onUpdateDownloaded: (callback: (info: { version: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },

  /** 监听：macOS 发现新版本（提示去 GitHub 下载） */
  onMacUpdateAvailable: (callback: (info: { version: string; currentVersion: string; downloadUrl: string; releasesUrl: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string; currentVersion: string; downloadUrl: string; releasesUrl: string }) => callback(info)
    ipcRenderer.on('update:mac-available', handler)
    return () => ipcRenderer.removeListener('update:mac-available', handler)
  },

  /** 监听：更新过程状态（checking / not-available） */
  onUpdateStatus: (callback: (data: { state: string; version?: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { state: string; version?: string }) => callback(data)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },

  /** 监听：更新出错 */
  onUpdateError: (callback: (data: { message: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { message: string }) => callback(data)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },

  // ==================== 主题同步 ====================

  /** 向主进程同步暗色模式设置 */
  setDarkMode: (isDark: boolean) => {
    ipcRenderer.send('theme:setDarkMode', isDark)
  },

  /** 获取系统是否应该使用深色颜色 */
  shouldUseDarkColors: (): Promise<boolean> =>
    ipcRenderer.invoke('theme:shouldUseDarkColors'),
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
