import { cacheManager, arrayBufferToBlobUrl, blobToArrayBuffer } from "@/utils/db"
import { getSongUrlV1 } from "@/api/song"
import { matchSong } from "@/api/unblock"
import { useSettingsStore } from "@/stores/settings"
import { THIRD_PARTY_AUDIO_DOMAINS } from "@/constants"
import { logger } from "@/utils/logger"
import { showToast } from "@/composables/useToast"
import type { Ref } from "vue"

/** 音质等级显示名称（降级提示用） */
const QUALITY_LABELS: Record<string, string> = {
  standard: '标准音质', higher: '较高音质', exhigh: '高品质',
  lossless: '无损音质', hires: 'Hi-Res 无损', jyeffect: '高清环绕声',
  sky: '沉浸环绕声', dolby: '杜比全景声', jymaster: '超清母带',
}

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
   * 预检音频 URL 是否返回有效音频数据（避免代理返回 HTML/错误页面导致 Howl code=4）
   * 优先 HEAD，失败时降级为 GET Range（部分服务器不支持 HEAD）
   */
  async function validateAudioUrl(url: string): Promise<boolean> {
    const checkContentType = (ct: string | null): boolean => {
      if (!ct) return false
      if (ct.startsWith("audio/") || ct.startsWith("application/octet-stream") || ct.includes("mpeg"))
        return true
      if (ct === "application/json" || ct.startsWith("text/")) return false
      return true
    }

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      })
      clearTimeout(timer)
      if (resp.ok && checkContentType(resp.headers.get("content-type"))) return true
      // HEAD 失败（405 等），降级到 GET Range
      if (resp.status === 405 || !resp.ok) {
        return await validateAudioUrlGet(url)
      }
      return false
    } catch (e) {
      logger.warn('player', 'HEAD 预检失败，降级 GET:', e)
      return await validateAudioUrlGet(url)
    }
  }

  /**
   * 用 GET + Range 头预检（仅请求第一个字节）
   */
  async function validateAudioUrlGet(url: string): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: controller.signal,
        cache: "no-store",
      })
      clearTimeout(timer)
      // 206 Partial Content 或 200 OK 都算有效
      if (resp.status === 206 || resp.ok) {
        const ct = resp.headers.get("content-type")
        if (!ct) return true // 无 content-type 时乐观处理
        if (ct.startsWith("audio/") || ct.startsWith("application/octet-stream") || ct.includes("mpeg"))
          return true
        if (ct === "application/json" || ct.startsWith("text/")) return false
        return true
      }
      return false
    } catch (e) {
      logger.warn('player', 'GET 预检失败', e)
      return false
    }
  }

  /**
   * 释放所有非活跃的 Blob URL（切歌时调用）
   */
  function releaseStaleBlobUrls(): void {
    const toRelease = deps.createdBlobUrls.filter((url) => url !== deps.activeBlobUrl.value)
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
        logger.warn('player', 'Failed to read cache:', e)
      }
    }

    // 2. 从 API 获取
    try {
      const quality = settingsStore.musicQuality || "exhigh"
      logger.debug('player', `请求音频URL: songId=${songId}, quality=${quality}`)
      const res = await getSongUrlV1(songId, quality)

      let url: string | undefined | null
      let actualLevel: string | undefined
      if (Array.isArray(res?.data)) {
        url = res.data[0]?.url
        actualLevel = res.data[0]?.level
      } else if (typeof res?.data === "string" && res.data.startsWith("http")) {
        url = res.data
        if (url.includes("/proxy/audio?url=")) {
          const match = url.match(/url=([^&]+)/)
          if (match) url = decodeURIComponent(match[1])
        }
      }

      // 音质降级检测：请求的音质与实际返回不一致时提示用户
      if (url && actualLevel && actualLevel !== quality) {
        logger.info('player', `音质降级: songId=${songId}, 请求=${quality}, 实际=${actualLevel}`)
        const requestedLabel = QUALITY_LABELS[quality] || quality
        const actualLabel = QUALITY_LABELS[actualLevel] || actualLevel
        showToast(`当前歌曲不支持${requestedLabel}，已切换为${actualLabel}`, {
          type: 'info',
          dedupeKey: `quality-downgrade-${songId}-${actualLevel}`,
        })
      }


      if (!url) {
        if (settingsStore.enableUnblock) {
          logger.debug('player', `songId=${songId} 尝试解锁获取`)
          try {
            const unblockRes = await matchSong(songId)
            const realUrl = unblockRes?.data

            if (realUrl) {
              return realUrl
            }
          } catch (e) {
            logger.warn('player', `解锁失败: songId=${songId}`, e)
          }
        }
        logger.warn('player', `songId=${songId} 无可用音源`)
        return null
      }

      // 对代理/第三方 URL 做预检
      if (url.includes("/proxy/")) {
        const valid = await validateAudioUrl(url)
        if (!valid) {
          url = undefined
        }
      }

      if (!url) {
        if (settingsStore.enableUnblock) {
          try {
            const unblockRes = await matchSong(songId)
            const realUrl = unblockRes?.data
            if (realUrl) return realUrl
          } catch (e) {
            logger.warn('player', `解锁失败: songId=${songId}`, e)
          }
        }
        return null
      }

      return url
    } catch (e) {
      logger.error('player', 'Failed to get audio source:', e)
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
      let originalUrl = url
      if (url.includes("/proxy/audio?url=")) {
        const match = url.match(/url=([^&]+)/)
        if (match) originalUrl = decodeURIComponent(match[1])
      }

      const needsProxy =
        [...THIRD_PARTY_AUDIO_DOMAINS].some((domain) => originalUrl.includes(domain)) ||
        originalUrl.startsWith("http:")

      let finalUrl = url
      if (needsProxy && !url.includes("/proxy/audio")) {
        finalUrl = `${settingsStore.apiBase}/proxy/audio?url=${encodeURIComponent(originalUrl)}`
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(finalUrl, { signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) return
      const blob = await response.blob()
      const arrayBuffer = await blobToArrayBuffer(blob)
      await cacheManager.cacheTrackSource(songId, arrayBuffer)
      logger.debug('player', `Cached audio for song ${songId}`)
    } catch (e) {
      logger.warn('player', 'Failed to cache audio source:', e)
    }
  }

  /**
   * 预缓存下一首歌的音频数据
   */
  async function preloadNextTrack(deps2: {
    playNextList: Ref<unknown[]>
    isPersonalFM: Ref<boolean>
    personalFMNextTrack: Ref<unknown>
    playlist: Ref<unknown[]>
    currentIndex: Ref<number>
  }): Promise<void> {
    const settingsStore = useSettingsStore()
    if (!settingsStore.autoCacheNextTrack) return

    let nextSong: Record<string, unknown> | null = null

    if (deps2.playNextList.value.length > 0) {
      nextSong = deps2.playNextList.value[0] as Record<string, unknown>
    } else if (deps2.isPersonalFM.value && deps2.personalFMNextTrack.value) {
      nextSong = deps2.personalFMNextTrack.value as Record<string, unknown>
    } else if (deps2.playlist.value.length > 0 && deps2.currentIndex.value >= 0) {
      const nextIdx = (deps2.currentIndex.value + 1) % deps2.playlist.value.length
      if (nextIdx !== deps2.currentIndex.value) {
        nextSong = deps2.playlist.value[nextIdx] as Record<string, unknown>
      }
    }

    if (!nextSong || nextSong.id === nextTrackIdCache) return

    const nextId = typeof nextSong.id === 'number' ? nextSong.id : Number(nextSong.id)
    if (isNaN(nextId)) return

    nextTrackIdCache = nextId
    nextTrackUrlCache = null

    try {
      if (settingsStore.enableCache) {
        const cached = await cacheManager.getTrackSource(nextId)
        if (cached) {
          nextTrackUrlCache = arrayBufferToBlobUrl(cached)
          deps.createdBlobUrls.push(nextTrackUrlCache!)
          return
        }
      }

      const url = await getAudioSource(nextId, false, nextSong._localTrackId as number | undefined)
      if (url) {
        nextTrackUrlCache = url
        if (!url.startsWith("blob:")) {
          cacheAudioSource(nextId, url)
        }
      }
    } catch (e) {
      logger.warn('player', 'Failed to pre-cache next track:', e)
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
