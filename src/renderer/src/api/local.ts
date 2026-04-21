import request from './index'
import type { ApiResponse } from '@/types/api'

// ==================== 音乐库管理 ====================

export const getLibraries = (): Promise<ApiResponse> => request.get('/library')

export const getLibrary = (id: number): Promise<ApiResponse> => request.get(`/library/${id}`)

export const createLibrary = (data: { name: string; path: string }): Promise<ApiResponse> =>
  request.post('/library', data)

export const updateLibrary = (id: number, data: { name?: string; path?: string }): Promise<ApiResponse> =>
  request.put(`/library/${id}`, data)

export const deleteLibrary = (id: number): Promise<ApiResponse> => request.delete(`/library/${id}`)

export const scanLibrary = (id: number): Promise<ApiResponse> => request.post(`/library/${id}/scan`)

// ==================== 本地文件 ====================

export const getFiles = (params?: { libraryId?: number; page?: number; limit?: number }) =>
  request.get('/audio-file', { params })

export const getFile = (id: number) => request.get(`/audio-file/${id}`)

export const deleteFile = (id: number) => request.delete(`/audio-file/${id}`)

/**
 * 上传音频文件（本地磁盘 + OSS 双写）
 * @param file 音频文件
 * @param libraryId 音乐库 ID
 * @param onProgress 上传进度回调
 */
export const uploadFile = (
  file: File,
  libraryId: number,
  onProgress?: (percent: number) => void,
) => {
  const formData = new FormData()
  formData.append('file', file)

  return request.post<any, any>(`/audio-file/upload?libraryId=${libraryId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
}

/**
 * 获取文件的 OSS 签名访问 URL（私有 Bucket 临时 URL）
 * @param id 文件 ID
 * @returns 签名 URL（有效期 1 小时）
 */
export const getOssUrl = (id: number) => request.get<{ url: string }>(`/audio-file/${id}/oss-url`)

// ==================== 本地音轨 ====================

export const getTracks = (params?: { songId?: number; albumId?: number; page?: number; limit?: number }) =>
  request.get('/local-track', { params })

export const getTrack = (id: number) => request.get(`/local-track/${id}`)

// ==================== 本地歌曲 ====================

export const getLocalSongs = (params?: { artistId?: number; page?: number; limit?: number }) =>
  request.get('/local-song', { params })

export const getLocalSong = (id: number) => request.get(`/local-song/${id}`)

// ==================== 本地专辑 ====================

export const getLocalAlbums = (params?: { artistId?: number; page?: number; limit?: number }) =>
  request.get('/local-album', { params })

export const getLocalAlbum = (id: number) => request.get(`/local-album/${id}`)

// ==================== 本地歌手 ====================

export const getLocalArtists = (params?: { page?: number; limit?: number }) =>
  request.get('/local-artist', { params })

export const getLocalArtist = (id: number) => request.get(`/local-artist/${id}`)

// ==================== 本地播放列表 ====================

export const getLocalPlaylists = () => request.get('/local-playlist')

export const getLocalPlaylist = (id: number) => request.get(`/local-playlist/${id}`)

export const createLocalPlaylist = (data: { name: string; description?: string }) =>
  request.post('/local-playlist', data)

export const updateLocalPlaylist = (id: number, data: { name?: string; description?: string }) =>
  request.put(`/local-playlist/${id}`, data)

export const deleteLocalPlaylist = (id: number) => request.delete(`/local-playlist/${id}`)

export const addSongToLocalPlaylist = (playlistId: number, songId: number) =>
  request.post(`/local-playlist/${playlistId}/songs`, { songId })

export const removeSongFromLocalPlaylist = (playlistId: number, songId: number) =>
  request.delete(`/local-playlist/${playlistId}/songs/${songId}`)

// ==================== 元数据刮削 ====================

export const scrapeTrack = (trackId: number) => request.post(`/metadata/scrape/${trackId}`)

export const manualMatch = (trackId: number, neteaseSongId: string) =>
  request.post(`/metadata/match/${trackId}`, { neteaseSongId })

export const removeMatch = (trackId: number) => request.delete(`/metadata/match/${trackId}`)

export const autoScrape = () => request.post('/metadata/auto-scrape')

// ==================== 歌词 ====================

export const getLocalLyrics = (songId: number) => request.get(`/lyrics/song/${songId}`)

export const upsertLocalLyrics = (songId: number, data: { plain: string; synced?: any }) =>
  request.put(`/lyrics/song/${songId}`, data)

export const deleteLocalLyrics = (songId: number) => request.delete(`/lyrics/song/${songId}`)

export const searchLocalLyrics = (keyword: string, limit = 20) =>
  request.get('/lyrics/search', { params: { keyword, limit } })

// ==================== 流媒体播放 ====================

export const getStreamUrl = (trackId: number) => `/stream/${trackId}`

export const getStreamInfo = (trackId: number) => request.get(`/stream/${trackId}/info`)

// ==================== 数据维护 ====================

export const cleanupOrphanedRecords = () => request.post('/housekeeping/cleanup')

export const getLibraryStats = () => request.get('/housekeeping/stats')
