import type { Ref } from 'vue'

/**
 * 播放进度持久化 composable
 * 负责：保存/恢复播放进度到 localStorage
 */
export function usePlaybackProgress(deps: {
  currentSong: Ref<any>
  currentTime: Ref<number>
  playlist: Ref<any[]>
}) {
  let lastSaveTime = 0

  /**
   * 保存播放进度到 localStorage（节流，每次调用间隔至少 2 秒）
   */
  function savePlaybackProgress(): void {
    const now = Date.now()
    if (now - lastSaveTime < 2000) return
    lastSaveTime = now

    try {
      const data = {
        songId: deps.currentSong.value?.id ?? null,
        currentTime: deps.currentTime.value,
        timestamp: now
      }
      localStorage.setItem('melody-air:playbackProgress', JSON.stringify(data))
    } catch {
      // 忽略存储错误
    }
  }

  /**
   * 从 localStorage 恢复播放进度
   * @param currentSongId 当前播放歌曲 ID，传入时会精确校验歌曲是否匹配
   */
  function getSavedPlaybackProgress(currentSongId?: number): number {
    try {
      const raw = localStorage.getItem('melody-air:playbackProgress')
      if (!raw) return 0
      const data = JSON.parse(raw)
      // 如果保存时间超过 7 天，不恢复
      if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) return 0
      // 精确校验：如果传入了当前歌曲 ID，必须与保存的歌曲 ID 完全匹配
      if (currentSongId !== undefined) {
        if (data.songId !== currentSongId) return 0
      } else {
        // 兼容旧逻辑：只检查歌曲是否在播放列表中
        if (data.songId && !deps.playlist.value.some((s: any) => s.id === data.songId)) {
          return 0
        }
      }
      return data.currentTime || 0
    } catch {
      return 0
    }
  }

  return {
    savePlaybackProgress,
    getSavedPlaybackProgress,
  }
}
