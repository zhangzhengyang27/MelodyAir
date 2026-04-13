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
