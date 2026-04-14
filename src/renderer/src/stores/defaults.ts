/**
 * 集中定义所有 Store 的默认值
 * 用于版本迁移：新版本新增的配置项自动填充默认值
 */

import type { MusicQuality, ThemeMode, LyricsBackgroundType } from './settings'
import type { PlayMode } from '../utils/player'

export const settingsDefaults = {
  theme: 'system' as ThemeMode,
  lyricsBackground: 'blur' as LyricsBackgroundType,
  musicQuality: 'exhigh' as MusicQuality,
  autoPlay: true,
  fadeDuration: 200,
  enableCache: true,
  cacheLimitMB: 500,
  autoCacheNextTrack: true,
  enableUnblock: true,
  showLyricTranslation: true,
  lyricFontSize: 16,
  lyricFontFamily: 'system-ui',
  lyricAlignment: 'center' as 'left' | 'center' | 'right',
  minimizeToTray: true,
  globalShortcut: true,
  autoLaunch: false,
  _apiBase: 'http://localhost:3000',
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
  persisted: Partial<T>
): T {
  return { ...defaults, ...persisted }
}
