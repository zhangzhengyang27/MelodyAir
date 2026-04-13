import request from './index'

// 相似歌曲
export const getSimiSong = (id: number) =>
  request.get('/simi/song', { params: { id } })

// 相似歌单
export const getSimiPlaylist = (id: number) =>
  request.get('/simi/playlist', { params: { id } })

// 相似歌手
export const getSimiArtist = (id: number) =>
  request.get('/simi/artist', { params: { id } })
