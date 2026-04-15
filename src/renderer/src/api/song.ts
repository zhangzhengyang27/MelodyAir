import request from './index'

// 获取歌曲详情
export const getSongDetail = (ids: number | string) =>
  request.get('/song/detail', { params: { ids } })

// 获取音乐 URL（旧版）
export const getSongUrl = (id: number, br = 999000) =>
  request.get('/song/url', { params: { id, br } })

// 获取音乐 URL - 新版（支持音质等级）
export const getSongUrlV1 = (id: number | string, level = 'exhigh', unblock = false) =>
  request.get('/song/url/v1', { params: { id, level, unblock } })

// 获取客户端歌曲下载 URL
export const getSongDownloadUrl = (id: number, br = 999000) =>
  request.get('/song/download/url', { params: { id, br } })

// 获取客户端歌曲下载 URL - 新版
export const getSongDownloadUrlV1 = (id: number, level = 'exhigh') =>
  request.get('/song/download/url/v1', { params: { id, level } })

// 直接获取灰色歌曲链接（解灰）
export const getSongUrlMatch = (id: number, source?: string) =>
  request.get('/song/url/match', { params: { id, source } })

// 获取歌词
export const getLyric = (id: number) =>
  request.get('/lyric', { params: { id } })

// 获取逐字歌词（新版）
export const getLyricNew = (id: number) =>
  request.get('/lyric/new', { params: { id } })

/**
 * 获取歌词 V1（支持逐字歌词等 8 种变体）
 * @param id 歌曲 ID
 * @param options 歌词选项
 */
export const getLyricV1 = (id: number | string, options?: {
  /** 是否返回逐字歌词（卡拉OK模式） */
  cp?: boolean
  /** 翻译歌词版本 */
  tv?: number
  /** 罗马音歌词版本 */
  lv?: number
  /** 罗马音歌词备选版本 */
  rv?: number
  /** 卡拉OK歌词版本 */
  kv?: number
  /** 音译歌词版本 */
  yv?: number
  /** 音译逐字歌词版本 */
  ytv?: number
  /** 音译罗马音歌词版本 */
  yrv?: number
}) =>
  request.get('/lyric/v1', { params: { id, ...options } })

// 检查歌曲是否可用
export const checkMusic = (id: number, br = 999000) =>
  request.get('/check/music', { params: { id, br } })

// 歌曲音质详情
export const getSongMusicDetail = (id: number) =>
  request.get('/song/music/detail', { params: { id } })

// 歌曲红心数量
export const getSongRedCount = (id: number) =>
  request.get('/song/red/count', { params: { id } })

// 歌曲是否喜爱
export const checkSongLike = (ids: number[]) =>
  request.get('/song/like/check', { params: { ids: JSON.stringify(ids) } })

// 歌曲动态封面
export const getSongDynamicCover = (id: number) =>
  request.get('/song/dynamic/cover', { params: { id } })

// 副歌时间
export const getSongChorus = (id: number) =>
  request.get('/song/chorus', { params: { id } })

// 音乐百科简要信息
export const getSongWikiSummary = (id: number) =>
  request.get('/song/wiki/summary', { params: { id } })
