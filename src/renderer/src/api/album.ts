import request from './index'

// 专辑详情
export const getAlbumDetail = (id: number) =>
  request.get('/album/detail', { params: { id } })

// 专辑动态信息
export const getAlbumDetailDynamic = (id: number) =>
  request.get('/album/detail/dynamic', { params: { id } })

// 收藏/取消收藏专辑
export const subAlbum = (id: number, t: 1 | 2) =>
  request.get('/album/sub', { params: { id, t } })
