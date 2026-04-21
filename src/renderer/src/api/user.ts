import request from './index'
import type { ApiResponse, Playlist, UserProfile, UserAccount } from '@/types/api'

// 用户详情
export const getUserDetail = (uid: number): Promise<ApiResponse> =>
  request.get('/user/detail', { params: { uid } })

// 用户歌单
export const getUserPlaylist = (uid: number, limit = 30, offset = 0): Promise<ApiResponse<{ playlist: Playlist[] }>> =>
  request.get('/user/playlist', { params: { uid, limit, offset } })

// 用户账号信息
export const getUserAccount = (): Promise<ApiResponse<UserAccount>> => request.get('/user/account')

// 用户信息，歌单，收藏，mv, dj 数量
export const getUserSubcount = (): Promise<ApiResponse> => request.get('/user/subcount')

// 用户等级信息
export const getUserLevel = (): Promise<ApiResponse> => request.get('/user/level')

// 用户绑定信息
export const getUserBinding = (uid: number): Promise<ApiResponse> =>
  request.get('/user/binding', { params: { uid } })

// 更新用户信息
export const updateUser = (params: { gender: number; birthday: number; nickname: string; province: number; city: number; signature: string }): Promise<ApiResponse> =>
  request.get('/user/update', { params })

// 喜欢的音乐列表
export const getLikeList = (uid: number): Promise<ApiResponse<{ ids: number[] }>> =>
  request.get('/likelist', { params: { uid } })

// 喜欢音乐
export const likeSong = (id: number, like = true) =>
  request.get('/like', { params: { id, like } })

// 喜欢音乐 - 新版
export const likeSongV2 = (id: number, uid: number, like: boolean) =>
  request.get('/song/like', { params: { id, uid, like } })

// 获取用户播放记录
export const getUserRecord = (uid: number, type = 0) =>
  request.get('/user/record', { params: { uid, type } })

// 获取用户关注列表
export const getUserFollows = (uid: number, limit = 30, offset = 0) =>
  request.get('/user/follows', { params: { uid, limit, offset } })

// 获取用户粉丝列表
export const getUserFolloweds = (uid: number, limit = 20, offset = 0) =>
  request.get('/user/followeds', { params: { uid, limit, offset } })

// 获取用户动态
export const getUserEvent = (uid: number, limit = 30, lasttime = -1) =>
  request.get('/user/event', { params: { uid, limit, lasttime } })

// 关注/取消关注用户
export const followUser = (id: number, t: 1 | 0) =>
  request.get('/follow', { params: { id, t } })

// 当前账号关注的用户/歌手
export const getUserFollowMixed = (params?: { size?: number; cursor?: number; scene?: number }) =>
  request.get('/user/follow/mixed', { params })

// 用户是否互相关注
export const getUserMutualFollow = (uid: number) =>
  request.get('/user/mutualfollow/get', { params: { uid } })

// 用户徽章
export const getUserMedal = (uid: number) =>
  request.get('/user/medal', { params: { uid } })

// 用户状态
export const getUserSocialStatus = (uid: number) =>
  request.get('/user/social/status', { params: { uid } })

// 用户的创建歌单列表
export const getUserPlaylistCreate = (uid: number, limit = 100, offset = 0) =>
  request.get('/user/playlist/create', { params: { uid, limit, offset } })

// 用户的收藏歌单列表
export const getUserPlaylistCollect = (uid: number, limit = 100, offset = 0) =>
  request.get('/user/playlist/collect', { params: { uid, limit, offset } })

// 根据 nickname 获取 userid
export const getUserIds = (nicknames: string) =>
  request.get('/get/userids', { params: { nicknames } })
