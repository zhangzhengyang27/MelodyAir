import request from './index'
import type { CloudSearchResult, ApiResponse, SearchHotDetailItem } from '@/types/api'

// 搜索（更全）
export const cloudSearch = (keywords: string, type = 1, limit = 30, offset = 0): Promise<CloudSearchResult> =>
  request.get('/cloudsearch', { params: { keywords, type, limit, offset } })

// 搜索（旧版）
export const search = (keywords: string, type = 1, limit = 30, offset = 0): Promise<ApiResponse> =>
  request.get('/search', { params: { keywords, type, limit, offset } })

// 默认搜索关键词
export const getSearchDefault = (): Promise<ApiResponse> => request.get('/search/default')

// 热搜列表(简略)
export const getSearchHot = (): Promise<ApiResponse> => request.get('/search/hot')

// 热搜列表(详细)
export const getSearchHotDetail = (): Promise<ApiResponse<{ data: SearchHotDetailItem[] }>> => request.get('/search/hot/detail')

// 搜索建议
export const getSearchSuggest = (keywords: string) =>
  request.get('/search/suggest', { params: { keywords } })

// 搜索建议 - PC端
export const getSearchSuggestPc = (keyword: string) =>
  request.get('/search/suggest/pc', { params: { keyword } })

// 搜索多重匹配
export const getSearchMultimatch = (keywords: string) =>
  request.get('/search/multimatch', { params: { keywords } })

// 本地歌曲文件匹配网易云歌曲信息
export const searchMatch = (params: { title: string; album: string; artist: string; duration: number; md5: string }) =>
  request.get('/search/match', { params })
