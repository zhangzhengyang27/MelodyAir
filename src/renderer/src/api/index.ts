import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'
import { getCookieString } from './cookie'
import { logger } from '@/utils/logger'

const request = axios.create({
  timeout: 15000,
  withCredentials: true,
})

/**
 * 需要登录才能访问的 API 路径前缀白名单
 * 匹配时只要 URL 以这些前缀开头即视为需要登录
 */
const ACCOUNT_REQUIRED_APIS = [
  '/daily_recommend',
  '/likelist',
  '/playlist/subscribe',
  '/playlist/tracks',
  '/like',
  '/song/like',
  '/scrobble',
  '/recommend/songs',
  '/recommend/resource',
  '/user/cloud',
  '/user/playlist',
  '/playlist/my',
  '/song/order',
  '/mv/sublist',
  '/artist/sub',
  '/album/sublist',
  '/toplist/detail',
  '/msg',
  '/simi',
  '/song/detail',
]

/**
 * 检查请求 URL 是否需要登录
 */
function isAccountRequired(url?: string): boolean {
  if (!url) return false
  return ACCOUNT_REQUIRED_APIS.some(prefix => url.startsWith(prefix))
}

/**
 * 请求拦截器
 * 1. 动态设置 baseURL
 * 2. 注入 MUSIC_U cookie（通过 HTTP Header 传递）
 * 3. 登录相关接口不注入 cookie
 */
request.interceptors.request.use(
  (config) => {
    const settingsStore = useSettingsStore()
    if (settingsStore.apiBase) {
      config.baseURL = settingsStore.apiBase
    }

    // 登录相关接口不注入 cookie（避免干扰登录流程）
    // /login 邮箱登录需精确匹配（排除 /login/cellphone、/login/qr/ 等）
    const isLoginEmailUrl = config.url === '/login' || config.url?.startsWith('/login?')
    const isLoginRelatedUrl = isLoginEmailUrl ||
                              config.url?.includes('/login/qr/') ||
                              config.url?.includes('/login/cellphone') ||
                              config.url?.includes('/captcha/sent') ||
                              config.url?.includes('/captcha/verify') ||
                              config.url?.includes('/register/anonimous') ||
                              config.url?.includes('/register/cellphone')

    if (isLoginRelatedUrl) {
      return config
    }

    // ★ 仅对需要登录的接口通过 HTTP Header 注入 cookie
    const cookieStr = getCookieString()
    if (cookieStr && isAccountRequired(config.url)) {
      config.headers = config.headers || {}
      config.headers['Cookie'] = cookieStr
    }

    // ★ 需要登录的接口在无 cookie 时直接拦截
    if (!cookieStr && isAccountRequired(config.url)) {
      logger.warn('api', `${config.url} 需要登录，但当前无 Cookie，请求已拦截`)
      return Promise.reject(new axios.Cancel('ACCOUNT_REQUIRED'))
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
    const data = response.data
    if (data?.code !== undefined && data.code !== 200) {
      logger.warn('api', `${response.config.method?.toUpperCase()} ${response.config.url} 业务异常: code=${data.code}, message=${data.message || data.msg}`)
    }
    return response.data
  },
  async (error) => {
    if (error?.response) {
      const status = error.response.status
      const url = error.config?.url
      logger.error('api', `HTTP 错误: ${status} ${url}`, error.response.data)
    } else if (error?.request) {
      logger.error('api', `网络错误（无响应）: ${error.message}`, error.config?.url)
    } else {
      logger.error('api', `请求配置错误: ${error.message}`)
    }
    if (error?.response?.data?.code === 301) {
      logger.warn('api', 'Token expired, logout required')
      const { useUserStore } = await import('@/stores/user')
      const userStore = useUserStore()
      await userStore.logout()
    }
    return Promise.reject(error)
  }
)

export default request
