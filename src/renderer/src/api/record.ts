import request from './index'
import type { ApiResponse } from '@/types/api'

// 最近播放歌曲
export const getRecentSong = (limit = 100): Promise<ApiResponse> =>
  request.get('/record/recent/song', { params: { limit } })

// 最近播放视频
export const getRecentVideo = (limit = 100): Promise<ApiResponse> =>
  request.get('/record/recent/video', { params: { limit } })

// 最近播放歌单
export const getRecentPlaylist = (limit = 100): Promise<ApiResponse> =>
  request.get('/record/recent/playlist', { params: { limit } })

// 最近播放专辑
export const getRecentAlbum = (limit = 100): Promise<ApiResponse> =>
  request.get('/record/recent/album', { params: { limit } })

// 最近播放播客
export const getRecentDj = (limit = 100): Promise<ApiResponse> =>
  request.get('/record/recent/dj', { params: { limit } })

// 听歌打卡
export const scrobble = (id: number, sourceid: number, time?: number): Promise<ApiResponse> =>
  request.get('/scrobble', { params: { id, sourceid, time } })
