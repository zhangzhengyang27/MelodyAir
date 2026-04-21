import request from './index'
import type { ApiResponse, Playlist } from '@/types/api'

// 获取歌单详情
export const getPlaylistDetail = (id: number, s = 8): Promise<ApiResponse<{ playlist: Playlist }>> =>
  request.get('/playlist/detail', { params: { id, s } })

// 获取歌单所有歌曲
export const getPlaylistTrackAll = (id: number, limit?: number, offset?: number): Promise<ApiResponse> =>
  request.get('/playlist/track/all', { params: { id, limit, offset } })

// 热门歌单分类
export const getPlaylistHot = (): Promise<ApiResponse> => request.get('/playlist/hot')

// 歌单分类列表
export const getPlaylistCatlist = (): Promise<ApiResponse> => request.get('/playlist/catlist')

// 收藏/取消收藏歌单
export const subscribePlaylist = (id: number, t: 1 | 2): Promise<ApiResponse> =>
  request.get('/playlist/subscribe', { params: { t, id, timestamp: Date.now() } })

// 歌单详情动态
export const getPlaylistDetailDynamic = (id: number): Promise<ApiResponse<{ subscribed?: boolean }>> =>
  request.get('/playlist/detail/dynamic', { params: { id } })

// 歌单(网友精选碟)
export const getTopPlaylist = (params?: { order?: string; cat?: string; limit?: number; offset?: number }) =>
  request.get('/top/playlist', { params })

// 精品歌单标签列表
export const getPlaylistHighqualityTags = () =>
  request.get('/playlist/highquality/tags')

// 获取精品歌单
export const getTopPlaylistHighquality = (params?: { cat?: string; limit?: number; before?: number }) =>
  request.get('/top/playlist/highquality', { params })

// 歌单收藏者
export const getPlaylistSubscribers = (id: number, limit = 20, offset = 0) =>
  request.get('/playlist/subscribers', { params: { id, limit, offset } })

// 对歌单添加或删除歌曲
export const playlistTracks = (op: 'add' | 'del', pid: number, tracks: string) =>
  request.get('/playlist/tracks', { params: { op, pid, tracks, timestamp: Date.now() } })

// 新建歌单
export const createPlaylist = (name: string, privacy?: string, type?: string) =>
  request.get('/playlist/create', { params: { name, privacy, type } })

// 删除歌单
export const deletePlaylist = (id: string) =>
  request.get('/playlist/delete', { params: { id } })

// 更新歌单
export const updatePlaylist = (params: { id: number; name: string; desc: string; tags: string }) =>
  request.get('/playlist/update', { params })

// 更新歌单名
export const updatePlaylistName = (id: number, name: string) =>
  request.get('/playlist/name/update', { params: { id, name } })

// 更新歌单描述
export const updatePlaylistDesc = (id: number, desc: string) =>
  request.get('/playlist/desc/update', { params: { id, desc } })

// 更新歌单标签
export const updatePlaylistTags = (id: number, tags: string) =>
  request.get('/playlist/tags/update', { params: { id, tags } })

// 歌单更新播放量
export const updatePlaylistPlaycount = (id: number) =>
  request.get('/playlist/update/playcount', { params: { id } })

// 相关歌单推荐
export const getPlaylistDetailRcmd = (id: number) =>
  request.get('/playlist/detail/rcmd/get', { params: { id } })

// 公开隐私歌单
export const setPlaylistPrivacy = (id: number) =>
  request.get('/playlist/privacy', { params: { id } })
