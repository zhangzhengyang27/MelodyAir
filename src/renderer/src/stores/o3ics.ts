import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ParsedLyricLine } from '@/types/o3ics'

export interface LyricsMetadata {
  trackId: number
  trackName: string
  artists: string
  source: 'local' | 'online' | 'cache'
}

export const useLyricsStore = defineStore('o3ics', () => {
  // 歌词数据
  const lines = ref<ParsedLyricLine[]>([])
  const currentIndex = ref(-1)
  const metadata = ref<LyricsMetadata | null>(null)
  const rawText = ref('')

  // 歌词显示选项
  const showTranslation = ref(true)
  const showRomanization = ref(false)

  // 歌词加载状态
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 歌词同步状态
  const offsetMs = ref(0)
  const isDraggingProgress = ref(false)

  // 计算属性
  const hasLyrics = computed(() => lines.value.length > 0)
  const currentLine = computed(() => currentIndex.value >= 0 ? lines.value[currentIndex.value] : null)

  // 重置歌词数据
  function resetForTrack(trackId: number | null) {
    lines.value = []
    currentIndex.value = -1
    metadata.value = null
    rawText.value = ''
    error.value = null
    // 如果有新歌曲 ID，稍后会在 setLyrics 中设置
  }

  // 设置歌词数据
  function setLyrics(params: {
    trackId: number
    trackName: string
    artists: string
    source: 'local' | 'online' | 'cache'
    rawText: string
    lines: ParsedLyricLine[]
  }) {
    metadata.value = {
      trackId: params.trackId,
      trackName: params.trackName,
      artists: params.artists,
      source: params.source,
    }
    rawText.value = params.rawText
    lines.value = params.lines
    currentIndex.value = -1
    error.value = null
    loading.value = false
  }

  // 歌词数据操作（供 useLyricsSync 使用）
  function setLines(newLines: ParsedLyricLine[]) {
    lines.value = newLines
    if (currentIndex.value >= newLines.length) {
      currentIndex.value = -1
    }
  }

  function clearLines() {
    lines.value = []
    currentIndex.value = -1
  }

  function setCurrentIndex(index: number) {
    if (index >= 0 && index < lines.value.length) {
      currentIndex.value = index
    } else {
      currentIndex.value = -1
    }
  }

  // 加载状态
  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null) {
    error.value = message
  }

  // 显示选项
  function toggleTranslation() {
    showTranslation.value = !showTranslation.value
  }

  function toggleRomanization() {
    showRomanization.value = !showRomanization.value
  }

  // 同步状态
  function setOffsetMs(offset: number) {
    offsetMs.value = offset
  }

  function setDraggingProgress(dragging: boolean) {
    isDraggingProgress.value = dragging
  }

  return {
    // 歌词数据
    lines,
    currentIndex,
    metadata,
    rawText,
    hasLyrics,
    currentLine,

    // 加载状态
    loading,
    error,

    // 显示选项
    showTranslation,
    showRomanization,

    // 同步状态
    offsetMs,
    isDraggingProgress,

    // 操作方法
    resetForTrack,
    setLyrics,
    setLines,
    clearLines,
    setCurrentIndex,
    setLoading,
    setError,
    toggleTranslation,
    toggleRomanization,
    setOffsetMs,
    setDraggingProgress,
  }
})
