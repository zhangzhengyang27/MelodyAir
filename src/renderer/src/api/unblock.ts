import request from './index'
import type { UnblockMatchResult } from '@/types/api'

/** @deprecated 使用 types/api.ts 的 UnblockMatchResult */
export type MatchResult = UnblockMatchResult

/**
 * 解锁歌曲（多源音源匹配）
 * @param songId 歌曲 ID
 * @param source 指定音源（可选）：qq, kugou, kuwo, migu
 * @param level 音质等级（可选）
 */
export const unblockSong = (songId: number | string, source?: string, level?: string): Promise<UnblockMatchResult> =>
  request.get(`/unblock/${songId}`, { params: { source, level } })

/**
 * 匹配歌曲（简化版，仅返回 URL）
 * @param songId 歌曲 ID
 * @param source 指定音源（可选）
 */
export const matchSong = (songId: number | string, source?: string): Promise<UnblockMatchResult> =>
  request.get(`/unblock/match/${songId}`, { params: { source } })
