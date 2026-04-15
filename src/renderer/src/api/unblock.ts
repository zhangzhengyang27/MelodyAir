import request from './index'

export interface UnblockResult {
  id: number
  url: string
  proxyUrl: string
  type?: string
  level?: string
}

export interface MatchResult {
  code: number
  data: string
  proxyUrl: string
  msg?: string
}

/**
 * 解锁歌曲（多源音源匹配）
 * @param songId 歌曲 ID
 * @param source 指定音源（可选）：qq, kugou, kuwo, migu
 * @param level 音质等级（可选）
 */
export const unblockSong = (songId: number | string, source?: string, level?: string) =>
  request.get<UnblockResult>(`/unblock/${songId}`, {
    params: { source, level }
  })

/**
 * 匹配歌曲（简化版，仅返回 URL）
 * @param songId 歌曲 ID
 * @param source 指定音源（可选）
 */
export const matchSong = (songId: number | string, source?: string) =>
  request.get<MatchResult>(`/unblock/match/${songId}`, {
    params: { source }
  })
