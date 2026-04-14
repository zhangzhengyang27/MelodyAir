import { cacheManager, arrayBufferToBlobUrl, blobToArrayBuffer } from '@/utils/db'
import { getSongUrlV1, getSongUrlMatch } from '@/api/song'
import { useSettingsStore } from '@/stores/settings'
import type { Ref } from 'vue'

/**
 * 播放器缓存管理 composable
 * 负责：音频源获取/缓存、预缓存下一首、Blob URL 内存管理
 */
export function usePlayerCache(deps: {
  createdBlobUrls: string[]
  activeBlobUrl: Ref<string | null>
}) {
  // 预缓存状态
  let nextTrackUrlCache: string | null = null
  let nextTrackIdCache: number | null = null

  /**
   * 释放所有非活跃的 Blob URL（切歌时调用）
   */
  function releaseStaleBlobUrls(): void {
    const toRelease = deps.createdBlobUrls.filter(url => url !== deps.activeBlobUrl.value)
    for (const url of toRelease) {
      URL.revokeObjectURL(url)
    }
    deps.createdBlobUrls.length = 0
    if (deps.activeBlobUrl.value) {
      deps.createdBlobUrls.push(deps.activeBlobUrl.value)
    }
  }

  /**
   * 释放所有 Blob URL（销毁时调用）
   */
  function releaseAllBlobUrls(): void {
    for (const url of deps.createdBlobUrls) {
      URL.revokeObjectURL(url)
    }
    deps.createdBlobUrls.length = 0
    deps.activeBlobUrl.value = null
  }

  /**
   * 获取音频 URL
   * 优先从 IndexedDB 缓存读取，未命中则从 API 获取并写入缓存
   */
  async function getAudioSource(
    songId: number,
    useCache = true,
    localTrackId?: number
  ): Promise<string | null> {
    const settingsStore = useSettingsStore()

    // 本地音轨
    if (localTrackId) {
      return `${settingsStore.apiBase}/stream/${localTrackId}`
    }

    // 0. 检查预缓存 URL
    const preloadedUrl = getNextTrackUrl(songId)
    if (preloadedUrl) return preloadedUrl

    // 1. 尝试从 IndexedDB 缓存读取
    if (useCache && settingsStore.enableCache) {
      try {
        const cached = await cacheManager.getTrackSource(songId)
        if (cached) {
          const blobUrl = arrayBufferToBlobUrl(cached)
          deps.createdBlobUrls.push(blobUrl)
          return blobUrl
        }
      } catch (e) {
        console.warn('[player] Failed to read cache:', e)
      }
    }

    // 2. 从 API 获取
    try {
      const quality = settingsStore.musicQuality || 'exhigh'
      console.log(`[player] 请求音频URL: songId=${songId}, quality=${quality}, apiBase=${settingsStore.apiBase}`)
      const res: any = await getSongUrlV1(songId, quality)
      console.log('[player] /song/url/v1 原始返回:', JSON.stringify(res)?.slice(0, 800))
      const url = res?.data?.[0]?.url
      const freeTrialInfo = res?.data?.[0]?.freeTrialInfo
      console.log(`[player] 解析结果: url=${url ? url.slice(0, 100) + '...' : 'null'}, freeTrialInfo=${JSON.stringify(freeTrialInfo)}`)

      if (!url) {
        // 3. 尝试解灰
        if (settingsStore.enableUnblock) {
          console.log(`[player] songId=${songId} 尝试解灰获取`)
          const unblockRes: any = await getSongUrlMatch(songId)
          const unblockUrl = unblockRes?.data?.[0]?.url
          if (unblockUrl) return unblockUrl.replace(/^http:/, 'https:')
        }
        console.warn(`[player] songId=${songId} 无可用音源（可能 VIP 歌曲/地区限制/版权下架）`)
        return null
      }
      if (freeTrialInfo !== null && freeTrialInfo !== undefined) {
        console.warn(`[player] songId=${songId} 是 VIP 试听歌曲(${freeTrialInfo.start}-${freeTrialInfo.end}秒)，仍可播放`)
      }
      return url.replace(/^http:/, 'https:')
    } catch (e) {
      console.error('[player] Failed to get audio source:', e)
      return null
    }
  }

  /**
   * 将音频数据写入 IndexedDB 缓存（异步，不阻塞播放）
   */
  async function cacheAudioSource(songId: number, url: string): Promise<void> {
    const settingsStore = useSettingsStore()
    if (!settingsStore.enableCache) return
    try {
      const response = await fetch(url)
      if (!response.ok) return
      const blob = await response.blob()
      const arrayBuffer = await blobToArrayBuffer(blob)
      await cacheManager.cacheTrackSource(songId, arrayBuffer)
      console.log(`[player] Cached audio for song ${songId}`)
    } catch (e) {
      console.warn('[player] Failed to cache audio source:', e)
    }
  }

  /**
   * 预缓存下一首歌的音频数据
   */
  async function preloadNextTrack(deps2: {
    playNextList: Ref<any[]>
    isPersonalFM: Ref<boolean>
    personalFMNextTrack: Ref<any>
    playlist: Ref<any[]>
    currentIndex: Ref<number>
  }): Promise<void> {
    const settingsStore = useSettingsStore()
    if (!settingsStore.autoCacheNextTrack) return

    let nextSong: any = null

    if (deps2.playNextList.value.length > 0) {
      nextSong = deps2.playNextList.value[0]
    } else if (deps2.isPersonalFM.value && deps2.personalFMNextTrack.value) {
      nextSong = deps2.personalFMNextTrack.value
    } else if (deps2.playlist.value.length > 0 && deps2.currentIndex.value >= 0) {
      const nextIdx = (deps2.currentIndex.value + 1) % deps2.playlist.value.length
      if (nextIdx !== deps2.currentIndex.value) {
        nextSong = deps2.playlist.value[nextIdx]
      }
    }

    if (!nextSong || nextSong.id === nextTrackIdCache) return

    nextTrackIdCache = nextSong.id
    nextTrackUrlCache = null

    try {
      if (settingsStore.enableCache) {
        const cached = await cacheManager.getTrackSource(nextSong.id)
        if (cached) {
          nextTrackUrlCache = arrayBufferToBlobUrl(cached)
          deps.createdBlobUrls.push(nextTrackUrlCache)
          console.log(`[player] Pre-cached (from IndexedDB) next track: ${nextSong.name}`)
          return
        }
      }

      const url = await getAudioSource(nextSong.id, false, nextSong._localTrackId)
      if (url) {
        nextTrackUrlCache = url
        if (!url.startsWith('blob:')) {
          cacheAudioSource(nextSong.id, url)
        }
        console.log(`[player] Pre-cached next track: ${nextSong.name}`)
      }
    } catch (e) {
      console.warn('[player] Failed to pre-cache next track:', e)
    }
  }

  /**
   * 获取预缓存的下一首 URL
   */
  function getNextTrackUrl(songId: number): string | null {
    if (nextTrackIdCache === songId && nextTrackUrlCache) {
      const url = nextTrackUrlCache
      nextTrackUrlCache = null
      nextTrackIdCache = null
      return url
    }
    return null
  }

  return {
    getAudioSource,
    cacheAudioSource,
    preloadNextTrack,
    releaseStaleBlobUrls,
    releaseAllBlobUrls,
  }
}
