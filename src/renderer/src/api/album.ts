import request from './index'
import type { AlbumDetail, ApiResponse } from '@/types/api'

// 专辑内容
export const getAlbumDetail = (id: number): Promise<AlbumDetail> =>
  request.get('/album/detail', { params: { id } })

// 专辑动态信息
/** /album/detail/dynamic 响应：isSub 在顶层 */
export interface AlbumDetailDynamicResponse {
  code: number
  isSub?: boolean
  subTime?: number
}

export const getAlbumDetailDynamic = (id: number): Promise<AlbumDetailDynamicResponse> =>
  request.get('/album/detail/dynamic', { params: { id } })

// 收藏/取消收藏专辑
export const subAlbum = (id: number, t: 1 | 0): Promise<ApiResponse> =>
  request.get('/album/sub', { params: { id, t } })

// 已收藏专辑列表（列表在 data 字段，直接以数组暴露）
export const getAlbumSublist = (limit = 25, offset = 0): Promise<ApiResponse<unknown[]>> =>
  request.get('/album/sublist', { params: { limit, offset } })

// 新碟上架
export const getTopAlbum = (params?: { area?: string; type?: string; year?: string; month?: string; limit?: number; offset?: number }) =>
  request.get('/top/album', { params })

// 全部新碟
export const getAlbumNew = (params?: { area?: string; limit?: number; offset?: number }) =>
  request.get('/album/new', { params })

// 最新专辑
export const getAlbumNewest = () =>
  request.get('/album/newest')

// 数字专辑详情
export const getDigitalAlbumDetail = (id: number) =>
  request.get('/album/detail', { params: { id } })

// 获取专辑歌曲的音质
export const getAlbumPrivilege = (id: number) =>
  request.get('/album/privilege', { params: { id } })
