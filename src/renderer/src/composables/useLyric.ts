import { ref, watch, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { getLyric } from '@/api/song'
import { parseLyric, findCurrentLyricIndex, type LyricLine } from '@/utils/lyric'

export function useLyric() {
  const playerStore = usePlayerStore()
  const lyrics = ref<LyricLine[]>([])
  const currentIndex = ref(0)
  const loading = ref(false)

  const currentLyric = ref<LyricLine | null>(null)

  // Throttled lyric update (max ~10 updates/sec)
  let lastUpdateTime = 0
  const UPDATE_INTERVAL_MS = 100

  async function fetchLyric(songId: number) {
    loading.value = true
    try {
      console.log(`[lyric] 请求歌词: songId=${songId}`)
      const res: any = await getLyric(songId)
      console.log('[lyric] /lyric 返回:', JSON.stringify(res)?.slice(0, 500))
      const lrc = res?.lrc?.lyric || res?.tlyric?.lyric || ''
      if (!res?.lrc?.lyric && !res?.tlyric?.lyric) {
        console.warn(`[lyric] songId=${songId} 无歌词数据, 原始响应 code=${res?.code}`)
      }
      if (lrc) {
        lyrics.value = parseLyric(lrc)
        console.log(`[lyric] 解析成功, 共 ${lyrics.value.length} 行`)
      } else {
        lyrics.value = []
      }
    } catch (e) {
      console.error('Failed to fetch lyric:', e)
      lyrics.value = []
    } finally {
      loading.value = false
    }
  }

  // Watch current song changes to fetch lyrics
  watch(
    () => playerStore.currentSong?.id,
    (newId) => {
      if (newId) {
        fetchLyric(newId)
      } else {
        lyrics.value = []
      }
    }
  )

  // Watch current time to update lyric index (throttled)
  watch(
    () => playerStore.currentTime,
    (time) => {
      if (lyrics.value.length === 0) return

      const now = Date.now()
      if (now - lastUpdateTime < UPDATE_INTERVAL_MS) return
      lastUpdateTime = now

      const idx = findCurrentLyricIndex(lyrics.value, time)
      if (idx !== currentIndex.value) {
        currentIndex.value = idx
        currentLyric.value = lyrics.value[idx]
      }
    }
  )

  return { lyrics, currentIndex, currentLyric, loading, fetchLyric }
}
