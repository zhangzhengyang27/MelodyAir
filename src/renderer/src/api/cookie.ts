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
 * Set-Cookie 属性名（不区分大小写），解析时需要跳过，不能当作独立 cookie 存储
 */
const COOKIE_ATTRIBUTES = new Set([
  'max-age', 'expires', 'path', 'domain',
  'secure', 'httponly', 'samesite', 'priority',
  'partitioned', 'sameparty',
])

function isCookieAttribute(name: string): boolean {
  return COOKIE_ATTRIBUTES.has(name.trim().toLowerCase())
}

/**
 * 从 localStorage 读取并拼接完整的 Cookie 字符串
 * 用于通过 HTTP Header 传递给后端
 */
export function getCookieString(): string {
  const parts: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(COOKIE_PREFIX)) {
      const name = key.replace(COOKIE_PREFIX, '')
      // 跳过历史上被错误存储的 cookie 属性项
      if (isCookieAttribute(name)) continue
      const value = localStorage.getItem(key)
      if (value) {
        parts.push(`${name}=${value}`)
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
 *
 * 注意：Set-Cookie 字符串中每个 cookie 可能附带属性（Max-Age / Expires / Path /
 * Domain / Secure / HTTPOnly / SameSite 等），这些属性用分号分隔，不能被当作独立
 * cookie 存储。本函数只提取真正的 name=value 对。
 */
export function parseAndStoreCookies(cookieStr: string): void {
  if (!cookieStr) return
  // 按分号分割，兼容 ;; 和 ; 以及分号后有无空格的情况
  const cookies = cookieStr.split(/;\s*/)
  for (const c of cookies) {
    const trimmed = c.trim()
    if (!trimmed) continue

    // 用第一个 = 分割，避免值中包含 = 时被截断（如 base64 token）
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) {
      // 无 = 的项是无值属性（如 Secure、HTTPOnly），跳过
      continue
    }
    const name = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1)

    // 跳过 cookie 属性项
    if (isCookieAttribute(name)) continue

    try {
      document.cookie = `${name}=${value}`
      localStorage.setItem(`${COOKIE_PREFIX}${name}`, value)
    } catch {
      // 忽略无效 Cookie
    }
  }
}

/**
 * 清理历史上被错误存储到 localStorage 的 cookie 属性项
 * （旧版 parseAndStoreCookies 会把 Max-Age / Expires / Path / Domain 等也存为 cookie）
 */
export function cleanupInvalidCookieEntries(): void {
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(COOKIE_PREFIX)) {
      const name = key.replace(COOKIE_PREFIX, '')
      if (isCookieAttribute(name)) {
        toRemove.push(key)
      }
    }
  }
  for (const key of toRemove) {
    localStorage.removeItem(key)
  }
}

/**
 * 检查是否存在有效的登录 Cookie
 */
export function hasAuthCookie(): boolean {
  return localStorage.getItem('cookie-MUSIC_U') !== null || !!document.cookie.match(new RegExp('(?:^|;\\s*)MUSIC_U=([^;]*)'))
}
