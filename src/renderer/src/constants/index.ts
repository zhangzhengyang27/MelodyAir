/**
 * 全局常量定义
 *
 * 集中管理硬编码值，避免散落在各文件中
 */

/** 默认 API 基础地址（开发环境） */
export const DEFAULT_API_BASE = 'http://localhost:3000'

/** 第三方音源域名列表（用于判断是否需要代理） */
export const THIRD_PARTY_AUDIO_DOMAINS = [
  'kuwo.cn',
  'kugou.com',
  'qq.com',
  'migu.cn',
  'music.126.net',
] as const

/** 浏览器 User-Agent（模拟 Chrome，避免被网易云盾识别为机器人） */
export const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
