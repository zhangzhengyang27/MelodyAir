import request from './index'

// MV 详情
export const getMvDetail = (mvid: number) =>
  request.get('/mv/detail', { params: { mvid } })

// MV 播放地址
export const getMvUrl = (id: number, r = 1080) =>
  request.get('/mv/url', { params: { id, r } })

// 收藏/取消收藏 MV
export const subMv = (mvid: number, t: 1 | 2) =>
  request.get('/mv/sub', { params: { mvid, t } })

// 收藏的 MV 列表
export const getMvSublist = () => request.get('/mv/sublist')

// MV 点赞转发评论数数据
export const getMvDetailInfo = (mvid: number) =>
  request.get('/mv/detail/info', { params: { mvid } })

// 全部 MV
export const getMvAll = (params?: { area?: string; type?: string; order?: string; limit?: number; offset?: number }) =>
  request.get('/mv/all', { params })

// 最新 MV
export const getMvFirst = (params?: { area?: string; limit?: number }) =>
  request.get('/mv/first', { params })

// 网易出品 MV
export const getMvExclusiveRcmd = (limit = 30, offset = 0) =>
  request.get('/mv/exclusive/rcmd', { params: { limit, offset } })

// MV 排行
export const getTopMv = (params?: { area?: string; limit?: number; offset?: number }) =>
  request.get('/top/mv', { params })

// 相似 MV
export const getSimiMv = (mvid: number) =>
  request.get('/simi/mv', { params: { mvid } })
