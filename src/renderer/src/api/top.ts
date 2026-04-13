import request from './index'

// 排行榜列表
export const getToplist = () => request.get('/toplist')

// 排行榜详情
export const getToplistDetail = (id: number) =>
  request.get('/toplist/detail', { params: { id } })
