/**
 * usePlatform — 平台能力检测与统一能力矩阵
 *
 * 把散落的 `window.electronAPI?.xxx` 判断收敛为一处，
 * 所有需要按平台条件渲染的组件统一引用此 composable。
 *
 * 设计原则：
 * - 能力标志基于「API 实际存在性」，不硬编码平台字符串
 * - 同步返回，不依赖 IPC 异步调用
 * - Web 端所有 Electron 专属能力自动为 false
 */

export interface PlatformCapabilities {
  /** 是否运行在 Electron 桌面端 */
  isElectron: boolean
  /** 是否运行在纯 Web 浏览器 */
  isWeb: boolean
  /** 当前操作系统平台 */
  platform: 'darwin' | 'win32' | 'linux' | 'web'
  /** 窗口控制（最小化/最大化/关闭/无边框标题栏） */
  hasWindowControl: boolean
  /** 系统托盘 */
  hasTray: boolean
  /** 全局快捷键 */
  hasGlobalShortcut: boolean
  /** 开机自启 */
  hasAutoLaunch: boolean
  /** 迷你悬浮窗 */
  hasMiniPlayer: boolean
  /** 桌面歌词独立窗口 */
  hasDesktopLyrics: boolean
  /** 本地音乐文件扫描（文件系统访问） */
  hasLocalScan: boolean
  /** macOS Touch Bar */
  hasTouchBar: boolean
  /** Electron 独立音频引擎窗口 */
  hasAudioEngine: boolean
  /** 浏览器 Media Session API（Web 端媒体键替代） */
  hasMediaSession: boolean
}

/**
 * 检测当前操作系统（同步，基于 userAgent）
 */
function detectPlatform(): PlatformCapabilities['platform'] {
  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'darwin'
  if (ua.includes('win')) return 'win32'
  if (ua.includes('linux')) return 'linux'
  return 'web'
}

// 模块级单例：平台能力在运行期不变，只需计算一次
let _cache: PlatformCapabilities | null = null

function computeCapabilities(): PlatformCapabilities {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined
  const isElectron = !!api
  const platform = isElectron ? detectPlatform() : 'web'

  return {
    isElectron,
    isWeb: !isElectron,
    platform,
    // 窗口控制：需要 windowClose 等 API
    hasWindowControl: isElectron && typeof api?.windowClose === 'function',
    // 托盘：Electron 端始终可用（主进程已创建）
    hasTray: isElectron,
    // 全局快捷键
    hasGlobalShortcut: isElectron && typeof api?.setGlobalShortcuts === 'function',
    // 开机自启
    hasAutoLaunch: isElectron && typeof api?.setAutoLaunch === 'function',
    // 迷你悬浮窗
    hasMiniPlayer: isElectron && typeof api?.openMiniWindow === 'function',
    // 桌面歌词
    hasDesktopLyrics: isElectron && typeof api?.openLyricsWindow === 'function',
    // 本地音乐扫描
    hasLocalScan: isElectron && typeof api?.selectScanDirectory === 'function',
    // Touch Bar：仅 macOS
    hasTouchBar: isElectron && platform === 'darwin',
    // 独立音频引擎
    hasAudioEngine: isElectron && typeof api?.audioPlay === 'function',
    // 浏览器 Media Session（Web 端媒体键/系统通知替代）
    hasMediaSession: typeof navigator !== 'undefined' && 'mediaSession' in navigator,
  }
}

/**
 * 获取平台能力矩阵（单例，运行期不变）
 */
export function usePlatform(): PlatformCapabilities {
  if (!_cache) {
    _cache = computeCapabilities()
  }
  return _cache
}
