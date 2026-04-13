import request from './index'

// 专辑内容
export const getAlbumDetail = (id: number) =>
  request.get('/album', { params: { id } })

// 专辑动态信息
export const getAlbumDetailDynamic = (id: number) =>
  request.get('/album/detail/dynamic', { params: { id } })

// 收藏/取消收藏专辑
export const subAlbum = (id: number, t: 1 | 0) =>
  request.get('/album/sub', { params: { id, t } })

// 已收藏专辑列表
export const getAlbumSublist = (limit = 25, offset = 0) =>
  request.get('/album/sublist', { params: { limit, offset } })

// 新碟上架
export const getTopAlbum = (params?: { area?: string; type?: string; year?: string; month?: string; limit?: number; offset?: number }) =>
  request.get('/top/album', { params })

// 全部新碟
export const getAlbumNew = (params?: { area?: string; limit?: number; offset?: number }) =>
  request.get('/album/new', { params })

// 最新专辑
export const getAlbumNewest = () =>
  request.get('/album/newest')

// 数字专辑详情
export const getDigitalAlbumDetail = (id: number) =>
  request.get('/album/detail', { params: { id } })

// 获取专辑歌曲的音质
export const getAlbumPrivilege = (id: number) =>
  request.get('/album/privilege', { params: { id } })
