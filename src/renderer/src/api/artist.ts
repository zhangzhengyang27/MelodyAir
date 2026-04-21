import request from './index'
import type { ArtistDetail, Artist, ApiResponse } from '@/types/api'

// 获取歌手单曲（热门歌曲）
export const getArtistSongs = (id: number): Promise<ApiResponse> =>
  request.get('/artists', { params: { id } })

// 歌手热门 50 首歌曲
export const getArtistTopSong = (id: number): Promise<ApiResponse> =>
  request.get('/artist/top/song', { params: { id } })

// 歌手全部歌曲
export const getArtistAllSongs = (id: number, params?: { order?: string; limit?: number; offset?: number }): Promise<ApiResponse> =>
  request.get('/artist/songs', { params: { id, ...params } })

// 歌手详情
export const getArtistDetail = (id: number): Promise<ArtistDetail> =>
  request.get('/artist/detail', { params: { id } })

// 歌手详情动态（是否关注等）
export const getArtistDetailDynamic = (id: number): Promise<ApiResponse<{ isSub?: boolean }>> =>
  request.get('/artist/detail/dynamic', { params: { id } })

// 歌手描述
export const getArtistDesc = (id: number) =>
  request.get('/artist/desc', { params: { id } })

// 歌手专辑
export const getArtistAlbum = (id: number, limit = 30, offset = 0) =>
  request.get('/artist/album', { params: { id, limit, offset } })

// 歌手 MV
export const getArtistMv = (id: number, limit = 30, offset = 0) =>
  request.get('/artist/mv', { params: { id, limit, offset } })

// 歌手视频
export const getArtistVideo = (id: number, params?: { size?: number; cursor?: number; order?: number }) =>
  request.get('/artist/video', { params: { id, ...params } })

// 收藏/取消收藏歌手
export const subArtist = (id: number, t: 1 | 2) =>
  request.get('/artist/sub', { params: { id, t } })

// 收藏的歌手列表
export const getArtistSublist = (limit = 25, offset = 0) =>
  request.get('/artist/sublist', { params: { limit, offset } })

// 歌手分类列表
export const getArtistList = (params?: { type?: number; area?: number; initial?: string; limit?: number; offset?: number }) =>
  request.get('/artist/list', { params })

// 热门歌手
export const getTopArtists = (limit = 50, offset = 0) =>
  request.get('/top/artists', { params: { limit, offset } })

// 歌手粉丝
export const getArtistFans = (id: number, limit = 20, offset = 0) =>
  request.get('/artist/fans', { params: { id, limit, offset } })

// 歌手粉丝数量
export const getArtistFollowCount = (id: number) =>
  request.get('/artist/follow/count', { params: { id } })

// 关注歌手新歌
export const getArtistNewSong = (params?: { limit?: number; before?: number }) =>
  request.get('/artist/new/song', { params })

// 关注歌手新 MV
export const getArtistNewMv = (params?: { limit?: number; before?: number }) =>
  request.get('/artist/new/mv', { params })
