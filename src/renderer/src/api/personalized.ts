import request from './index'
import type { ApiResponse, PersonalizedSong } from '@/types/api'

// 首页 banner（文档接口为 /banner）
export const getBanner = (type = 0): Promise<ApiResponse> =>
  request.get('/banner', { params: { type } })

// 个性化推荐歌单
export const getPersonalized = (limit = 30): Promise<ApiResponse<{ result: Playlist[] }>> =>
  request.get('/personalized', { params: { limit } })

// 个性化推荐新歌
export const getPersonalizedNewSong = (limit = 10): Promise<ApiResponse<{ result: PersonalizedSong[] }>> =>
  request.get('/personalized/newsong', { params: { limit } })

// 个性化推荐 MV
export const getPersonalizedMv = (): Promise<ApiResponse> => request.get('/personalized/mv')

// 推荐电台
export const getPersonalizedDjprogram = (): Promise<ApiResponse> => request.get('/personalized/djprogram')

// 独家放送(入口列表)
export const getPersonalizedPrivatecontent = (): Promise<ApiResponse> => request.get('/personalized/privatecontent')

// 独家放送列表
export const getPersonalizedPrivatecontentList = (limit = 60, offset = 0): Promise<ApiResponse> =>
  request.get('/personalized/privatecontent/list', { params: { limit, offset } })

// 每日推荐歌曲
export const getRecommendSongs = (): Promise<ApiResponse<{ data: PersonalizedSong[]; dailyTaskPlayV2?: unknown }>> => request.get('/recommend/songs')

// 每日推荐歌单
export const getRecommendResource = (): Promise<ApiResponse> => request.get('/recommend/resource')

// 每日推荐歌曲不感兴趣
export const dislikeRecommendSong = (id: number): Promise<ApiResponse> =>
  request.get('/recommend/songs/dislike', { params: { id } })

// 首页-发现
export const getHomepageBlockPage = (params?: { refresh?: boolean; cursor?: string }): Promise<ApiResponse> =>
  request.get('/homepage/block/page', { params })

// 首页-发现-圆形图标入口列表
export const getHomepageDragonBall = (): Promise<ApiResponse> =>
  request.get('/homepage/dragon/ball')
