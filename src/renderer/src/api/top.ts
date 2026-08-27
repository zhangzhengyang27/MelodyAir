import request from './index'
import type { ApiResponse } from '@/types/api'

// 所有榜单
export const getToplist = (): Promise<ApiResponse> => request.get('/toplist')

// 所有榜单内容摘要
export const getToplistDetail = (): Promise<ApiResponse> => request.get('/toplist/detail')

// 歌手榜
export const getToplistArtist = (type = 1): Promise<ApiResponse> =>
  request.get('/top/artist', { params: { type } })

// 新歌速递
export const getTopSong = (type = 0): Promise<ApiResponse> =>
  request.get('/top/song', { params: { type } })
