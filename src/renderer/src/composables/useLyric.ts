import { ref, watch, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { getLyric } from '@/api/song'
import { getLocalLyrics } from '@/api/local'
import { parseLyric, findCurrentLyricIndex, mergeLyricsWithTranslation, type LyricLine } from '@/utils/lyric'
import { cacheManager } from '@/utils/db'

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

      // ★ 先尝试从 IndexedDB 缓存读取（仅网易云歌曲）
      if (!currentSong?._localTrackId) {
        try {
          const cached = await cacheManager.getLyric(songId)
          if (cached?.lyric) {
            lrc = cached.lyric
            const tlyric = cached.tlyric || undefined
            lyrics.value = mergeLyricsWithTranslation(parseLyric(lrc), tlyric)
            lastFetchedSongId = songId
            console.log(`[lyric] 命中 IDB 缓存: songId=${songId}`)
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
          console.warn('[lyric] IDB 缓存读取失败:', e)
        }
      }

      // 本地歌曲：走 /lyrics/:songId 接口
      if (currentSong?._localTrackId) {
        console.log(`[lyric] 请求本地歌词: songId=${songId}, trackId=${currentSong._localTrackId}`)
        const res: any = await getLocalLyrics(songId)
        const data = res?.body ?? res
        lrc = data?.lrc?.lyric || ''
        if (!lrc && data?.synced && typeof data.synced === 'string') {
          try {
            const syncedObj = JSON.parse(data.synced)
            if (syncedObj && typeof syncedObj === 'object') {
              const parts: string[] = []
              for (const [k, v] of Object.entries(syncedObj)) {
                if (/^\d{1,2}:\d{2}\.\d{2,3}$/.test(k) && v) {
                  const [min, sec] = k.split(':')
                  parts.push(`[${min.padStart(2, '0')}:${sec}]${v}`)
                }
              }
              if (parts.length > 0) lrc = parts.join('\n')
            }
          } catch (e) {
            console.warn('[lyric] synced JSON 解析失败:', e)
          }
        }
        if (!lrc) lrc = data?.plain || ''
      } else {
        // 网易云歌曲：走原有 /lyric 接口
        console.log(`[lyric] 请求网易云歌词: songId=${songId}`)
        const res: any = await getLyric(songId)
        lrc = res?.lrc?.lyric || ''
        const tlyric = res?.tlyric?.lyric || undefined
        if (!res?.lrc?.lyric) {
          console.warn(`[lyric] songId=${songId} 无歌词数据, 原始响应 code=${res?.code}, keys=${Object.keys(res || {}).join(',')}`)
        }
        // ★ 写入 IDB 缓存
        if (lrc) {
          cacheManager.cacheLyric(songId, lrc, tlyric).catch(() => {})
        }
      }

      if (lrc) {
        lyrics.value = parseLyric(lrc)
        console.log(`[lyric] 解析成功, 共 ${lyrics.value.length} 行`)
        lastFetchedSongId = songId
      } else {
        lyrics.value = []
      }
    } catch (e) {
      console.error('[lyric] Failed to fetch lyric:', e)
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
      console.log(`[lyric] watch 触发: oldId=${oldId} → newId=${newId}`)
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
