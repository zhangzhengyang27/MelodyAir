import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  nativeTheme
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// ==================== 类型定义 ====================

interface PlayerTrackInfo {
  title: string
  artist: string
  album: string
  cover?: string
  duration: number
}

interface TrayState {
  isPlaying: boolean
  currentTrack: PlayerTrackInfo | null
  liked: boolean
}

// ==================== 全局状态 ====================

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let minimizeToTray = true
let globalShortcutsEnabled = true

const trayState: TrayState = {
  isPlaying: false,
  currentTrack: null,
  liked: false
}

app.isQuitting = false

// ==================== 窗口管理 ====================

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#0a0a14',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'script-src': ["'self'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'", "http://localhost:*", "https://*"],
        'media-src': ["'self'", "https:", "blob:"]
      }
    }
  })

  // 窗口准备好后显示（带动画效果）
  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 关闭窗口时最小化到托盘
  mainWindow.on('close', (event) => {
    if (minimizeToTray && tray && !app.isQuitting) {
      event.preventDefault()
      mainWindow!.hide()
    }
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// ==================== 系统托盘 ====================

/**
 * 创建系统托盘图标和上下文菜单
 */
function createTray(): void {
  // 创建或加载图标
  const icon = createTrayIcon()

  tray = new Tray(icon)
  updateTrayMenu()

  tray.setToolTip('Melody Air')

  // 单击显示窗口
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  // 双击显示并聚焦窗口
  tray.on('double-click', () => mainWindow?.show())
}

/**
 * 创建托盘图标
 */
function createTrayIcon(): Electron.NativeImage {
  const iconPath = join(__dirname, '../../resources/icon.png')
  let icon: Electron.NativeImage

  try {
    icon = nativeImage.createFromPath(iconPath)
    if (!icon.isEmpty() && icon.getSize().width > 0) {
      return icon.resize({ width: 16, height: 16 })
    }
  } catch {
    // 忽略错误，使用备用方案
  }

  // 备用：使用内嵌的简单图标
  return nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEUlEQVQ4y2Nk+M9Qz0BFoAgGFQAHoA0VCA3J0gAAAABJRU5ErkJggg==',
      'base64'
    )
  )
}

/**
 * 更新托盘菜单（根据播放状态动态生成）
 */
function updateTrayMenu(): void {
  if (!tray) return

  const trackInfo = trayState.currentTrack
  const trackLabel = trackInfo
    ? `${trackInfo.isPlaying ? '▶' : '⏸'} ${trackInfo.title} - ${trackInfo.artist}`
    : '🎵 Melody Air'

  const contextMenuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: trackLabel.length > 40 ? trackLabel.substring(0, 37) + '...' : trackLabel,
      enabled: false
    },
    { type: 'separator' },
    { label: '🎵 显示 Melody Air', click: () => mainWindow?.show() },
    { type: 'separator' },
    {
      label: trayState.isPlaying ? '⏸ 暂停' : '▶ 播放',
      click: () => sendPlayerAction('toggle')
    },
    { label: '⏮ 上一首', click: () => sendPlayerAction('prev') },
    { label: '⏭ 下一首', click: () => sendPlayerAction('next') },
    { type: 'separator' },
    {
      label: trayState.liked ? '❤️ 已喜欢' : '🤍 喜欢',
      click: () => sendPlayerAction('toggleLike')
    },
    { type: 'separator' },
    { label: '退出应用', click: () => quitApp() }
  ]

  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate)
  tray.setContextMenu(contextMenu)

  // 更新工具提示
  if (trackInfo) {
    tray.setToolTip(
      `${trackInfo.title}\n${trackInfo.artist}\n${trackInfo.isPlaying ? '正在播放' : '已暂停'}`
    )
  } else {
    tray.setToolTip('Melody Air - 桌面音乐播放器')
  }
}

// ==================== 全局快捷键 ====================

/**
 * 注册全局媒体快捷键
 * 借鉴 YesPlayMusic 的快捷键设计
 */
function registerGlobalShortcuts(): void {
  if (!globalShortcutsEnabled) return

  // 清除已注册的快捷键（防止重复注册）
  globalShortcut.unregisterAll()

  try {
    // 媒体键：播放/暂停
    globalShortcut.register('MediaPlayPause', () => sendPlayerAction('toggle'))
  } catch (e) {
    console.error('[GlobalShortcut] Failed to register MediaPlayPause:', e)
  }

  try {
    // 媒体键：下一首
    globalShortcut.register('MediaNextTrack', () => sendPlayerAction('next'))
  } catch (e) {
    console.error('[GlobalShortcut] Failed to register MediaNextTrack:', e)
  }

  try {
    // 媒体键：上一首
    globalShortcut.register('MediaPreviousTrack', () => sendPlayerAction('prev'))
  } catch (e) {
    console.error('[GlobalShortcut] Failed to register MediaPreviousTrack:', e)
  }

  try {
    // 自定义快捷键：空格键播放/暂停（仅当窗口有焦点时不触发）
    // 注意：这里不注册空格键，因为会与输入框冲突
    // 仅注册媒体键
  } catch (e) {
    console.error('[GlobalShortcut] Failed to register custom shortcuts:', e)
  }

  console.log('[GlobalShortcut] Global shortcuts registered successfully')
}

/**
 * 注销所有全局快捷键
 */
function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
  console.log('[GlobalShortcut] Global shortcuts unregistered')
}

// ==================== IPC 事件处理 ====================

/**
 * 注册所有 IPC 通信处理器
 * 借鉴 YesPlayMusic 的 IPC 设计模式
 */
function registerIpcHandlers(): void {
  // ========== 窗口控制 ==========
  ipcMain.on('window:minimize', () => mainWindow?.minimize())

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.on('window:close', () => {
    if (minimizeToTray && tray) {
      mainWindow?.hide()
    } else {
      mainWindow?.close()
    }
  })

  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

  ipcMain.on('window:focus', () => mainWindow?.focus())

  // ========== 应用设置 ==========
  ipcMain.handle('app:setAutoLaunch', (_event, enable: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe')
    })
    return true
  })

  ipcMain.handle('app:setMinimizeToTray', (_event, enable: boolean) => {
    minimizeToTray = enable
    return true
  })

  ipcMain.handle('app:setGlobalShortcuts', (_event, enabled: boolean) => {
    globalShortcutsEnabled = enabled
    if (enabled) {
      registerGlobalShortcuts()
    } else {
      unregisterGlobalShortcuts()
    }
    return true
  })

  ipcMain.handle('app:getPlatform', () => process.platform)

  // ========== 播放器状态同步（渲染进程 -> 主进程）==========
  ipcMain.on('player:updateTrack', (_event, trackInfo: PlayerTrackInfo) => {
    trayState.currentTrack = trackInfo
    trayState.isPlaying = true
    updateTrayMenu()

    // 更新任务栏进度（Windows）或 Dock 图标（macOS）
    updateTaskbarProgress(trackInfo.duration, 0)
  })

  ipcMain.on('player:updatePlayState', (_event, isPlaying: boolean) => {
    trayState.isPlaying = isPlaying
    updateTrayMenu()
  })

  ipcMain.on('player:updateLikeState', (_event, liked: boolean) => {
    trayState.liked = liked
    updateTrayMenu()
  })

  ipcMain.on('player:updateProgress', (_event, progress: number) => {
    if (trayState.currentTrack) {
      updateTaskbarProgress(trayState.currentTrack.duration, progress)
    }
  })

  // ========== 主题同步 ==========
  ipcMain.on('theme:setDarkMode', (_event, isDark: boolean) => {
    nativeTheme.themeSource = isDark ? 'dark' : 'light'
  })

  ipcMain.handle('theme:shouldUseDarkColors', () => nativeTheme.shouldUseDarkColors)

  console.log('[IPC] All handlers registered successfully')
}

/**
 * 发送播放器动作到渲染进程
 */
function sendPlayerAction(action: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player:action', action)
  }
}

/**
 * 更新任务栏/Dock 进度条
 * 支持 Windows 任务栏和 macOS Dock
 */
function updateTaskbarProgress(duration: number, currentTime: number): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const progress = duration > 0 ? currentTime / duration : 0

  // Windows 任务栏进度
  mainWindow.setProgressBar(progress === -1 ? -1 : progress)

  // macOS 不支持直接设置 Dock 进度，但可以设置 Badge
  if (process.platform === 'darwin' && progress >= 0 && progress < 1) {
    // 可选：在 Dock 显示播放状态图标
  }
}

// ==================== 辅助函数 ====================

/**
 * 退出应用
 */
function quitApp(): void {
  app.isQuitting = true

  // 注销快捷键
  unregisterGlobalShortcuts()

  // 销毁托盘
  if (tray) {
    tray.destroy()
    tray = null
  }

  app.quit()
}

// ==================== 应用生命周期 ====================

app.whenReady().then(() => {
  // 设置应用 ID（用于 Windows 跳转列表等）
  electronApp.setAppUserModelId('com.melody-air.app')

  // 监听窗口创建事件以优化性能
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化核心模块
  registerIpcHandlers()
  createWindow()
  createTray()
  registerGlobalShortcuts()

  // macOS 特殊行为：点击 dock 图标重新激活
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  app.isQuitting = true
  unregisterGlobalShortcuts()
})

// 防止多实例运行（可选）
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // 当第二个实例启动时，将焦点移到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}
