/**
 * API 数据 → 应用模型的通用映射函数
 * 消除各处重复的 `s.ar?.map((a: any) => ...)` 等代码
 */
import type { Song, SongArtist, Playlist, UserProfile, Artist } from '@/types/api'

/**
 * 将 API 返回的艺术家数组映射为标准格式
 */
export function mapArtists(artists: Array<{ id: number; name: string }> | undefined): SongArtist[] {
  if (!artists) return []
  return artists.map(a => ({ id: a.id, name: a.name }))
}

/**
 * 将 API 返回的专辑信息映射为标准格式
 */
export function mapAlbum(
  al: { id?: number; name?: string; picUrl?: string; blurPicUrl?: string } = {}
): TrackInfo['album'] {
  return {
    id: al.id ?? 0,
    name: al.name ?? '',
    picUrl: al.picUrl ?? al.blurPicUrl ?? '',
  }
}

/**
 * 将完整歌曲对象映射为精简播放用 Track 对象
 * 用于播放列表、队列等场景
 */
export interface TrackInfo {
  id: number
  name: string
  artists: SongArtist[]
  album: { id: number; name: string; picUrl: string }
  duration: number
  /** 原始数据（保留用于扩展字段访问） */
  raw: Song
}

export function mapSongToTrack(s: Song): TrackInfo {
  return {
    id: s.id,
    name: s.name,
    artists: mapArtists(s.ar),
    album: mapAlbum(s.al),
    duration: s.dt,
    raw: s,
  }
}

/**
 * 将歌单列表项映射为标准 Playlist 格式
 */
export function mapPlaylist(p: Record<string, unknown>): Playlist {
  const coverImgUrl = (p.coverImgUrl as string) || (p.picUrl as string) || ''
  return {
    id: p.id as number,
    name: p.name as string,
    coverImgUrl,
    trackCount: (p.trackCount as number) || 0,
    playCount: (p.playCount as number) || 0,
  }
}

/**
 * 将用户资料映射为标准 UserProfile
 */
export function mapUserProfile(data: Record<string, unknown>): UserProfile {
  return {
    userId: data.userId as number || data.id as number || 0,
    nickname: data.nickname as string || data.userName as string || '',
    avatarUrl: data.avatarUrl as string || '',
    backgroundUrl: data.backgroundUrl as string,
    vipType: data.vipType as number,
  }
}

/**
 * 将歌手列表映射为标准 Artist 列表
 */
export function mapArtistsFull(artists: Array<Record<string, unknown>>): Artist[] {
  return (artists || []).map(a => ({
    id: a.id as number,
    name: a.name as string,
    picUrl: a.picUrl as string,
    alias: a.alias as string[],
  }))
}
