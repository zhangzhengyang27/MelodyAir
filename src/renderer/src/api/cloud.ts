import request from './index'

// 云盘歌曲列表
export const getCloudList = (limit = 30, offset = 0) =>
  request.get('/user/cloud', { params: { limit, offset } })

// 云盘歌曲详情
export const getCloudDetail = (id: number | string) =>
  request.get('/user/cloud/detail', { params: { id } })

// 删除云盘歌曲
export const deleteCloudSong = (id: number | string) =>
  request.get('/user/cloud/del', { params: { id } })

// 云盘上传（获取上传凭证）
export const getCloudUploadToken = (params: { md5: string; fileSize: number; filename: string }) =>
  request.post('/cloud/upload/token', { ...params })

// 完成云盘上传导入
export const completeCloudUpload = (params: { songId: string; resourceId: string; md5: string; filename: string; song?: string; artist?: string; album?: string }) =>
  request.post('/cloud/upload/complete', { ...params })

// 云盘歌曲信息匹配纠正
export const cloudMatch = (uid: number, sid: string, asid: string) =>
  request.get('/cloud/match', { params: { uid, sid, asid } })

// 获取云盘歌词
export const getCloudLyric = (uid: number, sid: string) =>
  request.get('/cloud/lyric/get', { params: { uid, sid } })

// 云盘导入歌曲（无需上传文件）
export const cloudImport = (params: { song: string; fileType: string; fileSize: number; bitrate: number; md5: string; id?: number; artist?: string; album?: string }) =>
  request.get('/cloud/import', { params })
