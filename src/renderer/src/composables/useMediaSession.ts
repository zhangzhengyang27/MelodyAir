import type { Ref } from 'vue'
import type { Song } from '@/stores/player'

/**
 * MediaSession composable
 * 负责：更新系统通知栏歌曲信息、播放状态
 */
export function useMediaSession(deps: {
  playing: Ref<boolean>
  currentTime: Ref<number>
  duration: Ref<number>
  togglePlaying: () => void
  playPrev: () => void
  playNext: () => void
  seek: (time: number) => void
  stopPlayback: () => void
}) {
  /**
   * 根据 URL 推断图片 MIME 类型
   */
  function inferImageType(url: string): string {
    const lower = url.toLowerCase().split('?')[0]
    if (lower.endsWith('.webp')) return 'image/webp'
    if (lower.endsWith('.png')) return 'image/png'
    if (lower.endsWith('.gif')) return 'image/gif'
    return 'image/jpeg'
  }

  /**
   * 更新 MediaSession 元数据
   */
  function updateMediaSession(song: Song): void {
    if (!('mediaSession' in navigator)) return

    const artwork = song.album.picUrl
      ? [{ src: song.album.picUrl, sizes: '512x512', type: inferImageType(song.album.picUrl) }]
      : []

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name,
      artist: song.artists.map(a => a.name).join(', '),
      album: song.album.name,
      artwork,
    })

    navigator.mediaSession.setActionHandler('play', () => {
      if (!deps.playing.value) deps.togglePlaying()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (deps.playing.value) deps.togglePlaying()
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => deps.playPrev())
    navigator.mediaSession.setActionHandler('nexttrack', () => deps.playNext())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        deps.seek(details.seekTime)
      }
    })
    navigator.mediaSession.setActionHandler('stop', () => {
      deps.stopPlayback()
      deps.playing.value = false
    })
  }

  /**
   * 更新 MediaSession 播放状态（用于 seek 进度条）
   */
  function updateMediaSessionPlaybackState(): void {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setPositionState!(deps.duration.value > 0 ? {
        duration: deps.duration.value,
        playbackRate: 1,
        position: Math.min(deps.currentTime.value, deps.duration.value)
      } : undefined)
    } catch {
      // 忽略 position 超出范围的错误
    }
  }

  return {
    updateMediaSession,
    updateMediaSessionPlaybackState,
  }
}
