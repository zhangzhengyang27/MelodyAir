import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getStorage, setStorage } from '../utils/storage'
import { throttledPersistStorage } from '../utils/persistStorage'
import type { LyricsDisplayMode, LyricsSource, LyricsTrackMeta, ParsedLyricLine } from '../types/lyrics'

export interface LoadLyricsPayload {
  trackId: number
  trackName: string
  artists: string
  source: LyricsSource
  rawText: string
  lines: ParsedLyricLine[]
}

export const useLyricsStore = defineStore('lyrics', () => {
  const meta = ref<LyricsTrackMeta>({
    trackId: null,
    trackName: '',
    artists: '',
    source: 'none',
    updatedAt: 0,
  })

  const loading = ref(false)
  const error = ref<string | null>(null)
  const rawText = ref('')
  const lines = ref<ParsedLyricLine[]>([])
  const currentIndex = ref(-1)

  const displayMode = ref<LyricsDisplayMode>(getStorage('lyrics-display-mode', 'expanded'))
  const fontSize = ref(getStorage('lyrics-font-size', 16))
  const lineHeight = ref(getStorage('lyrics-line-height', 1.4))
  const offsetMs = ref(getStorage('lyrics-offset-ms', 0))
  const isTopMost = ref(getStorage('lyrics-topmost', false))
  const showTranslation = ref(getStorage('lyrics-show-translation', true))
  const showRomanized = ref(getStorage('lyrics-show-romanized', false))
  const autoFollow = ref(getStorage('lyrics-auto-follow', true))
  const compactByWidth = ref(false)
  const isHovering = ref(false)
  const isDraggingProgress = ref(false)

  const hasLyrics = computed(() => lines.value.length > 0)
  const currentLine = computed(() => currentIndex.value >= 0 ? lines.value[currentIndex.value] ?? null : null)
  const prevLine = computed(() => currentIndex.value > 0 ? lines.value[currentIndex.value - 1] ?? null : null)
  const nextLine = computed(() => currentIndex.value >= 0 ? lines.value[currentIndex.value + 1] ?? null : null)
  const effectiveMode = computed(() => (compactByWidth.value ? 'compact' : displayMode.value))

  function resetForTrack(trackId: number | null) {
    meta.value = {
      trackId,
      trackName: '',
      artists: '',
      source: 'none',
      updatedAt: 0,
    }
    loading.value = false
    error.value = null
    rawText.value = ''
    lines.value = []
    currentIndex.value = -1
  }

  function setLyrics(payload: LoadLyricsPayload) {
    // 竞态守卫：快速切歌时，旧的慢响应不得覆盖新歌已重置的歌词状态
    if (meta.value.trackId !== null && meta.value.trackId !== payload.trackId) return
    meta.value = {
      trackId: payload.trackId,
      trackName: payload.trackName,
      artists: payload.artists,
      source: payload.source,
      updatedAt: Date.now(),
    }
    rawText.value = payload.rawText
    lines.value = payload.lines
    error.value = null
    loading.value = false
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setError(message: string | null) {
    error.value = message
    loading.value = false
  }

  function setCurrentIndex(index: number) {
    currentIndex.value = index
  }

  function setOffsetMs(value: number, absolute = false) {
    offsetMs.value = absolute ? value : offsetMs.value + value
    setStorage('lyrics-offset-ms', offsetMs.value)
  }

  function setDisplayMode(mode: LyricsDisplayMode) {
    displayMode.value = mode
    setStorage('lyrics-display-mode', mode)
  }

  function setFontSize(value: number) {
    fontSize.value = Math.max(12, Math.min(28, Math.round(value)))
    setStorage('lyrics-font-size', fontSize.value)
  }

  function setLineHeight(value: number) {
    lineHeight.value = Math.max(1, Math.min(2.2, value))
    setStorage('lyrics-line-height', lineHeight.value)
  }

  function toggleTopMost() {
    isTopMost.value = !isTopMost.value
    setStorage('lyrics-topmost', isTopMost.value)
  }

  function toggleTranslation() {
    showTranslation.value = !showTranslation.value
    setStorage('lyrics-show-translation', showTranslation.value)
  }

  function toggleRomanized() {
    showRomanized.value = !showRomanized.value
    setStorage('lyrics-show-romanized', showRomanized.value)
  }

  function setAutoFollow(value: boolean) {
    autoFollow.value = value
    setStorage('lyrics-auto-follow', value)
  }

  function setCompactByWidth(value: boolean) {
    compactByWidth.value = value
  }

  function setHovering(value: boolean) {
    isHovering.value = value
  }

  function setDraggingProgress(value: boolean) {
    isDraggingProgress.value = value
  }

  function copyCurrentText() {
    const line = currentLine.value
    return line?.text ?? ''
  }

  return {
    meta,
    loading,
    error,
    rawText,
    lines,
    currentIndex,
    displayMode,
    fontSize,
    lineHeight,
    offsetMs,
    isTopMost,
    showTranslation,
    showRomanized,
    autoFollow,
    compactByWidth,
    isHovering,
    isDraggingProgress,
    hasLyrics,
    currentLine,
    prevLine,
    nextLine,
    effectiveMode,
    resetForTrack,
    setLyrics,
    setLoading,
    setError,
    setCurrentIndex,
    setOffsetMs,
    setDisplayMode,
    setFontSize,
    setLineHeight,
    toggleTopMost,
    toggleTranslation,
    toggleRomanized,
    setAutoFollow,
    setCompactByWidth,
    setHovering,
    setDraggingProgress,
    copyCurrentText,
  }
}, {
  persist: {
    storage: throttledPersistStorage,
    pick: [
      'displayMode',
      'fontSize',
      'lineHeight',
      'offsetMs',
      'isTopMost',
      'showTranslation',
      'showRomanized',
      'autoFollow',
    ],
  },
})
