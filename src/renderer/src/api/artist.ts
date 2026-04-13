import request from './index'

// 歌手详情
export const getArtistDetail = (id: number) =>
  request.get('/artist/detail', { params: { id } })

// 歌手描述
export const getArtistDesc = (id: number) =>
  request.get('/artist/desc', { params: { id } })

// 歌手歌曲
export const getArtistSongs = (id: number, limit = 50, offset = 0, order = 'hot') =>
  request.get('/artist/songs', { params: { id, limit, offset, order } })

// 歌手专辑
export const getArtistAlbum = (id: number, limit = 30, offset = 0) =>
  request.get('/artist/album', { params: { id, limit, offset } })

// 歌手 MV
export const getArtistMv = (id: number, limit = 30, offset = 0) =>
  request.get('/artist/mv', { params: { id, limit, offset } })

// 收藏/取消收藏歌手
export const subArtist = (id: number, t: 1 | 2) =>
  request.get('/artist/sub', { params: { id, t } })
