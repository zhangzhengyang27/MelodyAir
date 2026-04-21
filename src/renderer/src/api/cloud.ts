import request from './index'
import { getCookieString } from './cookie'

// 云盘歌曲列表
export const getCloudList = (limit = 30, offset = 0) =>
  request.get('/user/cloud', { params: { limit, offset } })

// 云盘歌曲详情
export const getCloudDetail = (id: number | string) =>
  request.get('/user/cloud/detail', { params: { id } })

// 删除云盘歌曲
export const deleteCloudSong = (id: number | string) =>
  request.get('/user/cloud/del', { params: { id } })

/**
 * 上传歌曲到云盘（完整上传流程）
 * 后端自动处理：元数据解析 → MD5 → 检查上传 → NOS Token → 直传 → 发布
 * @param file 音频文件
 * @param onProgress 上传进度回调（可选）
 */
export const uploadToCloud = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<unknown> => {
  const formData = new FormData()
  formData.append('songFile', file)
  formData.append('cookie', getCookieString())

  const response = await request.post('/cloud', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      }
    }
  })
  return response
}

/**
 * 从 localStorage 读取并拼接完整的 cookie 字符串
 * @deprecated 使用 api/cookie.ts 中的 getCookieString() 替代
 */
function _getCookieString(): string {
  return getCookieString()
}

// 云盘上传（获取上传凭证）- 旧版保留兼容
export const getCloudUploadToken = (params: { md5: string; fileSize: number; filename: string }) =>
  request.post('/cloud/upload/token', { ...params })

// 完成云盘上传导入 - 旧版保留兼容
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
