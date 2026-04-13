import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

const request = axios.create({
  timeout: 15000,
  withCredentials: true,
})

/**
 * 请求拦截器：参照 YPM utils/request.js
 * 1. 动态设置 baseURL
 * 2. 注入 MUSIC_U cookie（从 localStorage 读取拆分存储的 cookie）
 * 3. 登录相关接口不注入 cookie
 */
request.interceptors.request.use(
  (config) => {
    const settingsStore = useSettingsStore()
    if (settingsStore.apiBase) {
      config.baseURL = settingsStore.apiBase
    }

    // 登录相关接口不注入 cookie（避免干扰登录流程）
    const isLoginRelatedUrl = config.url?.includes('/login/qr/') ||
                              config.url?.includes('/login/cellphone') ||
                              config.url?.includes('/captcha/sent') ||
                              config.url?.includes('/captcha/verify') ||
                              config.url?.includes('/login/captcha') ||
                              config.url === '/login'

    if (isLoginRelatedUrl) {
      return config
    }

    // ★ 参照 YPM: 使用 MUSIC_U cookie 注入
    // 优先从 localStorage 读取拆分存储的 cookie
    const musicU = localStorage.getItem('cookie-MUSIC_U')
    if (musicU) {
      // 拼接完整 cookie 字符串（包含 __csrf 等）
      const cookieParts: string[] = []
      // 遍历 localStorage 中所有 cookie- 前缀的键
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cookie-')) {
          const value = localStorage.getItem(key)
          if (value) {
            cookieParts.push(`${key.replace('cookie-', '')}=${value}`)
          }
        }
      }
      if (cookieParts.length > 0) {
        config.headers.Cookie = cookieParts.join('; ')
        console.log(`[api] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} 注入 cookie (${cookieParts.length} 个)`)
      } else {
        console.warn(`[api] MUSIC_U 存在但无 cookie parts`)
      }
      return config
    }

    // Fallback: 兼容旧版整串 cookie 存储方式
    const userCookie = localStorage.getItem('user')
    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie)
        if (userData?.cookie) {
          config.headers.Cookie = userData.cookie
          console.log(`[api] ${config.method?.toUpperCase()} ${config.url} 使用 fallback cookie`)
        }
      } catch {
        // Ignore parse errors
      }
    }

    // 无 cookie 时警告（部分接口需要登录）
    if (!config.headers.Cookie && !isLoginRelatedUrl) {
      console.warn(`[api] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} 无 Cookie，接口可能需要登录`)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 * 参照 YPM: 301 状态码（需要登录）时自动登出
 */
request.interceptors.response.use(
  (response) => {
    // 记录非 200 code 的业务错误
    const data = response.data
    if (data?.code !== undefined && data.code !== 200) {
      console.warn(`[api] ${response.config.method?.toUpperCase()} ${response.config.url} 业务异常: code=${data.code}, message=${data.message || data.msg}`)
    }
    return response.data
  },
  async (error) => {
    if (error?.response) {
      const status = error.response.status
      const url = error.config?.url
      console.error(`[api] HTTP 错误: ${status} ${url}`, error.response.data)
    } else if (error?.request) {
      console.error('[api] 网络错误（无响应）:', error.message, error.config?.url)
    } else {
      console.error('[api] 请求配置错误:', error.message)
    }
    if (error?.response?.data?.code === 301) {
      console.warn('[API] Token expired, logout required')
      const { useUserStore } = await import('@/stores/user')
      const userStore = useUserStore()
      await userStore.logout()
    }
    return Promise.reject(error)
  }
)

export default request
