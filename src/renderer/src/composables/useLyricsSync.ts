import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'

/**
 * 歌词交互（点击歌词行跳转）。
 *
 * 重要：歌词的自动高亮同步**不在这里**，而是由 player store 的 timeUpdate 全局统一驱动。
 * 历史上这里曾持有一个 LyricsSyncEngine 并监听 lyricsStore.lines / playerStore.currentTime
 * 写入 currentIndex，与 player store 的引擎形成多个写入方：
 * 各引擎独立维护 currentIndex，会互相把 store 的 currentIndex 重置回 -1，
 * 导致桌面歌词在「歌词」与「歌名」之间高频闪烁。现统一收敛为单一写入方。
 */
export function useLyricsSync() {
  const playerStore = usePlayerStore()
  const lyricsStore = useLyricsStore()

  /** 点击歌词行跳转到对应时间，并立即高亮该行 */
  function seekToIndex(index: number) {
    const line = lyricsStore.lines[index]
    if (!line) return
    // 抑制自动同步，避免音频引擎回传旧时间点把高亮拽回跳转前
    lyricsStore.suppressSync()
    playerStore.seek(line.time / 1000)
    lyricsStore.setCurrentIndex(index)
  }

  /** 手动抑制自动同步一段时间（拖动进度条等场景） */
  function setSeekPause(ms?: number) {
    lyricsStore.suppressSync(ms)
  }

  return {
    seekToIndex,
    setSeekPause,
  }
}
