/**
 * 窗口角色判定
 *
 * 桌面歌词 / 迷你播放器是独立的 BrowserWindow，各自加载同一份 renderer 入口，
 * 因此**每个窗口都有自己独立的 Pinia 实例**（store 状态互不相通）。
 *
 * 后果：子窗口若执行主窗口才该做的事（恢复播放、监听音频事件、回传播放状态），
 * 会用自己的空状态反向广播，与主窗口的真实状态互相覆盖，导致桌面歌词闪烁。
 *
 * 所有「仅主窗口可执行」的逻辑都必须先经过这里的判定。
 */

const SECONDARY_ROUTES = ['/desktop-lyrics', '/mini-player']

/** 当前是否为子窗口（桌面歌词 / 迷你播放器） */
export function isSecondaryWindow(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash
  return SECONDARY_ROUTES.some((route) => hash.includes(route))
}

/** 当前是否为主窗口 */
export function isMainWindow(): boolean {
  return !isSecondaryWindow()
}
