import request from './index'

// 用户详情
export const getUserDetail = (uid: number) =>
  request.get('/user/detail', { params: { uid } })

// 用户歌单
export const getUserPlaylist = (uid: number, limit = 30, offset = 0) =>
  request.get('/user/playlist', { params: { uid, limit, offset } })

// 用户账号信息
export const getUserAccount = () => request.get('/user/account')

// 喜欢的音乐列表
export const getLikeList = (uid: number) =>
  request.get('/likelist', { params: { uid } })

// 喜欢/取消喜欢音乐
export const likeSong = (id: number, like: boolean) =>
  request.get('/like', { params: { id, like } })
