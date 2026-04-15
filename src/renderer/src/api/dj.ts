import request from './index'

// 分类
export const getDjCatelist = () => request.get('/dj/catelist')

// 推荐
export const getDjRecommend = () => request.get('/dj/recommend')
export const getDjPersonalizeRecommend = (limit = 6) =>
  request.get('/dj/personalize/recommend', { params: { limit } })
export const getDjBanner = () => request.get('/dj/banner')
export const getDjTodayPerfered = (page = 0) =>
  request.get('/dj/today/perfered', { params: { page } })

// 分类浏览
export const getDjCategoryRecommend = (type?: number) =>
  request.get('/dj/category/recommend', { params: { type } })
export const getDjCategoryExcludehot = () => request.get('/dj/category/excludehot')
export const getDjRadioHot = (params?: { cateId?: number; limit?: number; offset?: number }) =>
  request.get('/dj/radio/hot', { params })
export const getDjHot = (params?: { limit?: number; offset?: number }) =>
  request.get('/dj/hot', { params })

// 电台详情
export const getDjDetail = (rid: number) => request.get('/dj/detail', { params: { rid } })
export const getDjProgram = (params: { rid: number; limit?: number; offset?: number; asc?: boolean }) =>
  request.get('/dj/program', { params })

// 订阅管理
export const subDj = (id: number, t: 1 | 0) =>
  request.get('/dj/sub', { params: { id, t, timestamp: Date.now() } })
export const getDjSublist = (limit = 30, offset = 0) =>
  request.get('/dj/sublist', { params: { limit, offset } })

// 节目详情
export const getDjProgramDetail = (id: number) =>
  request.get('/dj/program/detail', { params: { id } })
export const getProgramDetail = (id: number) =>
  request.get('/program/detail', { params: { id } })

// 推荐节目
export const getProgramRecommend = () => request.get('/program/recommend')

// 榜单
export const getDjProgramToplistHours = (limit = 100) =>
  request.get('/dj/program/toplist/hours', { params: { limit } })
export const getDjToplistPopular = (limit = 100) =>
  request.get('/dj/toplist/popular', { params: { limit } })
export const getDjToplistPay = (limit = 100) =>
  request.get('/dj/toplist/pay', { params: { limit } })
export const getProgramToplist = (limit = 100, offset = 0) =>
  request.get('/program/toplist', { params: { limit, offset } })

// 付费精品
export const getDjPaygift = (limit = 30, offset = 0) =>
  request.get('/dj/paygift', { params: { limit, offset } })
