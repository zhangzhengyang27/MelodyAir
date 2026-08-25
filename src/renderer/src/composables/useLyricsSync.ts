import { watch, onBeforeUnmount, type Ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'
import { LyricsSyncEngine } from '@/utils/o3icsSyncEngine'
import type { ParsedLyricLine } from '@/types/lyrics'

export function useLyricsSync(linesRef?: Ref<ParsedLyricLine[]>) {
  const playerStore = usePlayerStore()
  const lyricsStore = useLyricsStore()

  const syncEngine = new LyricsSyncEngine({
    offsetMs: lyricsStore.offsetMs,
    toleranceMs: 120,
  })

  let pausedBySeek = false
  let resumeTimer: ReturnType<typeof setTimeout> | null = null

  function setSeekPause() {
    pausedBySeek = true
    if (resumeTimer) clearTimeout(resumeTimer)
    resumeTimer = setTimeout(() => {
      pausedBySeek = false
    }, 900)
  }

  function syncNow(time = playerStore.currentTime) {
    if (!lyricsStore.hasLyrics || lyricsStore.isDraggingProgress || pausedBySeek) return
    // playerStore.currentTime 是秒，syncEngine 期望毫秒
    const result = syncEngine.update(time * 1000)
    if (result.changed) {
      lyricsStore.setCurrentIndex(result.index)
    }
  }

  // 监听歌词行变化（切换歌曲时重置状态）
  watch(
    () => lyricsStore.lines,
    (lines) => {
      syncEngine.setLines(lines)
      syncEngine.reset()
      // 切换歌曲时重置 currentIndex
      lyricsStore.setCurrentIndex(-1)
      syncNow(playerStore.currentTime)
    },
    { immediate: true }
  )

  // 监听时间偏移变化
  watch(
    () => lyricsStore.offsetMs,
    (offset) => syncEngine.setOffsetMs(offset)
  )

  // 监听播放时间变化
  watch(
    () => playerStore.currentTime,
    (time) => syncNow(time)
  )

  // 监听外部传入的歌词行（可选）
  if (linesRef) {
    watch(
      () => linesRef.value,
      (lines) => {
        if (lines) syncEngine.setLines(lines)
      },
      { immediate: true, deep: false }
    )
  }

  function seekToIndex(index: number) {
    const line = lyricsStore.lines[index]
    if (!line) return
    setSeekPause()
    playerStore.seek(line.time / 1000)
    lyricsStore.setCurrentIndex(index)
  }

  onBeforeUnmount(() => {
    if (resumeTimer) clearTimeout(resumeTimer)
  })

  return {
    syncEngine,
    syncNow,
    seekToIndex,
    setSeekPause,
  }
}
