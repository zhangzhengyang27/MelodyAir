/**
 * 全局歌词自动加载 composable
 * 监听当前歌曲变化，自动加载歌词
 * 在 AppLayout.vue 中全局调用，确保所有页面都能加载歌词
 */
import { watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'
import { useSettingsStore } from '@/stores/settings'
import { parseLrc } from '@/utils/lyricsParser'
import { getLyric, getLyricV1 } from '@/api/song'
import { getLocalLyrics } from '@/api/local'
import { cacheManager } from '@/utils/db'
import { logger } from '@/utils/logger'

export function useAutoLoadLyrics() {
  const playerStore = usePlayerStore()
  const lyricsStore = useLyricsStore()
  const settingsStore = useSettingsStore()

  async function loadLyrics(songId: number) {
    lyricsStore.resetForTrack(songId)
    lyricsStore.setLoading(true)

    try {
      const currentSong = playerStore.currentSong
      if (!currentSong) return

      let lrc = ''
      let source: 'local' | 'online' | 'cache' = 'online'

      if (!currentSong._localTrackId) {
        try {
          const cached = await cacheManager.getLyric(songId)
          if (cached?.lyric && parseLrc(cached.lyric).length > 0) {
            lrc = cached.lyric
            source = 'cache'
            logger.debug('lyric', `命中 IDB 缓存: songId=${songId}`)
          }
        } catch (e) {
          logger.warn('lyric', 'IDB 缓存读取失败:', e)
        }
      }

      if (!lrc && currentSong._localTrackId) {
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
            logger.warn('lyric', 'synced JSON 解析失败:', e)
          }
        }
        if (!lrc) lrc = data?.plain || ''
        source = 'local'
      }

      let tlyric: string | undefined
      let romalrc: string | undefined

      if (!lrc && !currentSong._localTrackId) {
        let v1Tlyric: string | undefined
        let v1Romalrc: string | undefined
        if (settingsStore.enableEnhancedLyric) {
          try {
            const resV1: any = await getLyricV1(songId, { cp: true, tv: 1, lv: 1, rv: 1, yv: 1 })
            const v1Lrc = resV1?.lrc?.lyric || resV1?.klyric?.lyric || resV1?.yrc?.lyric || ''
            v1Tlyric = resV1?.tlyric?.lyric || undefined
            v1Romalrc = resV1?.romalrc?.lyric || resV1?.yrc?.lyric || undefined
            if (v1Lrc) {
              const parsed = parseLrc(v1Lrc)
              if (parsed.length > 0) {
                let merged = parsed
                if (v1Tlyric) {
                  const translated = parseLrc(v1Tlyric)
                  merged = merged.map((line) => {
                    const matched = translated.find((t) => Math.abs(t.time - line.time) < 500)
                    return matched ? { ...line, translation: matched.text } : line
                  })
                }
                if (v1Romalrc) {
                  const roman = parseLrc(v1Romalrc)
                  merged = merged.map((line) => {
                    const matched = roman.find((r) => Math.abs(r.time - line.time) < 500)
                    return matched ? { ...line, romanized: matched.text } : line
                  })
                }
                lyricsStore.setLyrics({
                  trackId: songId,
                  trackName: currentSong.name,
                  artists: currentSong.artists.map(a => a.name).join(' / '),
                  source: 'online',
                  rawText: v1Lrc,
                  lines: merged,
                })
                return
              }
              logger.debug('lyric', `v1 歌词格式无法解析（${v1Lrc.length} 字符，0 行），回退到普通歌词`)
            }
          } catch (e) {
            logger.warn('lyric', '逐字歌词请求失败，回退到普通歌词:', e)
          }
        }

        const res: any = await getLyric(songId)
        lrc = res?.lrc?.lyric || ''
        tlyric = res?.tlyric?.lyric || v1Tlyric
        romalrc = v1Romalrc
        if (lrc) {
          await cacheManager.cacheLyric(songId, lrc, tlyric).catch(() => {})
        }
      }

      if (lrc) {
        let parsed = parseLrc(lrc)
        // 合并翻译歌词
        if (tlyric) {
          const translated = parseLrc(tlyric)
          parsed = parsed.map((line) => {
            const matched = translated.find((t) => Math.abs(t.time - line.time) < 500)
            return matched ? { ...line, translation: matched.text } : line
          })
        }
        // 合并罗马音歌词
        if (romalrc) {
          const roman = parseLrc(romalrc)
          parsed = parsed.map((line) => {
            const matched = roman.find((r) => Math.abs(r.time - line.time) < 500)
            return matched ? { ...line, romanized: matched.text } : line
          })
        }
        lyricsStore.setLyrics({
          trackId: songId,
          trackName: currentSong.name,
          artists: currentSong.artists.map(a => a.name).join(' / '),
          source,
          rawText: lrc,
          lines: parsed,
        })
      } else {
        // 播客节目（谈话类）通常没有歌词，显示友好提示
        lyricsStore.setError(currentSong._streaming ? '播客节目暂无歌词' : '暂无歌词')
      }
    } catch (e) {
      logger.error('lyric', 'Failed to fetch lyric:', e)
      lyricsStore.setError('歌词加载失败')
    } finally {
      lyricsStore.setLoading(false)
    }
  }

  // 监听歌曲变化，自动加载歌词
  watch(
    () => playerStore.currentSong?.id,
    async (songId) => {
      if (!songId) {
        lyricsStore.resetForTrack(null)
        return
      }
      await loadLyrics(songId)
    },
    { immediate: true }
  )

  return { loadLyrics }
}
