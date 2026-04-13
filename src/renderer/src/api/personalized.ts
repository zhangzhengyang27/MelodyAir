import request from './index'

// 首页 banner（文档接口为 /banner）
export const getBanner = (type = 0) =>
  request.get('/banner', { params: { type } })

// 个性化推荐歌单
export const getPersonalized = (limit = 30) =>
  request.get('/personalized', { params: { limit } })

// 个性化推荐新歌
export const getPersonalizedNewSong = (limit = 10) =>
  request.get('/personalized/newsong', { params: { limit } })

// 个性化推荐 MV
export const getPersonalizedMv = () => request.get('/personalized/mv')

// 推荐电台
export const getPersonalizedDjprogram = () => request.get('/personalized/djprogram')

// 独家放送(入口列表)
export const getPersonalizedPrivatecontent = () => request.get('/personalized/privatecontent')

// 独家放送列表
export const getPersonalizedPrivatecontentList = (limit = 60, offset = 0) =>
  request.get('/personalized/privatecontent/list', { params: { limit, offset } })

// 每日推荐歌曲
export const getRecommendSongs = () => request.get('/recommend/songs')

// 每日推荐歌单
export const getRecommendResource = () => request.get('/recommend/resource')

// 每日推荐歌曲不感兴趣
export const dislikeRecommendSong = (id: number) =>
  request.get('/recommend/songs/dislike', { params: { id } })

// 首页-发现
export const getHomepageBlockPage = (params?: { refresh?: boolean; cursor?: string }) =>
  request.get('/homepage/block/page', { params })

// 首页-发现-圆形图标入口列表
export const getHomepageDragonBall = () =>
  request.get('/homepage/dragon/ball')
