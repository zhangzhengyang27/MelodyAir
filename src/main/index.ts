import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  nativeTheme,
  screen
} from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import { createTouchBar, updateTouchBarLyrics, updateTouchBarPlayState, updateTouchBarLikeState } from "./touchBar"

// ==================== 类型定义 ====================

interface PlayerTrackInfo {
  title: string
  artist: string
  album: string
  cover?: string
  duration: number
  /** 播放状态（用于托盘菜单显示） */
  isPlaying?: boolean
}

interface TrayState {
  isPlaying: boolean
  currentTrack: PlayerTrackInfo | null
  liked: boolean
}

// ==================== 全局状态 ====================

let mainWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null
let lyricsWindow: BrowserWindow | null = null
let audioEngineWindow: BrowserWindow | null = null
let tray: Tray | null = null
let minimizeToTray = true
let globalShortcutsEnabled = true
let customShortcuts = {
  playPause: 'MediaPlayPause',
  prev: 'MediaPreviousTrack',
  next: 'MediaNextTrack',
}
/** 应用是否正在退出（用于区分关闭窗口和退出应用） */
let isQuittingApp = false

const trayState: TrayState = {
  isPlaying: false,
  currentTrack: null,
  liked: false
}

// ==================== 辅助函数（提前声明供其他函数使用）====================

/**
 * 发送播放器动作到渲染进程
 */
function sendPlayerAction(action: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("player:action", action)
  }
}

/**
 * 安全注册 IPC handler，自动捕获异常并记录日志
 * 避免渲染进程 invoke 时因未捕获异常导致进程崩溃
 */
function safeIpcHandle<T>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => T | Promise<T>
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args)
    } catch (error) {
      console.error(`[IPC] Handler "${channel}" failed:`, error)
      throw error
    }
  })
}

// ==================== 窗口管理 ====================

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 600,
    show: false,
    icon: join(__dirname, "../../build/icon.png"),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    backgroundColor: "#0a0a14",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  // 窗口准备好后显示（带动画效果）
  mainWindow.on("ready-to-show", () => {
    mainWindow!.show()
  })

  // Initialize Touch Bar for macOS
  if (process.platform === "darwin") {
    createTouchBar(mainWindow)
  }

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  // 关闭窗口时最小化到托盘
  mainWindow.on("close", (event) => {
    if (minimizeToTray && tray && !isQuittingApp) {
      event.preventDefault()
      mainWindow!.hide()
    }
  })

  // 加载页面
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  return mainWindow
}

/**
 * 创建迷你悬浮窗
 */
function createMiniWindow(): BrowserWindow {
  // 如果已存在，先关闭
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close()
  }

  miniWindow = new BrowserWindow({
    width: 320,
    height: 80,
    minWidth: 320,
    minHeight: 80,
    maxWidth: 400,
    maxHeight: 150,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  // 窗口准备好后显示
  miniWindow.on("ready-to-show", () => {
    miniWindow!.show()
  })

  // 加载迷你窗口页面
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    miniWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#/mini-player`)
  } else {
    miniWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "/mini-player"
    })
  }

  return miniWindow
}

/**
 * 关闭迷你悬浮窗
 */
function closeMiniWindow(): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close()
    miniWindow = null
  }
}

/**
 * 创建桌面歌词窗口
 */
function createLyricsWindow(): BrowserWindow {
  // 如果已存在，先关闭
  if (lyricsWindow && !lyricsWindow.isDestroyed()) {
    lyricsWindow.close()
  }

  lyricsWindow = new BrowserWindow({
    width: 600,
    height: 80,
    minWidth: 300,
    minHeight: 60,
    maxHeight: 120,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  // 设置默认位置：屏幕下方居中（任务栏/Dock 上方）
  const display = screen.getPrimaryDisplay()
  const workArea = display.workAreaSize
  const windowWidth = 600
  const windowHeight = 80
  const x = Math.floor((workArea.width - windowWidth) / 2)
  const y = workArea.height - windowHeight // 紧贴底部
  lyricsWindow.setPosition(x, y)

  // 窗口准备好后显示
  lyricsWindow.on("ready-to-show", () => {
    lyricsWindow!.show()
  })

  // 窗口加载完成后，主动推送当前歌曲和播放状态（解决后打开窗口收不到历史事件的问题）
  lyricsWindow.webContents.on("did-finish-load", () => {
    if (trayState.currentTrack) {
      lyricsWindow!.webContents.send("player:trackUpdated", trayState.currentTrack)
    }
    lyricsWindow!.webContents.send("player:playStateUpdated", trayState.isPlaying)
  })

  // 加载桌面歌词窗口页面
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    lyricsWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#/desktop-lyrics`)
  } else {
    lyricsWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: "/desktop-lyrics"
    })
  }

  return lyricsWindow
}

/**
 * 关闭桌面歌词窗口
 */
function closeLyricsWindow(): void {
  if (lyricsWindow && !lyricsWindow.isDestroyed()) {
    lyricsWindow.close()
    lyricsWindow = null
  }
}

/**
 * 创建隐藏的音频引擎窗口
 * 全局唯一的音频播放引擎，所有窗口通过 IPC 共享
 */
function createAudioEngineWindow(): void {
  if (audioEngineWindow && !audioEngineWindow.isDestroyed()) {
    return
  }

  audioEngineWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })

  // 加载音频引擎页面
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    audioEngineWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/audio-engine.html`)
  } else {
    audioEngineWindow.loadFile(join(__dirname, "../renderer/audio-engine.html"))
  }

  console.log("[AudioEngine] Window created")
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

  tray.setToolTip("Melody Air")

  // 单击显示窗口
  tray.on("click", () => {
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
  tray.on("double-click", () => mainWindow?.show())
}

/**
 * 创建托盘图标
 */
function createTrayIcon(): Electron.NativeImage {
  const iconPath = join(__dirname, "../../resources/icon.png")
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
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEUlEQVQ4y2Nk+M9Qz0BFoAgGFQAHoA0VCA3J0gAAAABJRU5ErkJggg==",
      "base64"
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
    ? `${trackInfo.isPlaying ? "▶" : "⏸"} ${trackInfo.title} - ${trackInfo.artist}`
    : "🎵 Melody Air"

  const contextMenuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: trackLabel.length > 40 ? trackLabel.substring(0, 37) + "..." : trackLabel,
      enabled: false
    },
    { type: "separator" },
    { label: "🎵 显示 Melody Air", click: () => mainWindow?.show() },
    { type: "separator" },
    {
      label: trayState.isPlaying ? "⏸ 暂停" : "▶ 播放",
      click: () => sendPlayerAction("toggle")
    },
    { label: "⏮ 上一首", click: () => sendPlayerAction("prev") },
    { label: "⏭ 下一首", click: () => sendPlayerAction("next") },
    { type: "separator" },
    {
      label: trayState.liked ? "❤️ 已喜欢" : "🤍 喜欢",
      click: () => sendPlayerAction("toggleLike")
    },
    { type: "separator" },
    { label: "退出应用", click: () => quitApp() }
  ]

  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate)
  tray.setContextMenu(contextMenu)

  // 更新工具提示
  if (trackInfo) {
    tray.setToolTip(
      `${trackInfo.title}\n${trackInfo.artist}\n${trackInfo.isPlaying ? "正在播放" : "已暂停"}`
    )
  } else {
    tray.setToolTip("Melody Air - 桌面音乐播放器")
  }
}

// ==================== 全局快捷键 ====================

/**
 * 注册全局媒体快捷键
 * 借鉴 YesPlayMusic 的快捷键设计
 */
function registerGlobalShortcuts(): void {
  if (!globalShortcutsEnabled) return

  globalShortcut.unregisterAll()

  const mappings: Array<[string, string]> = [
    [customShortcuts.playPause, 'toggle'],
    [customShortcuts.next, 'next'],
    [customShortcuts.prev, 'prev'],
  ]

  for (const [accelerator, action] of mappings) {
    try {
      globalShortcut.register(accelerator, () => sendPlayerAction(action))
    } catch {
      // ignore invalid shortcut
    }
  }
}

/**
 * 注销所有全局快捷键
 */
function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
}

/**
 * 退出应用
 */
function quitApp(): void {
  isQuittingApp = true

  // 注销快捷键
  unregisterGlobalShortcuts()

  // 销毁托盘
  if (tray) {
    tray.destroy()
    tray = null
  }

  app.quit()
}

// ==================== IPC 事件处理 ====================

/**
 * 注册所有 IPC 通信处理器
 * 借鉴 YesPlayMusic 的 IPC 设计模式
 */
function registerIpcHandlers(): void {
  // ========== 音频引擎 IPC 中转 ==========
  // 渲染进程 -> 音频引擎窗口 的命令转发
  const audioCommands = [
    'audio:play', 'audio:pause', 'audio:resume', 'audio:toggle',
    'audio:seek', 'audio:setVolume', 'audio:toggleMute',
    'audio:setPlaybackRate', 'audio:setEqualizerBand',
    'audio:setEqualizerBands', 'audio:setEqualizerEnabled', 'audio:stop'
  ]

  audioCommands.forEach((channel) => {
    ipcMain.on(channel, (_event, params) => {
      if (audioEngineWindow && !audioEngineWindow.isDestroyed()) {
        audioEngineWindow.webContents.send(channel, params)
      }
    })
  })

  // 音频引擎窗口 -> 所有窗口 的状态广播
  const audioStateEvents = [
    'audio:ready', 'audio:timeUpdate', 'audio:stateChange',
    'audio:ended', 'audio:error', 'audio:buffered', 'audio:frequencyData'
  ]

  audioStateEvents.forEach((channel) => {
    ipcMain.on(channel, (_event, data) => {
      // 广播到所有窗口（除了音频引擎窗口自己）
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win !== audioEngineWindow && !win.isDestroyed()) {
          win.webContents.send(channel, data)
        }
      })
    })
  })

  // ========== 窗口控制 ==========
  ipcMain.on("window:minimize", () => mainWindow?.minimize())

  ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.on("window:close", () => {
    if (minimizeToTray && tray) {
      mainWindow?.hide()
    } else {
      mainWindow?.close()
    }
  })

  safeIpcHandle("window:isMaximized", () => mainWindow?.isMaximized() ?? false)

  ipcMain.on("window:focus", () => mainWindow?.focus())

  // ========== 应用设置 ==========
  safeIpcHandle("app:setAutoLaunch", (_event, enable: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath("exe")
    })
    return true
  })

  safeIpcHandle("app:setMinimizeToTray", (_event, enable: boolean) => {
    minimizeToTray = enable
    return true
  })

  safeIpcHandle("app:setGlobalShortcuts", (_event, enabled: boolean) => {
    globalShortcutsEnabled = enabled
    if (enabled) {
      registerGlobalShortcuts()
    } else {
      unregisterGlobalShortcuts()
    }
    return true
  })

  safeIpcHandle("app:setCustomShortcuts", (_event, shortcuts: typeof customShortcuts) => {
    customShortcuts = { ...customShortcuts, ...shortcuts }
    if (globalShortcutsEnabled) {
      registerGlobalShortcuts()
    }
    return true
  })

  safeIpcHandle("app:getPlatform", () => process.platform)

  // ========== 迷你悬浮窗 ==========
  safeIpcHandle("miniWindow:open", () => {
    if (!miniWindow || miniWindow.isDestroyed()) {
      createMiniWindow()
    } else {
      miniWindow.show()
      miniWindow.focus()
    }
    return true
  })

  safeIpcHandle("miniWindow:close", () => {
    closeMiniWindow()
    return true
  })

  safeIpcHandle("miniWindow:isOpen", () => {
    return miniWindow !== null && !miniWindow.isDestroyed() && miniWindow.isVisible()
  })

  // ========== 桌面歌词窗口 ==========
  safeIpcHandle("lyricsWindow:open", () => {
    if (!lyricsWindow || lyricsWindow.isDestroyed()) {
      createLyricsWindow()
    } else {
      lyricsWindow.show()
      lyricsWindow.focus()
    }
    return true
  })

  safeIpcHandle("lyricsWindow:close", () => {
    closeLyricsWindow()
    return true
  })

  safeIpcHandle("lyricsWindow:isOpen", () => {
    return lyricsWindow !== null && !lyricsWindow.isDestroyed() && lyricsWindow.isVisible()
  })

  safeIpcHandle("lyricsWindow:setAlwaysOnTop", (_event, flag: boolean) => {
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.setAlwaysOnTop(flag)
      return true
    }
    return false
  })

  safeIpcHandle("lyricsWindow:setLocked", (_event, locked: boolean) => {
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.setIgnoreMouseEvents(locked, { forward: true })
      return true
    }
    return false
  })

  // 临时设置是否忽略鼠标事件（用于锁定状态下控制栏交互）
  safeIpcHandle("lyricsWindow:setIgnoreMouse", (_event, ignore: boolean) => {
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      if (ignore) {
        lyricsWindow.setIgnoreMouseEvents(true, { forward: true })
      } else {
        lyricsWindow.setIgnoreMouseEvents(false)
      }
      return true
    }
    return false
  })

  // ========== 播放器状态同步（渲染进程 -> 主进程）==========
  ipcMain.on("player:updateTrack", (_event, trackInfo: PlayerTrackInfo) => {
    trayState.currentTrack = trackInfo
    trayState.isPlaying = true
    updateTrayMenu()

    // 同步到迷你窗口
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send("player:trackUpdated", trackInfo)
    }

    // 同步到桌面歌词窗口
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.webContents.send("player:trackUpdated", trackInfo)
    }
  })

  ipcMain.on("player:updatePlayState", (_event, isPlaying: boolean) => {
    trayState.isPlaying = isPlaying
    updateTrayMenu()

    // Update Touch Bar
    if (process.platform === "darwin") {
      updateTouchBarPlayState(isPlaying)
    }

    // 同步到迷你窗口
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send("player:playStateUpdated", isPlaying)
    }

    // 同步到桌面歌词窗口
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.webContents.send("player:playStateUpdated", isPlaying)
    }
  })

  ipcMain.on("player:updateLikeState", (_event, liked: boolean) => {
    trayState.liked = liked
    updateTrayMenu()

    // Update Touch Bar
    if (process.platform === "darwin") {
      updateTouchBarLikeState(liked)
    }

    // 同步到迷你窗口
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send("player:likeStateUpdated", liked)
    }
  })

  ipcMain.on("player:updateProgress", (_event, progress: number) => {
    // 同步到迷你窗口
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send("player:progressUpdated", progress)
    }

    // 同步到桌面歌词窗口
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.webContents.send("player:progressUpdated", progress)
    }
  })

  // ========== Touch Bar 歌词同步 ==========
  ipcMain.on("player:updateLyrics", (_event, data: { currentText: string; hasLyrics: boolean }) => {
    if (process.platform === "darwin") {
      updateTouchBarLyrics(data.currentText, data.hasLyrics)
    }

    // 同步到桌面歌词窗口
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.webContents.send("lyrics:update", data)
    }
  })

  // ========== 主题同步 ==========
  ipcMain.on("theme:setDarkMode", (_event, isDark: boolean) => {
    nativeTheme.themeSource = isDark ? "dark" : "light"
  })

  safeIpcHandle("theme:shouldUseDarkColors", () => nativeTheme.shouldUseDarkColors)


}

// ==================== 应用生命周期 ====================

// 禁用安全警告
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

app.whenReady().then(() => {
  // 设置应用 ID（用于 Windows 跳转列表等）
  electronApp.setAppUserModelId("com.melody-air.app")

  // 监听窗口创建事件以优化性能
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
    // [TEMP-DEBUG] 转发所有窗口 console 到主进程 stdout（诊断播放结束问题用，诊断后删除）
    window.webContents.on("console-message" as any, (...cbArgs: any[]) => {
      try {
        const first = cbArgs[0]
        let text: string
        if (first && typeof first === "object" && "message" in first) {
          text = String(first.message)
        } else {
          text = String(cbArgs[2] ?? "")
        }
        const shortUrl = String(window.webContents.getURL()).split("/").pop() || "?"
        console.log(`[CONSOLE][${shortUrl}] ${text.slice(0, 300)}`)
      } catch {
        // 忽略转发失败
      }
    })
  })

  // 初始化核心模块
  createAudioEngineWindow()
  registerIpcHandlers()
  createWindow()
  createTray()
  registerGlobalShortcuts()

  // macOS 特殊行为：点击 dock 图标重新激活
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

// 所有窗口关闭时退出（macOS 除外）
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// 应用退出前清理
app.on("before-quit", () => {
  isQuittingApp = true
  unregisterGlobalShortcuts()
  closeMiniWindow()
  closeLyricsWindow()
})

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}
