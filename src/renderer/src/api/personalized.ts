import request from './index'

// 首页 banner
export const getBanner = (type = 0) =>
  request.get('/homepage/banner', { params: { type } })

// 个性化推荐歌单
export const getPersonalized = (limit = 12) =>
  request.get('/personalized', { params: { limit } })

// 个性化推荐新歌
export const getPersonalizedNewSong = (limit = 12) =>
  request.get('/personalized/newsong', { params: { limit } })

// 个性化推荐 MV
export const getPersonalizedMv = () => request.get('/personalized/mv')

// 每日推荐歌曲
export const getRecommendSongs = () => request.get('/recommend/songs')
