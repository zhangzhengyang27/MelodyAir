import { ref, watch, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { getLyric, getLyricV1 } from '@/api/song'
import { parseLyric, findCurrentLyricIndex, mergeLyricsWithTranslation, mergeLyricsWithRomanization, type LyricLine } from '@/utils/lyric'
import { cacheManager } from '@/utils/db'
import { useSettingsStore } from '@/stores/settings'
import { logger } from '@/utils/logger'

export function useLyric() {
  const playerStore = usePlayerStore()
  const lyrics = ref<LyricLine[]>([])
  const currentIndex = ref(0)
  const loading = ref(false)

  const currentLyric = ref<LyricLine | null>(null)

  // Throttled lyric update (max ~10 updates/sec)
  let lastUpdateTime = 0
  const UPDATE_INTERVAL_MS = 100

  // ★ 记录上次成功加载歌词的 songId，避免重复请求
  // 注意：只有加载成功后才会缓存，失败后下次会重试
  let lastFetchedSongId: number | null = null

  async function fetchLyric(songId: number) {
    // 只有歌词已存在时才跳过（成功加载后的缓存）
    if (songId === lastFetchedSongId && lyrics.value.length > 0) return

    loading.value = true
    try {
      const currentSong = playerStore.currentSong
      let lrc = ''

      // ★ 先尝试从 IndexedDB 缓存读取
      try {
        const cached = await cacheManager.getLyric(songId)
        if (cached?.lyric) {
          lrc = cached.lyric
          const tlyric = cached.tlyric || undefined
          lyrics.value = mergeLyricsWithTranslation(parseLyric(lrc), tlyric)
          lastFetchedSongId = songId
          logger.debug('lyric', `命中 IDB 缓存: songId=${songId}`)
          // 后台静默更新缓存（fire-and-forget）
          getLyric(songId).then((res: any) => {
            const newLrc = res?.lrc?.lyric || ''
            const newTlyric = res?.tlyric?.lyric || undefined
            if (newLrc && newLrc !== cached.lyric) {
              cacheManager.cacheLyric(songId, newLrc, newTlyric)
            }
          }).catch(() => {})
          return
        }
      } catch (e) {
        logger.warn('lyric', 'IDB 缓存读取失败:', e)
      }

      // 网易云歌曲：优先使用逐字歌词 API
      const settingsStore = useSettingsStore()
      const useEnhancedLyric = settingsStore.enableEnhancedLyric ?? true

      if (useEnhancedLyric) {
        logger.info('lyric', `请求逐字歌词: songId=${songId}`)
        try {
          const resV1: any = await getLyricV1(songId, { cp: true, tv: 1, lv: 1, rv: 1, yv: 1 })
          lrc = resV1?.lrc?.lyric || resV1?.klyric?.lyric || resV1?.yrc?.lyric || ''
          const tlyric = resV1?.tlyric?.lyric || undefined
          const romalrc = resV1?.romalrc?.lyric || resV1?.yrc?.lyric || undefined
          if (lrc) {
            let mergedLyrics = mergeLyricsWithTranslation(parseLyric(lrc), tlyric)
            mergedLyrics = mergeLyricsWithRomanization(mergedLyrics, romalrc)
            lyrics.value = mergedLyrics
            lastFetchedSongId = songId
            // 缓存
            cacheManager.cacheLyric(songId, lrc, tlyric).catch(() => {})
            logger.debug('lyric', `逐字歌词解析成功, 共 ${lyrics.value.length} 行`)
            return
          }
        } catch (e) {
          logger.warn('lyric', '逐字歌词请求失败，回退到普通歌词:', e)
        }
      }

      // 回退到普通歌词
      logger.info('lyric', `请求网易云歌词: songId=${songId}`)
      const res: any = await getLyric(songId)
      lrc = res?.lrc?.lyric || ''
      const tlyric = res?.tlyric?.lyric || undefined
      if (!res?.lrc?.lyric) {
        logger.warn('lyric', `songId=${songId} 无歌词数据, 原始响应 code=${res?.code}`)
      }
      // ★ 写入 IDB 缓存
      if (lrc) {
        cacheManager.cacheLyric(songId, lrc, tlyric).catch(() => {})
      }

      if (lrc) {
        lyrics.value = parseLyric(lrc)
        logger.debug('lyric', `解析成功, 共 ${lyrics.value.length} 行`)
        lastFetchedSongId = songId
      } else {
        lyrics.value = []
      }
    } catch (e) {
      logger.error('lyric', 'Failed to fetch lyric:', e)
      lyrics.value = []
    } finally {
      loading.value = false
    }
  }

  // Watch current song changes to fetch lyrics
  // ★ immediate: true 确保组件挂载时如果已有歌曲也能立即加载歌词
  watch(
    () => playerStore.currentSong?.id,
    (newId, oldId) => {
      logger.debug('lyric', `watch 触发: oldId=${oldId} → newId=${newId}`)
      if (newId) {
        fetchLyric(newId)
      } else {
        lyrics.value = []
        lastFetchedSongId = null
      }
    },
    { immediate: true }
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
