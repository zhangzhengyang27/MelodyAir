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
import { existsSync, readFileSync, writeFileSync } from "fs"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import { createTouchBar, updateTouchBarLyrics, updateTouchBarPlayState, updateTouchBarLikeState } from "./touchBar"
import { initUpdater } from "./updater"

/**
 * 置顶层级：macOS 用 screen-saver 可盖住全屏应用；其它平台退化为 pop-up-menu。
 * 直接用字符串字面量类型，避免依赖 Electron 版本间不稳定的 AlwaysOnTopLevel 导出。
 */
type AlwaysOnTopLevel =
  | 'normal' | 'floating' | 'torn-off-menu' | 'modal-panel'
  | 'main-menu' | 'status' | 'pop-up-menu' | 'screen-saver'

const ALWAYS_ON_TOP_LEVEL: AlwaysOnTopLevel =
  process.platform === "darwin" ? "screen-saver" : "pop-up-menu"

// ==================== 类型定义 ====================

interface PlayerTrackInfo {
  title: string
  artist: string
  album: string
  cover?: string
  /** 时长，单位：秒（与 audio:timeUpdate 的 currentTime 保持一致） */
  duration: number
  /** 播放状态（用于托盘菜单显示） */
  isPlaying?: boolean
}

/** 逐字歌词单元，time 为相对歌曲开头的绝对毫秒 */
interface LyricWord {
  time: number
  text: string
}

/**
 * 歌词同步载荷
 * 相比只推一行文本，额外带上译文与逐字时间轴，
 * 使桌面歌词窗口可以本地做双行展示和逐字进度，无需回查主窗口。
 */
interface LyricPayload {
  currentText: string
  translation?: string
  prevText?: string
  nextText?: string
  hasLyrics: boolean
  /** 当前行起始时间（毫秒） */
  lineTime?: number
  /** 逐字时间轴（毫秒） */
  words?: LyricWord[]
}

interface TrayState {
  isPlaying: boolean
  currentTrack: PlayerTrackInfo | null
  liked: boolean
  /** 音量 0~1 */
  volume: number
  muted: boolean
  /** 最近一次歌词（新开窗口时用于补齐历史状态） */
  lyric: LyricPayload | null
  /** 最近一次播放进度（秒） */
  progress: number
}

// ---------- 窗口持久化 ----------

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface LyricsPrefs {
  /** 锁定（鼠标穿透 / 禁止拖动） */
  locked: boolean
  /** 歌词字号（px） */
  fontSize: number
  /** 是否置顶 */
  alwaysOnTop: boolean
  /** 是否显示译文 */
  showTranslation: boolean
}

interface WindowStateFile {
  /** 布局版本号：桌面歌词的排版/默认尺寸调整后需递增，用于丢弃旧版失效的 bounds */
  version?: number
  lyrics?: { bounds?: WindowBounds } & Partial<LyricsPrefs>
  mini?: { bounds?: WindowBounds }
}

/**
 * 布局版本。桌面歌词改版（如高度从 160 压到 120）后递增此值，
 * 否则用户磁盘上残留的旧 bounds 会让新排版直接失效，用户只能手动拖窗口。
 * 注意：只丢弃 bounds，歌词偏好（字号/锁定/置顶/译文）仍然保留。
 */
const WINDOW_STATE_VERSION = 3

// ==================== 全局状态 ====================

let mainWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null
let lyricsWindow: BrowserWindow | null = null
let audioEngineWindow: BrowserWindow | null = null
let tray: Tray | null = null

// 音频引擎窗口页面是否已完成加载（audio-engine.ts 初始化后会发 audio:ready）。
// 页面未加载完成时 webContents.send 会被静默丢弃，导致启动阶段下发的
// 音量 / 倍速 / 淡入淡出等命令丢失，因此就绪前先缓存命令。
let audioEngineReady = false
const pendingAudioCommands: Array<{ channel: string; params: unknown }> = []
const MAX_PENDING_AUDIO_COMMANDS = 32
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
  liked: false,
  volume: 1,
  muted: false,
  lyric: null,
  progress: 0
}

/** 窗口位置 / 歌词偏好（持久化到 userData/window-state.json） */
let windowState: WindowStateFile = {}
let windowStateSaveTimer: NodeJS.Timeout | null = null

// ==================== 辅助函数（提前声明供其他函数使用）====================

/**
 * 发送播放器动作到渲染进程
 */
function sendPlayerAction(action: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("player:action", action)
  }
}

// ==================== 窗口状态持久化 ====================

function getWindowStatePath(): string {
  return join(app.getPath("userData"), "window-state.json")
}

function loadWindowState(): WindowStateFile {
  try {
    const filePath = getWindowStatePath()
    if (existsSync(filePath)) {
      const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as WindowStateFile
      // 布局版本不匹配：丢弃失效的 bounds，保留歌词偏好
      if (parsed.version !== WINDOW_STATE_VERSION) {
        return {
          version: WINDOW_STATE_VERSION,
          lyrics: parsed.lyrics ? { ...parsed.lyrics, bounds: undefined } : undefined,
          mini: parsed.mini ? { ...parsed.mini, bounds: undefined } : undefined,
        }
      }
      return parsed
    }
  } catch (error) {
    console.error("[WindowState] load failed:", error)
  }
  return { version: WINDOW_STATE_VERSION }
}

function saveWindowState(immediate = false): void {
  if (windowStateSaveTimer) {
    clearTimeout(windowStateSaveTimer)
    windowStateSaveTimer = null
  }
  const doSave = (): void => {
    windowStateSaveTimer = null
    try {
      const payload: WindowStateFile = { ...windowState, version: WINDOW_STATE_VERSION }
      writeFileSync(getWindowStatePath(), JSON.stringify(payload, null, 2), "utf-8")
    } catch (error) {
      console.error("[WindowState] save failed:", error)
    }
  }
  if (immediate) doSave()
  else windowStateSaveTimer = setTimeout(doSave, 400)
}

/**
 * 判断历史 bounds 是否仍落在某块屏幕的可视区域内。
 * 避免拔掉外接显示器后窗口被还原到屏幕外而无法找回。
 */
function isBoundsVisible(bounds: WindowBounds): boolean {
  return screen.getAllDisplays().some((d) => {
    const area = d.workArea
    return (
      bounds.x + bounds.width > area.x + 40 &&
      bounds.x < area.x + area.width - 40 &&
      bounds.y + bounds.height > area.y + 20 &&
      bounds.y < area.y + area.height - 20
    )
  })
}

/**
 * 默认位置：跟随主窗口所在屏幕，底部居中（主窗口不可用时退化为第一块屏）。
 * 使用 display.workArea（含原点坐标）而非 workAreaSize，避免非主屏坐标偏移。
 */
function defaultBottomBounds(width: number, height: number, margin = 8): WindowBounds {
  const display =
    mainWindow && !mainWindow.isDestroyed()
      ? screen.getDisplayMatching(mainWindow.getBounds())
      : screen.getPrimaryDisplay()
  const area = display.workArea
  return {
    x: Math.floor(area.x + (area.width - width) / 2),
    y: Math.floor(area.y + area.height - height - margin),
    width,
    height,
  }
}

/** 取历史 bounds，不可用时回退到默认底部居中 */
function resolveBounds(
  key: "lyrics" | "mini",
  defaultWidth: number,
  defaultHeight: number
): WindowBounds {
  const saved = windowState[key]?.bounds
  if (saved && isBoundsVisible(saved)) return saved
  return defaultBottomBounds(defaultWidth, defaultHeight)
}

/** 监听移动/缩放，自动写回磁盘 */
function persistBounds(win: BrowserWindow, key: "lyrics" | "mini"): void {
  const handler = (): void => {
    if (win.isDestroyed()) return
    windowState[key] = { ...(windowState[key] ?? {}), bounds: win.getBounds() }
    saveWindowState()
  }
  win.on("moved", handler)
  win.on("resized", handler)
}

/**
 * 把缓存的播放状态一次性推送给指定窗口。
 * 子窗口是后打开的，收不到之前已经发生过的 track/lyric/state 事件，
 * 必须在 did-finish-load 时补齐，否则要等到下一次状态变化才显示。
 */
function pushPlayerStateToWindow(
  win: BrowserWindow | null,
  options: { includeLyrics?: boolean } = {},
): void {
  if (!win || win.isDestroyed()) return

  if (trayState.currentTrack) {
    win.webContents.send("player:trackUpdated", trayState.currentTrack)
  }
  win.webContents.send("player:playStateUpdated", trayState.isPlaying)
  win.webContents.send("player:likeStateUpdated", trayState.liked)
  win.webContents.send("player:volumeUpdated", {
    volume: trayState.volume,
    muted: trayState.muted,
  })
  win.webContents.send("player:progressUpdated", trayState.progress)

  if (options.includeLyrics && trayState.lyric) {
    win.webContents.send("lyrics:update", trayState.lyric)
  }
}

/**
 * 应用桌面歌词锁定状态。
 * macOS 使用鼠标穿透（forward: true 让 mousemove 仍能到达渲染层，从而可以临时解锁）；
 * 其它平台不做穿透，仅靠渲染层的 CSS 禁用拖拽，保证解锁按钮始终可点。
 */
function applyLyricsLock(locked: boolean): void {
  if (!lyricsWindow || lyricsWindow.isDestroyed()) return
  if (process.platform === "darwin") {
    lyricsWindow.setIgnoreMouseEvents(locked, { forward: true })
  } else {
    lyricsWindow.setIgnoreMouseEvents(false)
  }
}

/** 把播放状态广播到迷你窗口和桌面歌词窗口 */
function broadcastToSecondaryWindows(channel: string, payload: unknown): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send(channel, payload)
  }
  if (lyricsWindow && !lyricsWindow.isDestroyed()) {
    lyricsWindow.webContents.send(channel, payload)
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
const MINI_DEFAULT_WIDTH = 340
// 内容高度 = 96(封面) + 12*2(padding) = 120，再留 4px 余量避免 overflow 裁切
const MINI_DEFAULT_HEIGHT = 124

function createMiniWindow(): BrowserWindow {
  // 如果已存在，先关闭
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close()
  }

  const bounds = resolveBounds("mini", MINI_DEFAULT_WIDTH, MINI_DEFAULT_HEIGHT)

  miniWindow = new BrowserWindow({
    ...bounds,
    minWidth: 300,
    minHeight: MINI_DEFAULT_HEIGHT,
    maxWidth: 520,
    maxHeight: 220,
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

  // 固定置顶层级，避免全屏应用盖住悬浮窗
  miniWindow.setAlwaysOnTop(true, ALWAYS_ON_TOP_LEVEL)
  persistBounds(miniWindow, "mini")

  // 窗口准备好后显示
  miniWindow.on("ready-to-show", () => {
    miniWindow!.show()
  })

  // 窗口销毁时清理引用，避免 isDestroyed() 之前读到野指针
  miniWindow.on("closed", () => {
    miniWindow = null
  })

  // 页面加载完成后补齐当前播放状态（后打开的窗口收不到历史事件）
  miniWindow.webContents.on("did-finish-load", () => {
    pushPlayerStateToWindow(miniWindow)
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

/** 切换迷你悬浮窗（托盘菜单 / 全局入口复用） */
function toggleMiniWindow(): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    closeMiniWindow()
  } else {
    createMiniWindow()
  }
  updateTrayMenu()
}

/**
 * 创建桌面歌词窗口
 */
// 默认给足宽度：歌词单行不换行，窄了会截断
// 高度按「上一句 + 当前句 + 译文」在默认字号 24 下的实测内容高度取紧凑值
const LYRICS_DEFAULT_WIDTH = 880
const LYRICS_DEFAULT_HEIGHT = 104

function createLyricsWindow(): BrowserWindow {
  // 如果已存在，先关闭
  if (lyricsWindow && !lyricsWindow.isDestroyed()) {
    lyricsWindow.close()
  }

  const prefs = windowState.lyrics ?? {}
  const bounds = resolveBounds("lyrics", LYRICS_DEFAULT_WIDTH, LYRICS_DEFAULT_HEIGHT)

  lyricsWindow = new BrowserWindow({
    ...bounds,
    minWidth: 300,
    minHeight: 70,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: prefs.alwaysOnTop ?? true,
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

  // 固定置顶层级，避免全屏应用盖住桌面歌词
  lyricsWindow.setAlwaysOnTop(prefs.alwaysOnTop ?? true, ALWAYS_ON_TOP_LEVEL)
  persistBounds(lyricsWindow, "lyrics")

  // 窗口准备好后显示
  lyricsWindow.on("ready-to-show", () => {
    lyricsWindow!.show()
  })

  // 窗口销毁时清理引用
  lyricsWindow.on("closed", () => {
    lyricsWindow = null
  })

  // 窗口加载完成后，主动推送完整播放状态（解决后打开窗口收不到历史事件的问题）
  lyricsWindow.webContents.on("did-finish-load", () => {
    pushPlayerStateToWindow(lyricsWindow, { includeLyrics: true })
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

/** 切换桌面歌词窗口（托盘菜单 / 渲染层入口复用） */
function toggleLyricsWindow(): void {
  if (lyricsWindow && !lyricsWindow.isDestroyed()) {
    closeLyricsWindow()
  } else {
    createLyricsWindow()
  }
  updateTrayMenu()
}

/**
 * 创建隐藏的音频引擎窗口
 * 全局唯一的音频播放引擎，所有窗口通过 IPC 共享
 */
function createAudioEngineWindow(): void {
  if (audioEngineWindow && !audioEngineWindow.isDestroyed()) {
    return
  }

  // 新窗口意味着页面要重新加载，就绪状态与缓存命令都要重置
  audioEngineReady = false
  pendingAudioCommands.length = 0

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

  // 页面重新加载（崩溃恢复、手动 reload）期间命令同样会丢失，重置就绪状态重新走缓存流程
  audioEngineWindow.webContents.on("did-start-loading", () => {
    audioEngineReady = false
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
    {
      label: lyricsWindow && !lyricsWindow.isDestroyed() ? "✅ 关闭桌面歌词" : "💬 桌面歌词",
      click: () => toggleLyricsWindow()
    },
    {
      label: miniWindow && !miniWindow.isDestroyed() ? "✅ 关闭迷你播放器" : "🪟 迷你播放器",
      click: () => toggleMiniWindow()
    },
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
 * 向音频引擎窗口转发单条命令
 * 窗口已销毁时直接丢弃，避免向无效 webContents 发送
 */
function forwardAudioCommand(channel: string, params: unknown): void {
  if (audioEngineWindow && !audioEngineWindow.isDestroyed()) {
    audioEngineWindow.webContents.send(channel, params)
  }
}

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
    'audio:setPlaybackRate', 'audio:setFadeDuration', 'audio:stop'
  ]

  audioCommands.forEach((channel) => {
    ipcMain.on(channel, (_event, params) => {
      // 引擎未就绪时先缓存，等 audio:ready 后按原始顺序补发，
      // 顺序补发能保证最终状态正确（例如 play → pause 依次补发后仍是 pause）。
      if (!audioEngineReady) {
        if (pendingAudioCommands.length < MAX_PENDING_AUDIO_COMMANDS) {
          pendingAudioCommands.push({ channel, params })
        }
        return
      }
      forwardAudioCommand(channel, params)
    })
  })

  // 音频引擎页面加载完成：标记就绪、补发缓存命令、清空队列
  ipcMain.on('audio:ready', () => {
    audioEngineReady = true
    const queued = pendingAudioCommands.splice(0)
    queued.forEach(({ channel, params }) => forwardAudioCommand(channel, params))
  })

  // 音频引擎窗口 -> 主窗口 的状态广播
  const audioStateEvents = [
    'audio:ready', 'audio:timeUpdate', 'audio:stateChange',
    'audio:ended', 'audio:error', 'audio:buffered', 'audio:frequencyData'
  ]

  audioStateEvents.forEach((channel) => {
    ipcMain.on(channel, (_event, data) => {
      // 只推给主窗口。
      // 子窗口（桌面歌词 / 迷你播放器）是独立 BrowserWindow，各自有独立的 Pinia 实例，
      // 若也收到 timeUpdate，会用自己那份空的歌词状态反向广播 player:updateLyrics，
      // 与主窗口的真实状态交替覆盖，导致桌面歌词持续闪烁。
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data)
      }
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

  // 打开主窗口的 DevTools（设置页「开发者工具」入口）
  ipcMain.on("open-devtools", () => {
    const win = mainWindow
    if (!win || win.isDestroyed()) return
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools()
    } else {
      win.webContents.openDevTools({ mode: "detach" })
    }
  })

  // 从子窗口（迷你播放器）唤起主窗口
  ipcMain.on("window:showMain", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow()
      return
    }
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  // ========== 播放器动作（子窗口 -> 主窗口）==========
  // 迷你播放器 / 其它子窗口的控制指令经主进程中转给主窗口的 player store。
  // 协议沿用字符串：toggle | prev | next | toggleLike | toggleMute | seek:<秒> | volume:<0~1>
  ipcMain.on("player:action", (_event, action: string) => {
    if (typeof action !== "string" || !action) return
    sendPlayerAction(action)
  })

  // 子窗口启动后主动拉取一次全量播放状态（比 did-finish-load 推送更可靠，
  // 因为渲染层要等 Pinia 初始化完成才注册好监听）
  ipcMain.on("player:requestState", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    pushPlayerStateToWindow(win, { includeLyrics: true })
  })

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
      // 页面仍在加载时不要提前 show，否则会闪出一个空白窗口
      if (!miniWindow.webContents.isLoading()) {
        miniWindow.show()
        miniWindow.focus()
      }
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
      // 页面仍在加载时不要提前 show，否则会闪出一个空白窗口
      if (!lyricsWindow.webContents.isLoading()) {
        lyricsWindow.show()
        lyricsWindow.focus()
      }
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
    windowState.lyrics = { ...(windowState.lyrics ?? {}), alwaysOnTop: flag }
    saveWindowState(true)
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.setAlwaysOnTop(flag, ALWAYS_ON_TOP_LEVEL)
      return true
    }
    // 窗口未创建时也记录偏好，下次 createLyricsWindow 生效
    return true
  })

  /**
   * 锁定桌面歌词。
   * setIgnoreMouseEvents 的 forward 选项只在 macOS 生效，
   * Windows/Linux 下窗口会彻底收不到鼠标事件，导致用户永远点不到解锁按钮。
   * 因此非 macOS 平台锁定只禁用拖拽（由渲染层用 -webkit-app-region: no-drag 实现），
   * 保持窗口可点击。
   */
  safeIpcHandle("lyricsWindow:setLocked", (_event, locked: boolean) => {
    windowState.lyrics = { ...(windowState.lyrics ?? {}), locked }
    saveWindowState(true)
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      applyLyricsLock(locked)
      return true
    }
    return true
  })

  // 临时切换是否忽略鼠标事件（锁定状态下鼠标移入控制栏时临时恢复点击）
  safeIpcHandle("lyricsWindow:setIgnoreMouse", (_event, ignore: boolean) => {
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.setIgnoreMouseEvents(ignore, { forward: true })
      return true
    }
    return false
  })

  // 桌面歌词偏好（字号 / 锁定 / 置顶 / 译文）持久化到主进程
  safeIpcHandle("lyricsWindow:getPrefs", () => {
    const prefs = windowState.lyrics ?? {}
    return {
      locked: prefs.locked ?? false,
      fontSize: prefs.fontSize ?? 24,
      alwaysOnTop: prefs.alwaysOnTop ?? true,
      // 译文默认关闭：桌面歌词以简洁为优先，需要时由控制栏/设置页开关打开
      showTranslation: prefs.showTranslation ?? false,
    }
  })

  safeIpcHandle("lyricsWindow:setPrefs", (_event, patch: Partial<LyricsPrefs>) => {
    windowState.lyrics = { ...(windowState.lyrics ?? {}), ...patch }
    saveWindowState(true)

    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      if (patch.alwaysOnTop !== undefined) {
        lyricsWindow.setAlwaysOnTop(patch.alwaysOnTop, ALWAYS_ON_TOP_LEVEL)
      }
      if (patch.locked !== undefined) {
        applyLyricsLock(patch.locked)
      }
    }

    // 设置页改字号时同步给已打开的歌词窗口，实现即时预览
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.webContents.send("lyrics:prefsChanged", windowState.lyrics)
    }
    return true
  })

  // ========== 播放器状态同步（渲染进程 -> 主进程）==========
  ipcMain.on("player:updateTrack", (_event, trackInfo: PlayerTrackInfo) => {
    trayState.currentTrack = trackInfo
    trayState.isPlaying = true
    trayState.progress = 0
    updateTrayMenu()

    // 切歌时清空上一首的歌词，避免桌面歌词残留旧文本
    trayState.lyric = { currentText: "", hasLyrics: false }
    broadcastToSecondaryWindows("player:trackUpdated", trackInfo)
    broadcastToSecondaryWindows("lyrics:update", trayState.lyric)
  })

  ipcMain.on("player:updatePlayState", (_event, isPlaying: boolean) => {
    trayState.isPlaying = isPlaying
    updateTrayMenu()

    // Update Touch Bar
    if (process.platform === "darwin") {
      updateTouchBarPlayState(isPlaying)
    }

    broadcastToSecondaryWindows("player:playStateUpdated", isPlaying)
  })

  ipcMain.on("player:updateLikeState", (_event, liked: boolean) => {
    trayState.liked = liked
    updateTrayMenu()

    // Update Touch Bar
    if (process.platform === "darwin") {
      updateTouchBarLikeState(liked)
    }

    broadcastToSecondaryWindows("player:likeStateUpdated", liked)
  })

  ipcMain.on("player:updateVolume", (_event, data: { volume: number; muted: boolean }) => {
    trayState.volume = data?.volume ?? 1
    trayState.muted = data?.muted ?? false
    broadcastToSecondaryWindows("player:volumeUpdated", {
      volume: trayState.volume,
      muted: trayState.muted,
    })
  })

  ipcMain.on("player:updateProgress", (_event, progress: number) => {
    trayState.progress = progress
    broadcastToSecondaryWindows("player:progressUpdated", progress)
  })

  // ========== 歌词同步（Touch Bar + 桌面歌词窗口）==========
  ipcMain.on("player:updateLyrics", (_event, data: LyricPayload) => {
    if (process.platform === "darwin") {
      updateTouchBarLyrics(data.currentText, data.hasLyrics)
    }

    // 缓存最新歌词，供后打开的窗口补齐状态
    trayState.lyric = data

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
  })

  // 初始化核心模块
  windowState = loadWindowState()
  createAudioEngineWindow()
  registerIpcHandlers()
  createWindow()
  createTray()
  registerGlobalShortcuts()
  // 初始化自动更新（Windows 自动更新 / macOS 新版本提示）
  initUpdater(() => mainWindow)

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
  saveWindowState(true)
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
