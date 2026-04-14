import request from './index'

// ==================== 音乐库管理 ====================

export const getLibraries = () => request.get('/library')

export const getLibrary = (id: number) => request.get(`/library/${id}`)

export const createLibrary = (data: { name: string; path: string }) =>
  request.post('/library', data)

export const updateLibrary = (id: number, data: { name?: string; path?: string }) =>
  request.put(`/library/${id}`, data)

export const deleteLibrary = (id: number) => request.delete(`/library/${id}`)

export const scanLibrary = (id: number) => request.post(`/library/${id}/scan`)

// ==================== 本地文件 ====================

export const getFiles = (params?: { libraryId?: number; page?: number; limit?: number }) =>
  request.get('/audio-file', { params })

export const getFile = (id: number) => request.get(`/audio-file/${id}`)

export const deleteFile = (id: number) => request.delete(`/audio-file/${id}`)

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
