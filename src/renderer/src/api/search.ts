import request from './index'

// 搜索
export const cloudSearch = (keywords: string, type = 1, limit = 30, offset = 0) =>
  request.get('/cloudsearch', { params: { keywords, type, limit, offset } })

// 热搜详情
export const getSearchHotDetail = () => request.get('/search/hot/detail')

// 搜索建议
export const getSearchSuggest = (keywords: string) =>
  request.get('/search/suggest', { params: { keywords } })
