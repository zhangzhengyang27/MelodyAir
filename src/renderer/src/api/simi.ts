import request from './index'
import type { ApiResponse } from '@/types/api'

// 相似歌曲
export const getSimiSong = (id: number): Promise<ApiResponse> =>
  request.get('/simi/song', { params: { id } })

// 相似歌单
export const getSimiPlaylist = (id: number): Promise<ApiResponse> =>
  request.get('/simi/playlist', { params: { id } })

// 相似歌手
export const getSimiArtist = (id: number): Promise<ApiResponse> =>
  request.get('/simi/artist', { params: { id } })

// 获取最近5个听了这首歌的用户
export const getSimiUser = (id: number): Promise<ApiResponse> =>
  request.get('/simi/user', { params: { id } })
