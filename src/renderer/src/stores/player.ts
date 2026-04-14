import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AudioEngine, type PlayMode, type PlayerStatus } from '../utils/player'
import { getSongUrlV1, getSongUrlMatch } from '../api/song'
import { scrobble } from '../api/record'
import { cacheManager, arrayBufferToBlobUrl, blobToArrayBuffer } from '../utils/db'
import { useSettingsStore } from './settings'
import { showToast } from '../composables/useToast'

export interface Song {
  id: number
  name: string
  artists: { id: number; name: string }[]
  album: { id: number; name: string; picUrl: string }
  duration: number
  url?: string
  /** 0=免费, 1=VIP/付费, 4=专辑购买 */
  fee?: number
  /** 本地音轨 ID（有此字段时直接用 /stream/:localTrackId 播放） */
  _localTrackId?: number
}

interface PlayerState {
  playlist: Song[]
  currentIndex: number
  playing: boolean
  playMode: PlayMode
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  /** 随机播放列表 */
  shuffledList: Song[]
  /** 播放下一首队列（用户手动添加的） */
  playNextList: Song[]
  /** 是否为私人 FM 模式 */
  isPersonalFM: boolean
  /** 当前 FM 曲目 */
  personalFMTrack: Song | null
  /** 下一首 FM 曲目 */
  personalFMNextTrack: Song | null
  /** 播放器状态 */
  status: PlayerStatus
  /** 当前歌曲对象（缓存，避免频繁计算） */
  currentSongCache: Song | null
}

export const usePlayerStore = defineStore('player', () => {
  // 状态
  const playlist = ref<Song[]>([])
  const currentIndex = ref(-1)
  const playing = ref(false)
  const playMode = ref<PlayMode>('sequence')
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  const muted = ref(false)
  const shuffledList = ref<Song[]>([])
  const playNextList = ref<Song[]>([])
  const isPersonalFM = ref(false)
  const personalFMTrack = ref<Song | null>(null)
  const personalFMNextTrack = ref<Song | null>(null)
  const status = ref<PlayerStatus>('paused')
  const currentSongCache = ref<Song | null>(null)

  // 音频引擎实例
  let audioEngine: AudioEngine | null = null

  // ★ Scrobble 追踪：记录是否已提交当前歌曲的听歌打卡
  let scrobbleSubmitted = false
  /** 当前进度已播放时间（秒），用于判断是否达到 scrobble 阈值 */
  let scrobblePlayedTime = 0

  // ★ 预缓存：下一首歌的 URL 缓存
  let nextTrackUrlCache: string | null = null
  let nextTrackIdCache: number | null = null

  // 初始化音频引擎
  function initAudioEngine(): void {
    if (!audioEngine) {
      audioEngine = new AudioEngine({
        volume: volume.value,
        fadeDuration: 200,
        autoNext: true,
        onEnd: () => {
          handlePlayEnd()
        },
        onPlayStateChange: (newStatus: PlayerStatus) => {
          status.value = newStatus
          playing.value = newStatus === 'playing'
        },
        onProgress: (time: number, dur: number) => {
          currentTime.value = time
          duration.value = dur
          // ★ Feature 3: 持久化播放进度（每次进度更新时保存）
          savePlaybackProgress()
          // ★ Feature 5: Scrobble 检查
          scrobblePlayedTime += 0.2 // 每 200ms 更新一次
          checkAndSubmitScrobble()
          // ★ Feature 1: MediaSession 位置更新
          updateMediaSessionPlaybackState()
        },
        onError: (error: Error) => {
          console.error('Player error:', error)
          status.value = 'error'
          playing.value = false
        }
      })
    }
  }

  // 计算属性
  const currentSong = computed(() => {
    if (isPersonalFM.value && personalFMTrack.value) {
      return personalFMTrack.value
    }

    if (currentIndex.value >= 0 && currentIndex.value < playlist.value.length) {
      return playlist.value[currentIndex.value]
    }
    return null
  })

  const progress = computed(() =>
    duration.value > 0 ? currentTime.value / duration.value : 0
  )

  /**
   * 获取音频 URL（参照 YPM _getAudioSourceFromNetease）
   * 优先从 IndexedDB 缓存读取，未命中则从 API 获取并写入缓存
   */
  async function getAudioSource(songId: number, useCache = true, localTrackId?: number): Promise<string | null> {
    const settingsStore = useSettingsStore()

    // 本地音轨：直接走 /stream/:trackId
    if (localTrackId) {
      return `${settingsStore.apiBase}/stream/${localTrackId}`
    }

    // 0. 检查预缓存 URL（上一首歌播放时已提前获取）
    const preloadedUrl = getNextTrackUrl(songId)
    if (preloadedUrl) {
      return preloadedUrl
    }

    // 1. 尝试从 IndexedDB 缓存读取
    if (useCache && settingsStore.enableCache) {
      try {
        const cached = await cacheManager.getTrackSource(songId)
        if (cached) {
          const blobUrl = arrayBufferToBlobUrl(cached)
          return blobUrl
        }
      } catch (e) {
        console.warn('[player] Failed to read cache:', e)
      }
    }

    // 2. 从 API 获取（使用 /song/url/v1 新版接口）
    try {
      const quality = settingsStore.musicQuality || 'exhigh'
      console.log(`[player] 请求音频URL: songId=${songId}, quality=${quality}, apiBase=${settingsStore.apiBase}`)
      const res: any = await getSongUrlV1(songId, quality)
      console.log('[player] /song/url/v1 原始返回:', JSON.stringify(res)?.slice(0, 800))
      const url = res?.data?.[0]?.url
      const freeTrialInfo = res?.data?.[0]?.freeTrialInfo
      console.log(`[player] 解析结果: url=${url ? url.slice(0, 100) + '...' : 'null'}, freeTrialInfo=${JSON.stringify(freeTrialInfo)}`)

      if (!url) {
        // 3. 尝试解灰获取
        if (settingsStore.enableUnblock) {
          console.log(`[player] songId=${songId} 尝试解灰获取`)
          const unblockRes: any = await getSongUrlMatch(songId)
          const unblockUrl = unblockRes?.data?.[0]?.url
          if (unblockUrl) {
            return unblockUrl.replace(/^http:/, 'https:')
          }
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
   * 播放指定歌曲（参照 YPM _replaceCurrentTrack 流程）
   * 核心：song 对象不需要自带 url，内部自动获取
   * 失败时显示 toast 并自动切下一首
   */
  async function playSong(song: Song): Promise<void> {
    initAudioEngine()

    // ★ 重置 scrobble 追踪
    scrobbleSubmitted = false
    scrobblePlayedTime = 0

    try {
      status.value = 'loading'

      // ★ 内部获取播放 URL（不依赖外部传入）
      const url = await getAudioSource(song.id, true, song._localTrackId)
      if (!url) {
        console.warn(`[player] No playable source for "${song.name}" (id=${song.id})`)
        status.value = 'error'
        playing.value = false
        showToast(`无法播放「${song.name}」`, { type: 'warning' })
        setTimeout(() => playNext(), 500)
        return
      }

      console.log(`[player] 开始播放: "${song.name}", url=${url.slice(0, 100)}...`)
      await audioEngine!.play(url)
      updateCurrentSongCache(song)

      // ★ Feature 1: MediaSession — 更新系统通知栏歌曲信息
      updateMediaSession(song)

      // ★ Feature 5: Scrobble — 提交"正在播放"状态
      submitScrobbleNowPlaying(song)

      // ★ 异步缓存音频到 IndexedDB（不阻塞播放）
      if (!url.startsWith('blob:')) {
        cacheAudioSource(song.id, url)
      }

      // Electron IPC 通知
      if (window.electronAPI?.sendIpcEvent) {
        window.electronAPI.sendIpcEvent('player:updateTrack', {
          title: song.name,
          artist: song.artists.map(a => a.name).join(', '),
          album: song.album.name,
          cover: song.album.picUrl,
          duration: song.duration
        })
      }

      // ★ Feature 4: 预缓存下一首
      preloadNextTrack()
    } catch (error) {
      console.error(`[player] Failed to play "${song.name}":`, error)
      status.value = 'error'
      playing.value = false
      showToast(`播放失败「${song.name}」`, { type: 'error' })
      // 自动重试或跳过
      setTimeout(() => playNext(), 500)
    }
  }

  /**
   * 更新当前歌曲缓存
   */
  function updateCurrentSongCache(song: Song): void {
    currentSongCache.value = song
    // 更新窗口标题
    if (document.title !== `MelodyAir - ${song.name}`) {
      document.title = `MelodyAir - ${song.name}`
    }
  }

  // ==================== Feature 3: 播放状态持久化 ====================

  /**
   * 保存播放进度到 localStorage（节流，每次调用间隔至少 2 秒）
   */
  let lastSaveTime = 0
  function savePlaybackProgress(): void {
    const now = Date.now()
    if (now - lastSaveTime < 2000) return
    lastSaveTime = now

    try {
      const data = {
        songId: currentSong.value?.id ?? null,
        currentTime: currentTime.value,
        timestamp: now
      }
      localStorage.setItem('melody-air:playbackProgress', JSON.stringify(data))
    } catch {
      // 忽略存储错误
    }
  }

  /**
   * 从 localStorage 恢复播放进度
   * 返回上次保存的播放位置（秒），如果没有则返回 0
   */
  function getSavedPlaybackProgress(): number {
    try {
      const raw = localStorage.getItem('melody-air:playbackProgress')
      if (!raw) return 0
      const data = JSON.parse(raw)
      // 如果保存时间超过 7 天，不恢复
      if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) return 0
      // 只有当保存的歌曲 ID 与当前播放列表中的匹配时才恢复
      if (data.songId && playlist.value.some(s => s.id === data.songId)) {
        return data.currentTime || 0
      }
      return 0
    } catch {
      return 0
    }
  }

  /**
   * 恢复上次播放状态（应用启动时调用）
   */
  async function restorePlayback(): Promise<void> {
    if (playlist.value.length === 0 || currentIndex.value < 0) return

    const savedProgress = getSavedPlaybackProgress()
    const song = playlist.value[currentIndex.value]
    if (!song) return

    try {
      initAudioEngine()
      status.value = 'loading'
      const url = await getAudioSource(song.id, true, song._localTrackId)
      if (!url) {
        console.warn('[player] Failed to restore playback: no source')
        return
      }

      await audioEngine!.play(url)
      updateCurrentSongCache(song)
      updateMediaSession(song)

      // 恢复播放进度
      if (savedProgress > 0) {
        // 需要等待音频加载完成后才能 seek
        setTimeout(() => {
          if (audioEngine && savedProgress < duration.value) {
            seek(savedProgress)
          }
        }, 500)
      }

      // 恢复后暂停（不自动播放），等待用户操作
      if (audioEngine) {
        audioEngine.pause()
      }

      // Electron IPC 通知
      if (window.electronAPI?.sendIpcEvent) {
        window.electronAPI.sendIpcEvent('player:updateTrack', {
          title: song.name,
          artist: song.artists.map(a => a.name).join(', '),
          album: song.album.name,
          cover: song.album.picUrl,
          duration: song.duration
        })
      }
    } catch (e) {
      console.error('[player] Failed to restore playback:', e)
    }
  }

  /**
   * 设置播放列表
   */
  function setPlaylist(songs: Song[], index = 0): void {
    playlist.value = songs
    currentIndex.value = Math.max(-1, Math.min(index, songs.length - 1))
    generateShuffledList()

    // 如果有有效索引，自动播放
    if (currentIndex.value >= 0) {
      playSong(songs[currentIndex.value])
    }
  }

  /**
   * 添加歌曲到播放列表
   */
  function addToPlaylist(song: Song): void {
    const exists = playlist.value.findIndex((s) => s.id === song.id)
    if (exists >= 0) {
      currentIndex.value = exists
      playSong(song)
    } else {
      playlist.value.push(song)
      currentIndex.value = playlist.value.length - 1
      generateShuffledList()
      playSong(song)
    }
  }

  /**
   * 从播放列表移除歌曲
   */
  function removeFromPlaylist(index: number): void {
    if (index < 0 || index >= playlist.value.length) return

    const removedId = playlist.value[index]?.id ?? -1
    playlist.value.splice(index, 1)
    shuffledList.value = shuffledList.value.filter((s) => s.id !== removedId)

    if (playlist.value.length === 0) {
      currentIndex.value = -1
      playing.value = false
      stopPlayback()
    } else if (index < currentIndex.value) {
      currentIndex.value--
    } else if (index === currentIndex.value) {
      if (currentIndex.value >= playlist.value.length) {
        currentIndex.value = 0
      }
      // 播放当前位置的歌曲
      if (currentIndex.value >= 0) {
        playSong(playlist.value[currentIndex.value])
      }
    }
    generateShuffledList()
  }

  /**
   * 清空播放列表
   */
  function clearPlaylist(): void {
    playlist.value = []
    currentIndex.value = -1
    shuffledList.value = []
    playing.value = false
    stopPlayback()
  }

  /**
   * 添加到"下一首播放"队列
   */
  function addToPlayNext(song: Song): void {
    // 如果已经在队列中，不重复添加
    if (!playNextList.value.find((s) => s.id === song.id)) {
      playNextList.value.push(song)
    }
  }

  /**
   * 播放下一首
   */
  async function playNext(): Promise<void> {
    // 先检查"下一首播放"队列
    if (playNextList.value.length > 0) {
      const nextSong = playNextList.value.shift()!
      addToPlaylist(nextSong)
      return
    }

    // 私人FM模式
    if (isPersonalFM.value) {
      await playPersonalFMNext()
      return
    }

    if (playlist.value.length === 0) return

    switch (playMode.value) {
      case 'loopOne':
        // 单曲循环：重新播放当前歌曲
        if (currentSong.value) {
          await playSong(currentSong.value)
        }
        break
      case 'random':
        // 随机播放
        if (shuffledList.value.length > 0) {
          const randomIndex = Math.floor(Math.random() * shuffledList.value.length)
          const nextSong = shuffledList.value[randomIndex]
          const originalIndex = playlist.value.findIndex((s) => s.id === nextSong.id)
          if (originalIndex >= 0) {
            currentIndex.value = originalIndex
            await playSong(nextSong)
          }
        }
        break
      case 'reversed':
        // 倒序播放
        currentIndex.value = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
        if (currentSong.value) {
          await playSong(currentSong.value)
        }
        break
      case 'loop':
      case 'sequence':
      default:
        // 顺序/列表循环
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
        if (currentSong.value) {
          await playSong(currentSong.value)
        }
        break
    }
  }

  /**
   * 播放上一首
   */
  async function playPrev(): Promise<void> {
    if (isPersonalFM.value) {
      // FM模式不支持上一首
      return
    }

    if (playlist.value.length === 0) return

    // 如果当前播放时间超过3秒，重新播放当前歌曲
    if (currentTime.value > 3) {
      seek(0)
      return
    }

    switch (playMode.value) {
      case 'random':
        // 随机模式下，上一首也是随机的（但避免重复）
        if (shuffledList.value.length > 1) {
          let prevIndex: number
          do {
            prevIndex = Math.floor(Math.random() * shuffledList.value.length)
          } while (
            prevIndex === currentIndex.value &&
            shuffledList.value.length > 1
          )
          const prevSong = shuffledList.value[prevIndex]
          const originalIndex = playlist.value.findIndex((s) => s.id === prevSong.id)
          if (originalIndex >= 0) {
            currentIndex.value = originalIndex
            await playSong(prevSong)
          }
        }
        break
      case 'reversed':
        // 倒序播放的"上一首"实际上是正向
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
        if (currentSong.value) {
          await playSong(currentSong.value)
        }
        break
      default:
        // 其他模式都是正常的上一首
        currentIndex.value =
          (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
        if (currentSong.value) {
          await playSong(currentSong.value)
        }
        break
    }
  }

  /**
   * 切换播放/暂停
   */
  function togglePlaying(): void {
    initAudioEngine()

    if (!audioEngine || !currentSong.value) return

    if (playing.value) {
      audioEngine.pause()
    } else {
      audioEngine.resume()
    }
  }

  /**
   * 切换播放模式
   */
  function togglePlayMode(): void {
    const modes: PlayMode[] = ['sequence', 'loop', 'loopOne', 'random', 'reversed']
    const idx = modes.indexOf(playMode.value)
    playMode.value = modes[(idx + 1) % modes.length]

    // 切换到随机模式时生成随机列表
    if (playMode.value === 'random') {
      generateShuffledList()
    }
  }

  /**
   * 设置音量
   */
  function setVolume(v: number): void {
    volume.value = Math.max(0, Math.min(1, v))
    if (audioEngine) {
      audioEngine.setVolume(volume.value)
    }
  }

  /**
   * 切换静音
   */
  function toggleMute(): void {
    initAudioEngine()
    if (audioEngine) {
      muted.value = audioEngine.toggleMute()
    }
  }

  /**
   * 跳转到指定位置
   */
  function seek(time: number): void {
    if (audioEngine) {
      audioEngine.seek(time)
    }
  }

  /**
   * 处理播放结束事件
   */
  async function handlePlayEnd(): Promise<void> {
    await playNext()
  }

  /**
   * 生成随机播放列表（Fisher-Yates 洗牌算法）
   */
  function generateShuffledList(): void {
    shuffledList.value = [...playlist.value]
    for (let i = shuffledList.value.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledList.value[i], shuffledList.value[j]] = [shuffledList.value[j]!, shuffledList.value[i]!]
    }
  }

  // ==================== Feature 1: MediaSession ====================

  /**
   * 更新 MediaSession 元数据，让系统通知栏显示歌曲信息和控制按钮
   * 参考 YPM Player.js:571-665
   */
  function updateMediaSession(song: Song): void {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name,
      artist: song.artists.map(a => a.name).join(', '),
      album: song.album.name,
      artwork: song.album.picUrl
        ? [{ src: song.album.picUrl, sizes: '512x512', type: 'image/jpeg' }]
        : []
    })

    navigator.mediaSession.setActionHandler('play', () => {
      if (!playing.value) togglePlaying()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (playing.value) togglePlaying()
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev())
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        seek(details.seekTime)
      }
    })
    navigator.mediaSession.setActionHandler('stop', () => {
      stopPlayback()
      playing.value = false
    })
  }

  /**
   * 更新 MediaSession 播放状态（用于 seek 进度条）
   */
  function updateMediaSessionPlaybackState(): void {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.setPositionState!(duration.value > 0 ? {
        duration: duration.value,
        playbackRate: 1,
        position: Math.min(currentTime.value, duration.value)
      } : undefined)
    } catch {
      // 忽略 position 超出范围的错误
    }
  }

  // ==================== Feature 5: Scrobble 听歌打卡 ====================

  /**
   * 提交"正在播放"通知（立即调用，不等待播放进度）
   */
  function submitScrobbleNowPlaying(song: Song): void {
    // sourceid: 来源 ID（如歌单 ID），此处暂用 0 表示无特定来源
    scrobble(song.id, 0, 0).catch(() => {
      // 静默失败，不影响播放体验
    })
  }

  /**
   * 检查并提交 Scrobble（当播放进度达到 50% 或超过 4 分钟时提交）
   * 参考 YPM: 播放进度超过一半或满 4 分钟时打卡
   */
  function checkAndSubmitScrobble(): void {
    if (scrobbleSubmitted || !currentSong.value) return

    const song = currentSong.value
    const durationSec = duration.value
    if (durationSec <= 0) return

    // 播放进度超过 50% 或播放时长超过 4 分钟
    const progressRatio = currentTime.value / durationSec
    if (progressRatio >= 0.5 || scrobblePlayedTime >= 240) {
      scrobbleSubmitted = true
      scrobble(song.id, 0, Math.floor(currentTime.value)).catch(() => {})
    }
  }

  // ==================== Feature 4: 预缓存下一首 ====================

  /**
   * 预缓存下一首歌的音频数据
   * 参考 YPM _cacheNextTrack: 播放当前歌曲时提前获取下一首的详情和 URL
   */
  async function preloadNextTrack(): Promise<void> {
    const settingsStore = useSettingsStore()
    if (!settingsStore.autoCacheNextTrack) return

    // 确定下一首歌
    let nextSong: Song | null = null

    if (playNextList.value.length > 0) {
      nextSong = playNextList.value[0]!
    } else if (isPersonalFM.value && personalFMNextTrack.value) {
      nextSong = personalFMNextTrack.value
    } else if (playlist.value.length > 0 && currentIndex.value >= 0) {
      const nextIdx = (currentIndex.value + 1) % playlist.value.length
      if (nextIdx !== currentIndex.value) {
        nextSong = playlist.value[nextIdx]!
      }
    }

    if (!nextSong || nextSong.id === nextTrackIdCache) return

    nextTrackIdCache = nextSong.id
    nextTrackUrlCache = null

    // 尝试从缓存获取 URL
    try {
      if (settingsStore.enableCache) {
        const cached = await cacheManager.getTrackSource(nextSong.id)
        if (cached) {
          nextTrackUrlCache = arrayBufferToBlobUrl(cached)
          console.log(`[player] Pre-cached (from IndexedDB) next track: ${nextSong.name}`)
          return
        }
      }

      // 缓存未命中，从 API 获取并缓存
      const url = await getAudioSource(nextSong.id, false, nextSong._localTrackId) // 不读缓存（上面已试过）
      if (url) {
        nextTrackUrlCache = url
        // 异步写入 IndexedDB
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
   * 获取预缓存的下一首 URL（供 getAudioSource 使用）
   */
  function getNextTrackUrl(songId: number): string | null {
    if (nextTrackIdCache === songId && nextTrackUrlCache) {
      // 使用后清除缓存
      const url = nextTrackUrlCache
      nextTrackUrlCache = null
      nextTrackIdCache = null
      return url
    }
    return null
  }

  /**
   * 停止播放
   */
  function stopPlayback(): void {
    if (audioEngine) {
      audioEngine.stop()
    }
  }

  /**
   * 设置当前播放时间（供外部如 useAudio 调用）
   */
  function setCurrentTime(time: number): void {
    currentTime.value = time
  }

  /**
   * 设置音频总时长（供外部如 useAudio 调用）
   */
  function setDuration(dur: number): void {
    duration.value = dur
  }

  /**
   * 启用私人 FM 模式
   */
  async function enablePersonalFM(track: Song, nextTrack?: Song): Promise<void> {
    isPersonalFM.value = true
    personalFMTrack.value = track
    personalFMNextTrack.value = nextTrack ?? null
    await playSong(track)
  }

  /**
   * 禁用私人 FM 模式
   */
  function disablePersonalFM(): void {
    isPersonalFM.value = false
    personalFMTrack.value = null
    personalFMNextTrack.value = null
  }

  /**
   * 播放下一首 FM 歌曲
   */
  async function playPersonalFMNext(): Promise<void> {
    if (personalFMNextTrack.value) {
      personalFMTrack.value = personalFMNextTrack.value
      personalFMNextTrack.value = null
      await playSong(personalFMTrack.value)
      // TODO: 触发获取下一首 FM 歌曲的 API 调用
    }
  }

  /**
   * 销毁播放器（组件卸载时调用）
   */
  function destroy(): void {
    if (audioEngine) {
      audioEngine.destroy()
      audioEngine = null
    }
  }

  return {
    playlist,
    currentIndex,
    playing,
    playMode,
    currentTime,
    duration,
    volume,
    muted,
    shuffledList,
    playNextList,
    isPersonalFM,
    personalFMTrack,
    personalFMNextTrack,
    status,
    currentSongCache,

    // Computed
    currentSong,
    progress,

    // Actions
    setPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    addToPlayNext,
    playNext,
    playPrev,
    togglePlaying,
    togglePlayMode,
    setVolume,
    toggleMute,
    seek,
    setCurrentTime,
    setDuration,
    enablePersonalFM,
    disablePersonalFM,
    restorePlayback,
    destroy
  }
}, {
  persist: {
    pick: [
      'playMode',
      'volume',
      'muted',
      'playlist',
      'currentIndex'
    ]
  }
})

/**
 * Electron IPC 类型声明
 */
declare global {
  interface Window {
    electronAPI?: {
      sendIpcEvent: (channel: string, data?: unknown) => void
      onIpcEvent: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}
