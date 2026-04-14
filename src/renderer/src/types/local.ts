// 本地音乐库
export interface LocalLibrary {
  id: number
  name: string
  slug: string
  path: string
  createdAt: string
  updatedAt: string
  _count?: { files: number }
}

// 本地文件
export interface LocalFile {
  id: number
  path: string
  fileName: string
  checksum: string
  fileSize: number
  format: string
  bitrate: number | null
  duration: number | null
  registerDate: string
  libraryId: number
  track?: LocalTrack | null
}

// 本地音轨
export interface LocalTrack {
  id: number
  name: string
  discIndex: number | null
  trackIndex: number | null
  type: 'Audio' | 'Video'
  isBonus: boolean
  isRemastered: boolean
  sourceFileId: number
  songId: number | null
  albumId: number | null
  song?: LocalSong | null
  album?: LocalAlbum | null
  sourceFile?: LocalFile
}

// 本地歌曲
export interface LocalSong {
  id: number
  name: string
  slug: string
  sortName: string
  artistId: number
  artist?: LocalArtist
  featuring?: LocalArtist[]
  masterId: number | null
  neteaseSongId: string | null
  bpm: number | null
  registeredAt: string
  lyrics?: LocalLyrics | null
  tracks?: LocalTrack[]
}

// 本地专辑
export interface LocalAlbum {
  id: number
  name: string
  slug: string
  sortName: string
  releaseDate: string | null
  albumType: string
  artistId: number | null
  artist?: LocalArtist | null
  coverPath: string | null
  coverBlurhash: string | null
  coverColors: string[]
  neteaseAlbumId: string | null
  tracks?: LocalTrack[]
  registeredAt: string
}

// 本地歌手
export interface LocalArtist {
  id: number
  name: string
  slug: string
  sortName: string
  avatarPath: string | null
  avatarBlurhash: string | null
  biography: string | null
  neteaseArtistId: string | null
  albums?: LocalAlbum[]
  songs?: LocalSong[]
  registeredAt: string
}

// 本地歌词
export interface LocalLyrics {
  id: number
  plain: string
  synced: Record<string, string> | null
  songId: number
}

// 本地播放列表
export interface LocalPlaylist {
  id: number
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  coverPath: string | null
  ownerId: number
  entries?: LocalPlaylistEntry[]
  createdAt: string
  updatedAt: string
}

export interface LocalPlaylistEntry {
  id: number
  songId: number
  song?: LocalSong
  playlistId: number
  position: number
  addedAt: string
}

// 扫描结果
export interface ScanResult {
  added: number
  updated: number
  skipped: number
  removed: number
  errors: string[]
  queuedForScrape: number
}

// 刮削结果
export interface ScrapeResult {
  matched: boolean
  neteaseSongId?: string
  neteaseSongName?: string
  hasLyrics?: boolean
  hasCover?: boolean
  message?: string
  candidatesCount?: number
}

// 库统计
export interface LibraryStats {
  libraries: number
  files: number
  tracks: number
  songs: number
  albums: number
  artists: number
  playlists: number
  unassignedTracks: number
  songsWithLyrics: number
  songsWithNeteaseMatch: number
}

// 流信息
export interface StreamInfo {
  id: number
  name: string
  type: string
  discIndex: number | null
  trackIndex: number | null
  duration: number | null
  bitrate: number | null
  format: string | null
  fileSize: number | null
  song: {
    id: number
    name: string
    artist: string | null
    album: string | null
    hasLyrics: boolean
  } | null
}
