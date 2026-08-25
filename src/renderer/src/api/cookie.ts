/**
 * Cookie 统一管理模块
 *
 * 从 localStorage 读取以 'cookie-' 为前缀的键值对，
 * 拼接为标准 Cookie 字符串供 API 请求使用。
 *
 * 使用方式：
 *   import { getCookieString, setCookieToStorage, removeCookieFromStorage } from '@/api/cookie'
 */

const COOKIE_PREFIX = 'cookie-'

/**
 * 从 localStorage 读取并拼接完整的 Cookie 字符串
 * 用于通过 HTTP Header 传递给后端
 */
export function getCookieString(): string {
  const parts: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(COOKIE_PREFIX)) {
      const value = localStorage.getItem(key)
      if (value) {
        parts.push(`${key.replace(COOKIE_PREFIX, '')}=${value}`)
      }
    }
  }
  return parts.join('; ')
}

/**
 * 将单个 Cookie 写入 localStorage 存储
 */
export function setCookieToStorage(name: string, value: string): void {
  localStorage.setItem(`${COOKIE_PREFIX}${name}`, value)
}

/**
 * 从 localStorage 移除单个 Cookie
 */
export function removeCookieFromStorage(name: string): void {
  localStorage.removeItem(`${COOKIE_PREFIX}${name}`)
}

/**
 * 解析服务端返回的 Cookie 字符串，逐条写入 localStorage 和 document.cookie
 * @param cookieStr 服务端返回的完整 Cookie 字符串（可能包含 HTTPOnly 标记等）
 */
export function parseAndStoreCookies(cookieStr: string): void {
  if (!cookieStr) return
  // 按分号分割，兼容 ;; 和 ; 以及分号后有无空格的情况
  const cookies = cookieStr.split(/;\s*/)
  for (const c of cookies) {
    const trimmed = c.trim()
    if (!trimmed) continue
    try {
      document.cookie = trimmed
      const cookieKeyValue = trimmed.split(';')[0]!.split('=')
      if (cookieKeyValue[0] && cookieKeyValue[1] !== undefined) {
        localStorage.setItem(`cookie-${cookieKeyValue[0].trim()}`, cookieKeyValue[1])
      }
    } catch {
      // 忽略无效 Cookie
    }
  }
}

/**
 * 检查是否存在有效的登录 Cookie
 */
export function hasAuthCookie(): boolean {
  return localStorage.getItem('cookie-MUSIC_U') !== null || !!document.cookie.match(new RegExp('(?:^|;\\s*)MUSIC_U=([^;]*)'))
}
