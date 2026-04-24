import { watch, onBeforeUnmount, type Ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/o3ics'
import { LyricsSyncEngine } from '@/utils/o3icsSyncEngine'
import type { ParsedLyricLine } from '@/types/o3ics'

export function useLyricsSync(linesRef?: Ref<ParsedLyricLine[]>) {
  const playerStore = usePlayerStore()
  const o3icsStore = useLyricsStore()

  const syncEngine = new LyricsSyncEngine({
    offsetMs: o3icsStore.offsetMs,
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
    if (!o3icsStore.hasLyrics || o3icsStore.isDraggingProgress || pausedBySeek) return
    const result = syncEngine.update(time)
    if (result.changed) {
      o3icsStore.setCurrentIndex(result.index)
    }
  }

  // 监听歌词行变化（切换歌曲时重置状态）
  watch(
    () => o3icsStore.lines,
    (lines) => {
      syncEngine.setLines(lines)
      syncEngine.reset()
      // 切换歌曲时重置 currentIndex
      o3icsStore.setCurrentIndex(-1)
      syncNow(playerStore.currentTime)
    },
    { immediate: true }
  )

  // 监听时间偏移变化
  watch(
    () => o3icsStore.offsetMs,
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
    const line = o3icsStore.lines[index]
    if (!line) return
    setSeekPause()
    playerStore.seek(line.time / 1000)
    o3icsStore.setCurrentIndex(index)
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
