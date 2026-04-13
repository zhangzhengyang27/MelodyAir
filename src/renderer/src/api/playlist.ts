import request from './index'

// 获取歌单详情
export const getPlaylistDetail = (id: number) =>
  request.get('/playlist/detail', { params: { id } })

// 获取歌单所有歌曲
export const getPlaylistTrackAll = (id: number, limit = 50, offset = 0) =>
  request.get('/playlist/track/all', { params: { id, limit, offset } })

// 热门歌单分类
export const getPlaylistHot = () => request.get('/playlist/hot')

// 歌单分类列表
export const getPlaylistCatlist = () => request.get('/playlist/catlist')

// 收藏/取消收藏歌单
export const subscribePlaylist = (id: number, t: 1 | 2) =>
  request.get('/playlist/subscribe', { params: { t, id } })
