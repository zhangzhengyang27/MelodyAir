import request from './index'

// 所有榜单
export const getToplist = () => request.get('/toplist')

// 所有榜单内容摘要
export const getToplistDetail = () => request.get('/toplist/detail')

// 歌手榜
export const getToplistArtist = (type = 1) =>
  request.get('/toplist/artist', { params: { type } })

// 新歌速递
export const getTopSong = (type = 0) =>
  request.get('/top/song', { params: { type } })
