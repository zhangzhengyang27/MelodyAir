import request from './index'
import type { CommentResponse, ApiResponse } from '@/types/api'

// 歌曲评论
export const getCommentMusic = (id: number, limit = 20, offset = 0, before?: number): Promise<CommentResponse> =>
  request.get('/comment/music', { params: { id, limit, offset, before } })

// 专辑评论
export const getCommentAlbum = (id: number, limit = 20, offset = 0, before?: number): Promise<CommentResponse> =>
  request.get('/comment/album', { params: { id, limit, offset, before } })

// 歌单评论
export const getCommentPlaylist = (id: number, limit = 20, offset = 0, before?: number): Promise<CommentResponse> =>
  request.get('/comment/playlist', { params: { id, limit, offset, before } })

// MV 评论
export const getCommentMv = (id: number, limit = 20, offset = 0, before?: number): Promise<CommentResponse> =>
  request.get('/comment/mv', { params: { id, limit, offset, before } })

// 电台节目评论
export const getCommentDj = (id: number, limit = 20, offset = 0, before?: number): Promise<ApiResponse> =>
  request.get('/comment/dj', { params: { id, limit, offset, before } })

// 视频评论
export const getCommentVideo = (id: number, limit = 20, offset = 0, before?: number): Promise<ApiResponse> =>
  request.get('/comment/video', { params: { id, limit, offset, before } })

// 热门评论（通用）
export const getCommentHot = (id: number, type: number, limit = 20, offset = 0, before?: number): Promise<ApiResponse> =>
  request.get('/comment/hot', { params: { id, type, limit, offset, before } })

// 新版评论接口
export const getCommentNew = (params: { id: number; type: number; pageNo?: number; pageSize?: number; sortType?: number; cursor?: number }): Promise<ApiResponse> =>
  request.get('/comment/new', { params })

// 楼层评论
export const getCommentFloor = (params: { parentCommentId: number; id: number; type: number; limit?: number; time?: number }): Promise<ApiResponse> =>
  request.get('/comment/floor', { params })

// 评论统计数据
export const getCommentInfoList = (type: number, ids: string): Promise<ApiResponse> =>
  request.get('/comment/info/list', { params: { type, ids } })

// 给评论点赞
export const likeComment = (id: number, cid: number, t: 1 | 0, type: number): Promise<ApiResponse> =>
  request.get('/comment/like', { params: { id, cid, t, type } })

// 发送/删除评论
export const sendComment = (params: { t: number; type: number; id: number; content: string; commentId?: number; threadId?: string }): Promise<ApiResponse> =>
  request.get('/comment', { params })

// 获取动态评论
export const getCommentEvent = (threadId: string): Promise<ApiResponse> =>
  request.get('/comment/event', { params: { threadId } })

// 抱一抱评论
export const hugComment = (uid: number, cid: number, sid: number): Promise<ApiResponse> =>
  request.get('/hug/comment', { params: { uid, cid, sid } })

// 评论抱一抱列表
export const getCommentHugList = (params: { uid: number; cid: number; sid: number; page?: number; cursor?: number; idCursor?: number; pageSize?: number }): Promise<ApiResponse> =>
  request.get('/comment/hug/list', { params })
