import request from './index'

// 最近播放歌曲
export const getRecentSong = (limit = 100) =>
  request.get('/record/recent/song', { params: { limit } })

// 最近播放专辑
export const getRecentAlbum = (limit = 100) =>
  request.get('/record/recent/album', { params: { limit } })
