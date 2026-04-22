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

  // ==================== 播放器通信 ====================

  /**
   * 发送播放器状态更新到主进程（用于更新托盘、任务栏等）
   */
  sendIpcEvent: (channel: string, data?: unknown) => {
    // 白名单机制：只允许发送特定的频道
    const allowedChannels = [
      'player:updateTrack',
      'player:updatePlayState',
      'player:updateLikeState',
      'player:updateProgress'
    ]

    if (allowedChannels.includes(channel)) {
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

  // ==================== 主题同步 ====================

  /** 向主进程同步暗色模式设置 */
  setDarkMode: (isDark: boolean) => {
    ipcRenderer.send('theme:setDarkMode', isDark)
  },

  /** 获取系统是否应该使用深色颜色 */
  shouldUseDarkColors: (): Promise<boolean> =>
    ipcRenderer.invoke('theme:shouldUseDarkColors')
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
