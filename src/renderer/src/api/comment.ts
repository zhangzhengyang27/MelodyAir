import request from './index'

// 热门评论
export const getCommentHot = (
  id: number,
  type: 'music' | 'mv' | 'playlist' | 'album' | 'dj' = 'music',
  limit = 20,
  offset = 0
) =>
  request.get('/comment/hot', { params: { id, type, limit, offset } })

// 最新评论
export const getCommentNew = (
  id: number,
  type: 'music' | 'mv' | 'playlist' | 'album' | 'dj' = 'music',
  limit = 20,
  offset = 0
) =>
  request.get('/comment/new', { params: { id, type, limit, offset } })

// 点赞评论
export const likeComment = (id: number, cid: number, t: 1 | 0, type: 'music' | 'mv' | 'playlist' | 'album' | 'dj' = 'music') =>
  request.get('/comment/like', { params: { id, cid, t, type } })

// 发送评论
export const sendComment = (
  t: number, // 1: 发送, 2: 回复
  type: number, // 0: song, 1: mv, 2: playlist, 3: album
  id: number,
  content: string,
  commentId?: number
) => {
  const params: Record<string, any> = { t, type, id, content }
  if (commentId) params.commentId = commentId
  return request.get('/comment', { params })
}
