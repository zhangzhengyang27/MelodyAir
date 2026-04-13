import request from './index'

// 云盘歌曲列表
export const getCloudList = (limit = 30, offset = 0) =>
  request.get('/user/cloud', { params: { limit, offset } })

// 云盘歌曲详情
export const getCloudDetail = (id: number) =>
  request.get('/user/cloud/detail', { params: { id } })

// 删除云盘歌曲
export const deleteCloudSong = (id: number) =>
  request.get('/user/cloud/del', { params: { id } })
