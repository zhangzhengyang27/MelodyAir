import { watch, onBeforeUnmount, type Ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'
import { LyricsSyncEngine } from '@/utils/lyricsSyncEngine'
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
    const result = syncEngine.update(time)
    if (result.changed) {
      lyricsStore.setCurrentIndex(result.index)
    }
  }

  watch(
    () => lyricsStore.lines,
    (lines) => {
      syncEngine.setLines(lines)
      syncEngine.reset()
      syncNow(playerStore.currentTime)
    },
    { immediate: true }
  )

  watch(
    () => lyricsStore.offsetMs,
    (offset) => syncEngine.setOffsetMs(offset)
  )

  watch(
    () => playerStore.currentTime,
    (time) => syncNow(time)
  )

  watch(
    () => linesRef?.value,
    (lines) => {
      if (lines) syncEngine.setLines(lines)
    },
    { immediate: true, deep: false }
  )

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
