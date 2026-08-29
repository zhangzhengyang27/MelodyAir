/**
 * 应用自动更新模块
 *
 * 方案 A：Windows 自动更新 + macOS 手动下载
 * - Windows：使用 electron-updater，基于 GitHub Releases 的 latest.yml 差量更新
 * - macOS：本应用未签名/未公证，electron-updater 不可用，改为检测 GitHub 最新版本并引导下载
 */

import { app, ipcMain, BrowserWindow, shell } from 'electron'
import { autoUpdater } from 'electron-updater'

/** 当前仓库的最新 release 检测地址（macOS 手动下载用） */
const GITHUB_LATEST_API = 'https://api.github.com/repos/zhangzhengyang27/MelodyAir/releases/latest'
/** GitHub Releases 下载页（macOS 引导用户前往） */
const GITHUB_RELEASES_URL = 'https://github.com/zhangzhengyang27/MelodyAir/releases/latest'

let mainWindowGetter: () => BrowserWindow | null = () => null
let initialized = false
let macLatestChecked = false

/** 向渲染进程发送更新事件 */
function emit(channel: string, payload: Record<string, unknown>): void {
  mainWindowGetter()?.webContents.send(`update:${channel}`, payload)
}

/** 比较两个语义化版本号，a > b 返回 true */
function isNewerVersion(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na > nb
  }
  return false
}

// ==================== Windows 自动更新（electron-updater） ====================

function setupWindowsAutoUpdater(): void {
  autoUpdater.autoDownload = false // 先提示用户，由用户确认后再下载
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    emit('status', { state: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    emit('available', {
      version: info.version,
      currentVersion: app.getVersion(),
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    emit('status', { state: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    emit('download-progress', {
      percent: Math.round(progressObj.percent * 10) / 10,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    emit('downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    emit('error', { message: err.message })
  })

  ipcMain.handle('update:download', () => {
    autoUpdater.downloadUpdate()
    return true
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
    return true
  })

  ipcMain.handle('update:check', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      emit('error', { message: err.message })
    })
    return true
  })

  // 应用就绪后延迟检查一次，避免阻塞启动
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // 检查失败静默处理，不影响使用
    })
  }, 5000)
}

// ==================== macOS 手动下载（检测 GitHub 最新版本） ====================

async function checkMacLatestRelease(): Promise<void> {
  if (macLatestChecked) return
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(GITHUB_LATEST_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MelodyAir' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return

    const data = (await res.json()) as {
      tag_name?: string
      assets?: { name: string; browser_download_url: string }[]
    }
    const latestVersion = data.tag_name?.replace(/^v/, '')
    const currentVersion = app.getVersion()
    if (!latestVersion) return

    // 仅当最新版本号高于当前版本才提示
    if (isNewerVersion(latestVersion, currentVersion)) {
      // 按平台过滤下载资产
      const isArm = process.platform === 'darwin' && process.arch === 'arm64'
      const suffix = isArm ? 'arm64' : 'x64'
      const matched = (data.assets ?? []).find(
        (a) => a.name.includes('dmg') && a.name.includes(suffix)
      )
      emit('mac-available', {
        version: latestVersion,
        currentVersion,
        downloadUrl: matched?.browser_download_url ?? GITHUB_RELEASES_URL,
        releasesUrl: GITHUB_RELEASES_URL,
      })
    }
    macLatestChecked = true
  } catch {
    // 网络失败静默处理
  }
}

// ==================== 初始化 ====================

export function initUpdater(getter: () => BrowserWindow | null): void {
  mainWindowGetter = getter

  if (initialized) return
  initialized = true

  if (process.platform === 'win32') {
    setupWindowsAutoUpdater()
  } else if (process.platform === 'darwin') {
    // macOS：应用启动后延迟检测新版本并提示下载
    setTimeout(checkMacLatestRelease, 6000)
  }

  // 渲染进程主动触发更新检查
  ipcMain.handle('update:check-now', () => {
    if (process.platform === 'win32') {
      autoUpdater.checkForUpdates().catch(() => {})
    } else if (process.platform === 'darwin') {
      checkMacLatestRelease()
    }
    return true
  })

  // 打开 GitHub Releases 页面（macOS 下载/Windows 手动更新时也可用）
  ipcMain.handle('update:open-releases', () => {
    shell.openExternal(GITHUB_RELEASES_URL)
    return true
  })
}
