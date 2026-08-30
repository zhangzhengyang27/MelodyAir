import request from './index'
import type { MvDetail, ApiResponse } from '@/types/api'

// MV 详情
export const getMvDetail = (mvid: number): Promise<MvDetail> =>
  request.get('/mv/detail', { params: { mvid } })

// MV 播放地址
export const getMvUrl = (id: number, r = 1080): Promise<ApiResponse> =>
  request.get('/mv/url', { params: { id, r } })

// 收藏/取消收藏 MV
export const subMv = (mvid: number, t: 1 | 2): Promise<ApiResponse> =>
  request.get('/mv/sub', { params: { mvid, t } })

// 收藏的 MV 列表（列表在 data 字段，直接以数组暴露）
export const getMvSublist = (): Promise<ApiResponse<unknown[]>> => request.get('/mv/sublist')

// MV 点赞转发评论数数据
export const getMvDetailInfo = (mvid: number): Promise<ApiResponse> =>
  request.get('/mv/detail/info', { params: { mvid } })

// 全部 MV
export const getMvAll = (params?: { area?: string; type?: string; order?: string; limit?: number; offset?: number }): Promise<ApiResponse> =>
  request.get('/mv/all', { params })

// 最新 MV
export const getMvFirst = (params?: { area?: string; limit?: number }): Promise<ApiResponse> =>
  request.get('/mv/first', { params })

// 网易出品 MV
export const getMvExclusiveRcmd = (limit = 30, offset = 0): Promise<ApiResponse> =>
  request.get('/mv/exclusive/rcmd', { params: { limit, offset } })

// MV 排行
export const getTopMv = (params?: { area?: string; limit?: number; offset?: number }): Promise<ApiResponse> =>
  request.get('/top/mv', { params })
