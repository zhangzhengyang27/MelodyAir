/**
 * 集中定义所有 Store 的默认值
 * 用于版本迁移：新版本新增的配置项自动填充默认值
 */

import type { MusicQuality, ThemeMode, LyricsBackgroundType } from './settings'
import type { PlayMode } from '../utils/player'

/**
 * 旧版本桌面端构建的 apiBase 默认值。
 * 历史版本没有注入 VITE_API_BASE，这个默认值被持久化到了用户本地；
 * 对迁移逻辑而言它等价于"用户未设置"，升级后应让位于新默认值（线上地址）。
 */
export const LEGACY_DEFAULT_API_BASE = 'http://localhost:3001'

export const settingsDefaults = {
  theme: 'system' as ThemeMode,
  lyricsBackground: 'blur' as LyricsBackgroundType,
  musicQuality: 'exhigh' as MusicQuality,
  fadeDuration: 200,
  enableCache: true,
  cacheLimitMB: 500,
  autoCacheNextTrack: true,
  enableUnblock: true,
  minimizeToTray: true,
  globalShortcut: true,
  autoLaunch: false,
  // 生产构建（web 由 build:web 命令行注入、桌面由 .env.production 注入）指向线上 API；
  // dev 无注入，回落 localhost 便于本地调试
  apiBase: (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3001',
}

export const playerDefaults = {
  playMode: 'sequence' as PlayMode,
  volume: 0.8,
  muted: false,
  playlist: [] as unknown[],
  currentIndex: -1,
}

export const userDefaults = {
  profile: null,
  cookie: '',
  likedSongIds: [] as number[],
  loginMode: null as string | null,
  likedSongPlaylistId: 0,
  lastRefreshCookieDate: 0,
}

/**
 * 通用迁移函数：将持久化数据与默认值合并
 * 确保新增字段自动填充默认值，旧字段保留用户配置
 */
export function migrateWithDefaults<T extends Record<string, unknown>>(
  defaults: T,
  // 持久化数据来自 localStorage / JSON，取值一律是 unknown，
  // 用 Partial<T> 会因为 unknown 无法赋值给具体字段而误报
  persisted: Partial<Record<keyof T, unknown>>
): T {
  return { ...defaults, ...persisted } as T
}
