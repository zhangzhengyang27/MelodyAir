import { cacheManager, arrayBufferToBlobUrl, blobToArrayBuffer } from "@/utils/db"
import { getSongUrlV1 } from "@/api/song"
import { matchSong } from "@/api/unblock"
import { useSettingsStore } from "@/stores/settings"
import type { Ref } from "vue"

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
   * 仅对代理/第三方 URL 做预检，标准 CDN URL 跳过以减少延迟
   */
  async function validateAudioUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store"
      })
      clearTimeout(timer)
      const ct = resp.headers.get("content-type") || ""
      console.log(`[player] 预检 ${url.slice(0, 60)}... → status=${resp.status}, contentType=${ct}`)
      // 有效音频：2xx + 音频 MIME 或足够大的二进制响应
      if (!resp.ok) return false
      if (
        ct.startsWith("audio/") ||
        ct.startsWith("application/octet-stream") ||
        ct.includes("mpeg")
      )
        return true
      // 某些代理不返回 content-type，用 range 请求探测
      if (!ct || ct === "application/json" || ct.startsWith("text/")) return false
      return true
    } catch (e) {
      console.warn(`[player] 预检失败:`, e)
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
        console.warn("[player] Failed to read cache:", e)
      }
    }

    // 2. 从 API 获取
    try {
      const quality = settingsStore.musicQuality || "exhigh"
      console.log(
        `[player] 请求音频URL: songId=${songId}, quality=${quality}, apiBase=${settingsStore.apiBase}`
      )
      const res: any = await getSongUrlV1(songId, quality)
      console.log("[player] /song/url/v1 原始返回:", JSON.stringify(res)?.slice(0, 800))

      // 兼容两种返回格式：
      // 1) 标准网易云 /song/url/v1：{ data: [{ url: "...", fee: ... }] }
      // 2) 解锁接口 matchSong：{ data: "真实音源URL(如kuwo.cn/...)", proxyUrl?: "代理URL" }
      let url: string | undefined
      if (Array.isArray(res?.data)) {
        url = res.data[0]?.url
      } else if (typeof res?.data === "string" && res.data.startsWith("http")) {
        // 后端已修复：data 始终为真实音源 URL（不再返回包装后的代理URL）
        url = res.data
        // 兼容旧版：如果 data 意外包含代理 URL，提取真实地址
        if (url.includes("/proxy/audio?url=")) {
          const match = url.match(/url=([^&]+)/)
          if (match) url = decodeURIComponent(match[1])
        }
      }

      const freeTrialInfo = Array.isArray(res?.data) ? res.data[0]?.freeTrialInfo : undefined
      console.log(
        `[player] 解析结果: url=${
          url ? url.slice(0, 100) + "..." : "null"
        }, freeTrialInfo=${JSON.stringify(freeTrialInfo)}`
      )

      if (!url) {
        // 3. 尝试解锁（多源音源匹配）
        if (settingsStore.enableUnblock) {
          console.log(`[player] songId=${songId} 尝试解锁获取`)
          try {
            const unblockRes: any = await matchSong(songId)
            console.log(`[player] 解锁接口返回:`, JSON.stringify(unblockRes)?.slice(0, 300))

            // 后端返回格式：{ code, data: 真实音源URL }
            const realUrl = unblockRes?.data

            if (realUrl) {
              // 直接使用真实音源 URL（kuwo/kugou 等 CDN 通常允许直连）
              console.log('[player] 使用音源直连: ' + realUrl.slice(0, 80))
              return realUrl
            }
          } catch (e) {
            console.warn(`[player] 解锁失败: songId=${songId}`, e)
          }
        }
        console.warn(`[player] songId=${songId} 无可用音源（可能 VIP 歌曲/地区限制/版权下架）`)
        return null
      }
      if (freeTrialInfo !== null && freeTrialInfo !== undefined) {
        console.warn(
          `[player] songId=${songId} 是 VIP 试听歌曲(${freeTrialInfo.start}-${freeTrialInfo.end}秒)，仍可播放`
        )
      }

      // 对代理/第三方 URL 做预检，避免无效响应导致 Howl code=4
      if (!url) {
        console.warn(`[player] songId=${songId} 解析后无URL`)
        return null
      }
      // 仅对代理 URL 做预检，直连音源不预检（减少延迟）
      if (url && url.includes("/proxy/")) {
        const valid = await validateAudioUrl(url)
        if (!valid) {
          console.warn('[player] 音频URL预检失败: ' + url.slice(0, 80))
          url = undefined
        }
      }

      // 预检后 url 为空，走 fallback 解锁路径
      if (!url) {
        if (settingsStore.enableUnblock) {
          console.log(`[player] songId=${songId} 预检失败，尝试解锁获取`)
          try {
            const unblockRes: any = await matchSong(songId)
            console.log(`[player] 预检fallback 解锁接口返回:`, JSON.stringify(unblockRes)?.slice(0, 300))

            const realUrl = unblockRes?.data
            if (realUrl) {
              console.log('[player] 预检fallback 使用音源直连: ' + realUrl.slice(0, 80))
              return realUrl
            }
          } catch (e) {
            console.warn(`[player] 解锁失败: songId=${songId}`, e)
          }
        }
        console.warn(`[player] songId=${songId} 无可用音源`)
        return null
      }
      // 直接返回原始 URL（保留 http/https 原始协议）
      return url
    } catch (e) {
      console.error("[player] Failed to get audio source:", e)
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
      // 从 URL 中提取原始音源 URL（可能是代理 URL）
      let originalUrl = url
      if (url.includes("/proxy/audio?url=")) {
        const match = url.match(/url=([^&]+)/)
        if (match) {
          originalUrl = decodeURIComponent(match[1])
        }
      }

      // 检查是否需要代理
      const thirdPartyDomains = ["kuwo.cn", "kugou.com", "qq.com", "migu.cn", "music.126.net"]
      const needsProxy =
        thirdPartyDomains.some((domain) => originalUrl.includes(domain)) ||
        originalUrl.startsWith("http:")

      let finalUrl = url
      if (needsProxy && !url.includes("/proxy/audio")) {
        finalUrl = `${settingsStore.apiBase}/proxy/audio?url=${encodeURIComponent(originalUrl)}`
        console.log(`[player] 使用代理缓存第三方音源: ${originalUrl.slice(0, 60)}...`)
      }

      const response = await fetch(finalUrl)
      if (!response.ok) return
      const blob = await response.blob()
      const arrayBuffer = await blobToArrayBuffer(blob)
      await cacheManager.cacheTrackSource(songId, arrayBuffer)
      console.log(`[player] Cached audio for song ${songId}`)
    } catch (e) {
      console.warn("[player] Failed to cache audio source:", e)
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
        if (!url.startsWith("blob:")) {
          cacheAudioSource(nextSong.id, url)
        }
        console.log(`[player] Pre-cached next track: ${nextSong.name}`)
      }
    } catch (e) {
      console.warn("[player] Failed to pre-cache next track:", e)
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
    releaseAllBlobUrls
  }
}
