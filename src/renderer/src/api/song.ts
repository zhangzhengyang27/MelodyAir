import request from './index'

// 获取歌曲详情
export const getSongDetail = (ids: number | string) =>
  request.get('/song/detail', { params: { ids } })

// 获取歌曲 URL
export const getSongUrl = (id: number, level = 'exhigh') =>
  request.get('/song/url', { params: { id, level } })

// 获取歌词
export const getLyric = (id: number) =>
  request.get('/lyric', { params: { id } })

// 检查歌曲是否可用
export const checkMusic = (id: number) =>
  request.get('/check/music', { params: { id } })
