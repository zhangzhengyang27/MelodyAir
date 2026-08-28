import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { PlayMode, PlayerStatus } from '../utils/player'
import { showToast } from '../composables/useToast'
import { logger } from '../utils/logger'
import { playerDefaults, migrateWithDefaults } from './defaults'
import { usePlayerCache } from '../composables/usePlayerCache'
import { useScrobble } from '../composables/useScrobble'
import { useMediaSession } from '../composables/useMediaSession'
import { usePlaybackProgress } from '../composables/usePlaybackProgress'
import { getStorage, setStorage } from '../utils/storage'
import { useSettingsStore } from './settings'
import { useLyricsStore } from './lyrics'
import { useUserStore } from './user'
import { LyricsSyncEngine } from '../utils/o3icsSyncEngine'
import { getAudioAdapter } from '../utils/audioAdapter'
import { throttledPersistStorage } from '../utils/persistStorage'
import { fmTrash } from '../api/fm'

export interface Song {
  id: number
  name: string
  artists: { id: number; name: string }[]
  album: { id: number; name: string; picUrl: string }
  duration: number
  url?: string
  /** 0=免费, 1=VIP/付费, 4=专辑购买 */
  fee?: number
  /** 是否使用 HTML5 流式播放模式（长音频如播客，不支持均衡器和可视化） */
  _streaming?: boolean
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
  shuffledList: Song[]
  playNextList: Song[]
  isPersonalFM: boolean
  personalFMTrack: Song | null
  personalFMNextTrack: Song | null
  status: PlayerStatus
  currentSongCache: Song | null
}

/** 模块级纯函数：由歌曲列表构建随机播放列表（generateShuffledList 与 afterHydrate 共用） */
function buildShuffledList(songs: Song[]): Song[] {
  const list = [...songs]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!]
  }
  return list
}

export const usePlayerStore = defineStore('player', () => {
  const settingsStore = useSettingsStore()

  // ==================== 状态 ====================
  const playlist = ref<Song[]>([])
  const currentIndex = ref(-1)
  const playing = ref(false)
  const playMode = ref<PlayMode>('sequence')
  const currentTime = ref(0)
  const duration = ref(0)
  const bufferedProgress = ref(0)
  const volume = ref(0.8)
  const muted = ref(false)
  const shuffledList = ref<Song[]>([])
  const playNextList = ref<Song[]>([])
  const isPersonalFM = ref(false)
  const personalFMTrack = ref<Song | null>(null)
  const personalFMNextTrack = ref<Song | null>(null)
  const personalFMQueue = ref<Song[]>([])
  const status = ref<PlayerStatus>('paused')
  const currentSongCache = ref<Song | null>(null)
  const sleepTimerDeadline = ref<number | null>(null)
  const sleepTimerTimeoutId = ref<number | null>(null)
  const sleepTimerTickId = ref<number | null>(null)
  const playHistory = ref<Array<{ song: Song; playedAt: number; playCount: number }>>([])
  // 播放导航栈：记录用户实际播放顺序，用于"上一首"回溯（不同于播放列表顺序）
  const playNavStack = ref<Song[]>([])
  // 是否正在从导航栈回溯（避免把回溯的歌再压入栈）
  let isNavigatingBack = false
  // 播放代际令牌：每次发起播放自增，await 音频源返回后校验，
  // 防止慢响应覆盖更新的播放请求（快速连点切歌时界面与实际播放不一致）
  let playSequence = 0

  // Blob URL 内存管理
  const createdBlobUrls: string[] = []
  const activeBlobUrl = ref<string | null>(null)

  // IPC 发送节流（避免每帧都向主进程发消息）
  let lastProgressIpcTime = 0
  let lastLyricsIpcTime = 0
  let lastLyricText = ''
  const PROGRESS_IPC_INTERVAL = 300  // 任务栏进度 300ms
  const LYRICS_IPC_INTERVAL = 500    // Touch Bar 歌词 500ms

  // 播放结束兜底检测定时器（Howler.js onend 事件在 Web Audio 模式下偶发不触发）
  let endDetectTimer: number | null = null

  // 音频事件监听器清理函数
  let audioTimeUpdateCleanup: (() => void) | null = null
  let audioStateChangeCleanup: (() => void) | null = null
  let audioEndedCleanup: (() => void) | null = null
  let audioErrorCleanup: (() => void) | null = null
  let audioBufferedCleanup: (() => void) | null = null

  // 歌词同步引擎（全局，不依赖组件生命周期）
  const lyricsSyncEngine = new LyricsSyncEngine({
    offsetMs: 0,
    toleranceMs: 120,
  })
  let lyricsLinesWatcher: (() => void) | null = null

  // 统一音频适配器（Electron IPC / 浏览器本地 AudioEngine 降级）
  const audioAdapter = getAudioAdapter()

  // 音频可视化频率数据（从音频引擎获取）
  const frequencyData = ref<Uint8Array>(new Uint8Array(128))

  // ==================== 计算属性 ====================
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

  // ==================== Composable 依赖 ====================
  // 当前歌曲实际播放的音质（可能因歌曲不支持而降级，null 表示与设置一致）
  const actualQuality = ref<string | null>(null)
  const playerCache = usePlayerCache({
    createdBlobUrls,
    activeBlobUrl,
    onQualityResolved: (level: string) => { actualQuality.value = level },
  })

  const scrobbleHelper = useScrobble({
    currentSong,
    currentTime,
    duration,
  })

  const mediaSessionHelper = useMediaSession({
    playing,
    currentTime,
    duration,
    togglePlaying: () => togglePlaying(),
    playPrev: () => playPrev(),
    playNext: () => playNext(),
    seek: (t) => seek(t),
    stopPlayback: () => stopPlayback(),
  })

  const playbackProgress = usePlaybackProgress({
    currentSong,
    currentTime,
    playlist,
  })

  // ==================== 音频引擎事件监听 ====================
  function initAudioEventListeners(): void {
    // 时间更新
    audioTimeUpdateCleanup = audioAdapter.on('timeUpdate', (data) => {
      currentTime.value = data.currentTime
      duration.value = data.duration

      // 播放结束兜底检测：Howler.js onend 在 Web Audio 模式下偶发不触发，
      // 当进度已到末尾且持续 1s 仍处于播放状态时，手动触发切歌。
      const nearEnd = duration.value > 0 && currentTime.value >= duration.value - 0.25
      if (nearEnd && playing.value) {
        if (endDetectTimer === null) {
          // [TEMP-DEBUG]
          logger.warn('player', `[TEMP-DEBUG] arm endDetect (cur=${data.currentTime.toFixed(2)}, dur=${data.duration.toFixed(2)})`)
          endDetectTimer = window.setTimeout(() => {
            endDetectTimer = null
            if (playing.value && duration.value > 0 && currentTime.value >= duration.value - 0.25) {
              logger.warn('player', 'Playback end detected via fallback (onended event missed)')
              // onend 未触发时 Howler 内部状态混乱（isPlaying 仍为 true），
              // 必须先强制停止并重置状态，否则重播/切歌时会被 audio-engine
              // 的 "同一首歌且正在播放则忽略" 逻辑拦截，导致界面无响应。
              audioAdapter.stop()
              playing.value = false
              status.value = 'paused'
              handlePlayEnd()
            }
          }, 1000)
        }
      } else if (endDetectTimer !== null) {
        clearTimeout(endDetectTimer)
        endDetectTimer = null
      }

      // 全局歌词同步（不依赖组件，所有页面都生效）
      const lyricsStore = useLyricsStore()
      if (lyricsStore.hasLyrics && !lyricsStore.isDraggingProgress) {
        const result = lyricsSyncEngine.update(data.currentTime * 1000)
        if (result.changed) {
          lyricsStore.setCurrentIndex(result.index)
        }
      }

      playbackProgress.savePlaybackProgress()
      scrobbleHelper.accumulatePlayedTime()
      scrobbleHelper.checkAndSubmitScrobble()
      mediaSessionHelper.updateMediaSessionPlaybackState()

      // Send progress and lyrics to Touch Bar（节流，避免每帧 IPC）
      if (window.electronAPI?.sendIpcEvent) {
        const now = Date.now()
        if (now - lastProgressIpcTime >= PROGRESS_IPC_INTERVAL) {
          lastProgressIpcTime = now
          window.electronAPI.sendIpcEvent('player:updateProgress', data.currentTime)
        }

        const lyricText = lyricsStore.currentLine?.text || ''
        // 歌词变化时立即发送，否则按间隔节流
        if (lyricText !== lastLyricText || now - lastLyricsIpcTime >= LYRICS_IPC_INTERVAL) {
          lastLyricsIpcTime = now
          lastLyricText = lyricText
          window.electronAPI.sendIpcEvent('player:updateLyrics', {
            currentText: lyricText,
            hasLyrics: lyricsStore.hasLyrics
          })
        }
      }
    })

    // 监听歌词行变化（切换歌曲时更新同步引擎）
    const lyricsStoreForWatch = useLyricsStore()
    lyricsLinesWatcher = watch(
      () => lyricsStoreForWatch.lines,
      (lines) => {
        lyricsSyncEngine.setLines(lines)
        lyricsSyncEngine.reset()
        lyricsStoreForWatch.setCurrentIndex(-1)
      }
    )

    // 状态变化
    audioStateChangeCleanup = audioAdapter.on('stateChange', (data) => {
      // [TEMP-DEBUG]
      logger.warn('player', `[TEMP-DEBUG] stateChange: ${data.status}`)
      status.value = data.status as PlayerStatus
      playing.value = data.status === 'playing'
    })

    // 播放结束
    audioEndedCleanup = audioAdapter.on('ended', () => {
      // [TEMP-DEBUG]
      logger.warn('player', '[TEMP-DEBUG] received ENDED event -> handlePlayEnd')
      handlePlayEnd()
    })

    // 错误
    audioErrorCleanup = audioAdapter.on('error', (data) => {
      logger.error('player', 'Player error:', data.message)
      status.value = 'error'
      playing.value = false
      // Electron 模式下 audioAdapter.play() 仅发送 IPC 不等待结果，
      // Howler 的加载/解码错误通过此事件异步传递，需在此自动跳下一首。
      // 使用 failSkipToken 防止用户手动切歌后旧的失败定时器仍触发。
      const skipToken = failSkipToken
      setTimeout(() => {
        if (skipToken === failSkipToken) {
          logger.info('player', 'Auto-skip after playback error')
          playNext()
        }
      }, 500)
    })

    // 缓冲进度
    audioBufferedCleanup = audioAdapter.on('buffered', (data) => {
      bufferedProgress.value = data.progress
    })

    // 音频可视化频率数据
    audioAdapter.on('frequencyData', (data: Uint8Array) => {
      frequencyData.value = data
    })

    logger.info('player', 'Audio event listeners initialized (via audioAdapter)')
  }

  // 初始化音频事件监听（store 创建时执行）
  initAudioEventListeners()

  // 应用持久化的播放速率
  if (settingsStore.playbackSpeed && settingsStore.playbackSpeed !== 1) {
    audioAdapter.setPlaybackRate(settingsStore.playbackSpeed)
  }

  // ==================== 核心播放逻辑 ====================
  // 播放失败自动跳下一首的令牌，防止用户手动切歌后旧的失败定时器仍触发
  let failSkipToken = 0

  async function playSong(song: Song): Promise<void> {
    // 代际令牌：本次播放请求的序号，await 恢复后校验是否已被更新的请求取代
    const seq = ++playSequence
    // 切歌时释放旧 Blob URL
    playerCache.releaseStaleBlobUrls()
    // 重置失败跳过令牌，使之前的失败定时器失效
    failSkipToken++
    // 播放导航栈：非回溯时，将当前歌曲压入栈（用于上一首回溯）
    if (!isNavigatingBack && currentSong.value && currentSong.value.id !== song.id) {
      playNavStack.value.push(currentSong.value)
      if (playNavStack.value.length > 100) playNavStack.value.shift()
    }
    isNavigatingBack = false
    // 重置 scrobble 追踪
    scrobbleHelper.resetScrobbleState()
    // 重置播放进度，避免切歌后进度条显示旧值
    currentTime.value = 0
    duration.value = 0
    bufferedProgress.value = 0
    // 重置实际音质（新歌曲重新解析）
    actualQuality.value = null

    try {
      status.value = 'loading'
      markPlayHistory(song)

      const url = await playerCache.getAudioSource(song.id, true)
      // 已被更新的播放请求取代（快速连点切歌），丢弃本次慢响应，避免覆盖新歌
      if (seq !== playSequence) return
      if (!url) {
        logger.warn('player', `No playable source for "${song.name}" (id=${song.id})`)
        status.value = 'error'
        playing.value = false
        showToast(`无法播放「${song.name}」`, { type: 'warning', dedupeKey: 'player-unplayable' })
        const skipToken = failSkipToken
        setTimeout(() => { if (skipToken === failSkipToken) playNext() }, 500)
        return
      }

      logger.info('player', `开始播放: "${song.name}", url=${url.slice(0, 100)}...`)
      // 通过统一音频适配器播放（Electron IPC / 浏览器本地 AudioEngine 降级）
      // 长音频（如播客）使用 HTML5 流式播放模式，避免 Web Audio API 需先下载整个文件再解码导致超时
      audioAdapter.play(url, song.id, !!song._streaming)
      activeBlobUrl.value = url.startsWith('blob:') ? url : null
      updateCurrentSongCache(song)

      // MediaSession
      mediaSessionHelper.updateMediaSession(song)
      // Scrobble
      scrobbleHelper.submitScrobbleNowPlaying(song)
      // 异步缓存
      if (!url.startsWith('blob:')) {
        playerCache.cacheAudioSource(song.id, url)
      }

      // Electron IPC
      if (window.electronAPI?.sendIpcEvent) {
        window.electronAPI.sendIpcEvent('player:updateTrack', {
          title: song.name,
          artist: song.artists.map(a => a.name).join(', '),
          album: song.album.name,
          cover: song.album.picUrl,
          duration: song.duration
        })

        // Reset Touch Bar lyrics for new track
        window.electronAPI.sendIpcEvent('player:updateLyrics', {
          currentText: '',
          hasLyrics: false
        })

        // Update Touch Bar like state for new track
        const userStore = useUserStore()
        const isLiked = userStore.likedSongIds.includes(song.id)
        window.electronAPI.sendIpcEvent('player:updateLikeState', isLiked)
      }

      // 预缓存下一首
      playerCache.preloadNextTrack({
        playNextList, isPersonalFM, personalFMNextTrack, playlist, currentIndex,
      })
    } catch (error) {
      logger.error('player', `Failed to play "${song.name}":`, error)
      status.value = 'error'
      playing.value = false
      showToast(`播放失败「${song.name}」`, { type: 'error', dedupeKey: 'player-error' })
      const skipToken = failSkipToken
      setTimeout(() => { if (skipToken === failSkipToken) playNext() }, 500)
    }
  }

  function updateCurrentSongCache(song: Song): void {
    currentSongCache.value = song
    if (document.title !== `MelodyAir - ${song.name}`) {
      document.title = `MelodyAir - ${song.name}`
    }
  }

  function markPlayHistory(song: Song): void {
    if (!song || typeof song.id !== 'number') return
    const index = playHistory.value.findIndex((item) => item.song.id === song.id)
    const playedAt = Date.now()

    if (index >= 0) {
      const old = playHistory.value[index]
      playHistory.value.splice(index, 1)
      playHistory.value.unshift({
        song,
        playedAt,
        playCount: old.playCount + 1,
      })
    } else {
      playHistory.value.unshift({
        song,
        playedAt,
        playCount: 1,
      })
    }

    if (playHistory.value.length > 300) {
      playHistory.value = playHistory.value.slice(0, 300)
    }
    setStorage('play-history', playHistory.value)
  }

  function loadPersistentState(): void {
    sleepTimerDeadline.value = getStorage<number | null>('sleep-timer-deadline', null)
    playHistory.value = getStorage<Array<{ song: Song; playedAt: number; playCount: number }>>('play-history', [])
    if (sleepTimerDeadline.value && sleepTimerDeadline.value > Date.now()) {
      const remaining = sleepTimerDeadline.value - Date.now()
      clearSleepTimerHandles()
      sleepTimerTimeoutId.value = window.setTimeout(() => {
        if (sleepTimerDeadline.value) finishSleepTimer()
      }, remaining)
    } else if (sleepTimerDeadline.value && sleepTimerDeadline.value <= Date.now()) {
      // 已过期的定时，清除
      sleepTimerDeadline.value = null
      setStorage('sleep-timer-deadline', null)
    }
  }

  function clearSleepTimerHandles(): void {
    if (sleepTimerTimeoutId.value !== null) {
      window.clearTimeout(sleepTimerTimeoutId.value)
      sleepTimerTimeoutId.value = null
    }
    if (sleepTimerTickId.value !== null) {
      window.clearInterval(sleepTimerTickId.value)
      sleepTimerTickId.value = null
    }
  }

  function clearPlayHistory(): void {
    playHistory.value = []
    setStorage('play-history', playHistory.value)
  }

  function removeHistoryBySongId(songId: number): void {
    playHistory.value = playHistory.value.filter(item => item.song.id !== songId)
    setStorage('play-history', playHistory.value)
  }

  function setSleepTimerDeadline(deadline: number | null): void {
    sleepTimerDeadline.value = deadline
    setStorage('sleep-timer-deadline', deadline)
  }

  // ==================== 播放列表管理 ====================
  function setPlaylist(songs: Song[], index = 0): void {
    playlist.value = songs
    currentIndex.value = Math.max(-1, Math.min(index, songs.length - 1))
    generateShuffledList()
    if (currentIndex.value >= 0) {
      playSong(songs[currentIndex.value])
    }
  }

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
      if (currentIndex.value >= 0) {
        playSong(playlist.value[currentIndex.value])
      }
    }
    generateShuffledList()
  }

  function clearPlaylist(): void {
    playlist.value = []
    currentIndex.value = -1
    shuffledList.value = []
    playing.value = false
    stopPlayback()
  }

  function reorderPlaylist(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= playlist.value.length || toIndex >= playlist.value.length) return

    const [movedSong] = playlist.value.splice(fromIndex, 1)
    playlist.value.splice(toIndex, 0, movedSong)

    // 智能调整 currentIndex
    const oldCurrentIndex = currentIndex.value
    if (fromIndex === oldCurrentIndex) {
      // 拖动的是当前播放歌曲
      currentIndex.value = toIndex
    } else if (fromIndex < oldCurrentIndex && toIndex >= oldCurrentIndex) {
      // 从当前歌曲前面拖到后面
      currentIndex.value = oldCurrentIndex - 1
    } else if (fromIndex > oldCurrentIndex && toIndex <= oldCurrentIndex) {
      // 从当前歌曲后面拖到前面
      currentIndex.value = oldCurrentIndex + 1
    }

    generateShuffledList()
  }

  function removeDuplicates(): number {
    const seen = new Set<number>()
    const uniquePlaylist: Song[] = []
    let removedCount = 0

    playlist.value.forEach((song, index) => {
      if (!seen.has(song.id)) {
        seen.add(song.id)
        uniquePlaylist.push(song)
      } else {
        removedCount++
        // 如果删除的歌曲在当前播放歌曲之前，需要调整 currentIndex
        if (index < currentIndex.value) {
          currentIndex.value--
        }
      }
    })

    playlist.value = uniquePlaylist
    generateShuffledList()
    return removedCount
  }

  function addToPlayNext(song: Song): void {
    if (!playNextList.value.find((s) => s.id === song.id)) {
      playNextList.value.push(song)
    }
  }

  function insertNext(song: Song): void {
    const existingIndex = playlist.value.findIndex((s) => s.id === song.id)

    // 如果就是当前播放歌曲，无需移动
    if (existingIndex === currentIndex.value) return

    if (existingIndex >= 0 && existingIndex !== currentIndex.value + 1) {
      playlist.value.splice(existingIndex, 1)
      if (existingIndex < currentIndex.value) {
        currentIndex.value--
      }
    }

    if (existingIndex !== currentIndex.value + 1) {
      playlist.value.splice(currentIndex.value + 1, 0, song)
    }

    if (playMode.value === 'random') {
      const shuffledIndex = shuffledList.value.findIndex((s) => s.id === song.id)
      if (shuffledIndex >= 0) {
        shuffledList.value.splice(shuffledIndex, 1)
      }
      shuffledList.value.splice(0, 0, song)
    }
  }

  function removeQueueItem(index: number): void {
    if (index < 0 || index >= playlist.value.length) return

    const removedSong = playlist.value[index]
    playlist.value.splice(index, 1)

    if (playMode.value === 'random') {
      const shuffledIndex = shuffledList.value.findIndex((s) => s.id === removedSong.id)
      if (shuffledIndex >= 0) {
        shuffledList.value.splice(shuffledIndex, 1)
      }
    }

    if (index < currentIndex.value) {
      currentIndex.value--
    } else if (index === currentIndex.value) {
      if (playlist.value.length === 0) {
        stopPlayback()
      } else {
        currentIndex.value = Math.min(currentIndex.value, playlist.value.length - 1)
        if (currentSong.value) {
          playSong(currentSong.value)
        }
      }
    }
  }

  // ==================== 播放控制 ====================
  async function playNext(): Promise<void> {
    // [TEMP-DEBUG]
    logger.warn('player', `[TEMP-DEBUG] playNext entry: mode=${playMode.value}, playlist=${playlist.value.length}, shuffled=${shuffledList.value.length}, curIdx=${currentIndex.value}, fm=${isPersonalFM.value}, playNextList=${playNextList.value.length}`)
    if (playNextList.value.length > 0) {
      const nextSong = playNextList.value.shift()!
      // 跳过当前正在播放的歌曲（防御性处理）
      if (nextSong.id !== currentSong.value?.id) {
        // 将歌曲插入到当前播放位置的下一首，然后播放
        insertNext(nextSong)
        currentIndex.value++
        await playSong(nextSong)
        return
      }
      // 如果是当前歌曲，继续走正常的 playNext 逻辑
    }

    if (isPersonalFM.value) {
      await playPersonalFMNext()
      return
    }

    if (playlist.value.length === 0) return

    switch (playMode.value) {
      case 'loopOne':
        if (currentSong.value) await playSong(currentSong.value)
        break
      case 'random':
        // 兜底：重启恢复后 shuffledList 未持久化会为空，需重建（否则随机模式静默失效）
        if (shuffledList.value.length === 0 && playlist.value.length > 0) {
          generateShuffledList()
        }
        if (shuffledList.value.length > 0) {
          // 排除当前播放歌曲，避免连续重复（队列中至少有两首时）
          const candidates = shuffledList.value.filter((s) => s.id !== currentSong.value?.id)
          const pool = candidates.length > 0 ? candidates : shuffledList.value
          const randomIndex = Math.floor(Math.random() * pool.length)
          const nextSong = pool[randomIndex]
          const originalIndex = playlist.value.findIndex((s) => s.id === nextSong.id)
          if (originalIndex >= 0) {
            currentIndex.value = originalIndex
            await playSong(nextSong)
          }
        }
        break
      case 'reversed':
        currentIndex.value = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
        if (currentSong.value) await playSong(currentSong.value)
        break
      case 'loop':
      case 'sequence':
      default: {
        const isLast = currentIndex.value >= playlist.value.length - 1
        if (playMode.value === 'sequence' && isLast) {
          // 顺序播放到最后一首，停止播放
          stopPlayback()
          playing.value = false
          status.value = 'paused'
          break
        }
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
        if (currentSong.value) await playSong(currentSong.value)
        break
      }
    }
  }

  async function playPrev(): Promise<void> {
    if (isPersonalFM.value) return
    if (playlist.value.length === 0) return

    // 播放超过 3 秒时，回到开头（常见音乐播放器行为）
    if (currentTime.value > 3) {
      seek(0)
      return
    }

    // 优先从播放导航栈回溯（记录用户实际播放顺序）
    if (playNavStack.value.length > 0) {
      const prevSong = playNavStack.value.pop()!
      // 找到该歌曲在播放列表中的位置
      const idx = playlist.value.findIndex((s) => s.id === prevSong.id)
      isNavigatingBack = true
      if (idx >= 0) {
        currentIndex.value = idx
      } else {
        // 歌曲不在当前播放列表中，添加到队列
        playlist.value.push(prevSong)
        currentIndex.value = playlist.value.length - 1
      }
      await playSong(prevSong)
      return
    }

    // 导航栈为空时，回退到播放列表顺序
    switch (playMode.value) {
      case 'random':
        // 兜底：重启恢复后 shuffledList 未持久化会为空，需重建（否则随机模式静默失效）
        if (shuffledList.value.length === 0 && playlist.value.length > 0) {
          generateShuffledList()
        }
        if (shuffledList.value.length > 1) {
          const currentSongId = currentSong.value?.id
          let prevSong: Song | undefined
          let attempts = 0
          do {
            const prevIndex = Math.floor(Math.random() * shuffledList.value.length)
            prevSong = shuffledList.value[prevIndex]
            attempts++
          } while (prevSong?.id === currentSongId && attempts < 10)
          if (prevSong) {
            const originalIndex = playlist.value.findIndex((s) => s.id === prevSong!.id)
            if (originalIndex >= 0) {
              currentIndex.value = originalIndex
              await playSong(prevSong)
            }
          }
        }
        break
      case 'reversed':
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
        if (currentSong.value) await playSong(currentSong.value)
        break
      default:
        currentIndex.value = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
        if (currentSong.value) await playSong(currentSong.value)
        break
    }
  }

  function togglePlaying(): void {
    if (!currentSong.value) return
    audioAdapter.toggle()
  }

  function togglePlayMode(): void {
    const modes: PlayMode[] = ['sequence', 'loop', 'loopOne', 'random', 'reversed']
    const labels: Record<PlayMode, string> = {
      sequence: '顺序播放', loop: '列表循环', loopOne: '单曲循环',
      random: '随机播放', reversed: '倒序播放',
    }
    const idx = modes.indexOf(playMode.value)
    playMode.value = modes[(idx + 1) % modes.length]
    if (playMode.value === 'random') generateShuffledList()
    // 模式切换无图标外反馈，toast 告知当前模式
    showToast(`播放模式：${labels[playMode.value]}`, { dedupeKey: 'play-mode' })
  }

  function setVolume(v: number): void {
    volume.value = Math.max(0, Math.min(1, v))
    audioAdapter.setVolume(volume.value)
  }

  /**
   * 把持久化的音量/静音/倍速同步给音频引擎。
   * Electron 下引擎窗口每次启动都是默认状态（音量 0.8、未静音、倍速 1），
   * store 创建时发出的 setPlaybackRate 会早于引擎就绪而被丢弃，
   * 必须等引擎 ready 后（见 main.ts 的 tryRestore）再同步，否则 UI 显示与实际播放不符。
   */
  function syncAudioEngineState(): void {
    audioAdapter.setVolume(volume.value)
    if (muted.value) audioAdapter.toggleMute()
    if (settingsStore.playbackSpeed && settingsStore.playbackSpeed !== 1) {
      audioAdapter.setPlaybackRate(settingsStore.playbackSpeed)
    }
  }

  function setPlaybackSpeed(rate: number): void {
    const safeRate = Math.max(0.5, Math.min(2, rate))
    settingsStore.playbackSpeed = safeRate
    audioAdapter.setPlaybackRate(safeRate)
  }

  function setEqualizerBand(bandIndex: number, gain: number): void {
    audioAdapter.setEqualizerBand(bandIndex, gain)
  }

  function setEqualizerBands(gains: number[]): void {
    audioAdapter.setEqualizerBands(gains)
  }

  function setEqualizerEnabled(enabled: boolean): void {
    audioAdapter.setEqualizerEnabled(enabled)
  }

  async function toggleMute(): Promise<void> {
    const actualMuted = await audioAdapter.toggleMute()
    muted.value = typeof actualMuted === 'boolean' ? actualMuted : !muted.value
  }

  function finishSleepTimer(): void {
    clearSleepTimerHandles()
    sleepTimerDeadline.value = null
    setStorage('sleep-timer-deadline', null)
    stopPlayback()
    playing.value = false
    status.value = 'paused'
    showToast('睡眠定时结束，已暂停播放', { type: 'success', dedupeKey: 'sleep-timer-end' })
  }

  function setSleepTimer(minutes: number): void {
    const safeMinutes = Math.max(1, Math.floor(minutes))
    clearSleepTimerHandles()
    sleepTimerDeadline.value = Date.now() + safeMinutes * 60 * 1000
    setStorage('sleep-timer-deadline', sleepTimerDeadline.value)
    showToast(`睡眠定时已开启：${safeMinutes} 分钟`, { type: 'info', dedupeKey: 'sleep-timer-start' })

    sleepTimerTimeoutId.value = window.setTimeout(() => {
      if (sleepTimerDeadline.value) finishSleepTimer()
    }, safeMinutes * 60 * 1000)
  }

  function clearSleepTimer(): void {
    clearSleepTimerHandles()
    sleepTimerDeadline.value = null
    setStorage('sleep-timer-deadline', null)
    showToast('睡眠定时已取消', { type: 'info', dedupeKey: 'sleep-timer-cancel' })
  }

  function seek(time: number): void {
    audioAdapter.seek(time)
  }

  /**
   * 以新音质重新加载当前歌曲（切换音质时调用）
   * 保留当前播放进度，绕过缓存重新获取音频 URL
   */
  async function reloadCurrentSongAudio(): Promise<void> {
    const song = currentSong.value
    if (!song) return

    const savedPosition = currentTime.value
    const wasPlaying = playing.value || status.value === 'loading'

    try {
      status.value = 'loading'
      // 重置实际音质，重新解析
      actualQuality.value = null
      // useCache=false 绕过缓存，强制用新音质重新获取 URL
      const url = await playerCache.getAudioSource(song.id, false)
      if (!url) {
        logger.warn('player', `切换音质后无可用音源: ${song.name}`)
        showToast('当前歌曲不支持该音质', { type: 'warning', dedupeKey: 'quality-unsupported' })
        status.value = wasPlaying ? 'playing' : 'paused'
        return
      }

      await audioAdapter.play(url, song.id, !!song._streaming)
      activeBlobUrl.value = url.startsWith('blob:') ? url : null

      // 等待音频引擎就绪后恢复播放进度
      setTimeout(() => {
        if (savedPosition > 0) {
          audioAdapter.seek(savedPosition)
        }
        if (!wasPlaying) {
          audioAdapter.pause()
        }
      }, 500)
    } catch (e) {
      logger.error('player', '切换音质重载失败:', e)
      showToast('切换音质失败', { type: 'error' })
    }
  }

  async function handlePlayEnd(): Promise<void> {
    if (sleepTimerDeadline.value && Date.now() >= sleepTimerDeadline.value) {
      clearSleepTimerHandles()
      sleepTimerDeadline.value = null
      setStorage('sleep-timer-deadline', null)
      showToast('播放已因睡眠定时暂停', { type: 'info', dedupeKey: 'sleep-timer' })
      stopPlayback()
      playing.value = false
      status.value = 'paused'
      return
    }
    await playNext()
  }

  function generateShuffledList(): void {
    shuffledList.value = buildShuffledList(playlist.value)
  }

  // ==================== 恢复播放 ====================
  async function restorePlayback(): Promise<void> {
    if (playlist.value.length === 0 || currentIndex.value < 0) return

    const song = playlist.value[currentIndex.value]
    if (!song) return

    const savedProgress = playbackProgress.getSavedPlaybackProgress(song.id)

    try {
      status.value = 'loading'
      // 代际守卫：恢复期间用户若手动点了歌，丢弃本次慢响应避免覆盖用户选择
      const seq = ++playSequence
      const url = await playerCache.getAudioSource(song.id, true)
      if (seq !== playSequence) return
      if (!url) {
        logger.warn('player', 'Failed to restore playback: no source')
        return
      }

      await audioAdapter.play(url, song.id)
      updateCurrentSongCache(song)
      mediaSessionHelper.updateMediaSession(song)

      // 等待音频加载后恢复播放位置并暂停
      setTimeout(() => {
        if (savedProgress > 0) {
          audioAdapter.seek(savedProgress)
        }
        audioAdapter.pause()
      }, 500)

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
      logger.error('player', 'Failed to restore playback:', e)
    }
  }

  // ==================== 停止/销毁 ====================
  function stopPlayback(): void {
    audioAdapter.stop()
  }

  function setCurrentTime(time: number): void {
    currentTime.value = time
  }

  function setDuration(dur: number): void {
    duration.value = dur
  }

  // ==================== 私人 FM ====================
  async function enablePersonalFM(track: Song, nextTrack?: Song): Promise<void> {
    isPersonalFM.value = true
    personalFMTrack.value = track
    personalFMNextTrack.value = nextTrack ?? null
    await playSong(track)
  }

  /** 启动私人 FM：传入歌曲列表和起始索引，自动维护播放队列 */
  async function startPersonalFM(tracks: Song[], startIndex = 0): Promise<void> {
    if (tracks.length === 0) return
    isPersonalFM.value = true
    const startTrack = tracks[startIndex]!
    personalFMTrack.value = startTrack
    // 队列 = 起始位置之后的所有歌曲
    personalFMQueue.value = tracks.slice(startIndex + 1)
    personalFMNextTrack.value = personalFMQueue.value[0] ?? null
    await playSong(startTrack)
  }

  /** 向私人 FM 队列追加歌曲（用于无限滚动） */
  function addToPersonalFMQueue(tracks: Song[]): void {
    personalFMQueue.value.push(...tracks)
    if (!personalFMNextTrack.value && personalFMQueue.value.length > 0) {
      personalFMNextTrack.value = personalFMQueue.value[0]
    }
  }

  function disablePersonalFM(): void {
    isPersonalFM.value = false
    personalFMTrack.value = null
    personalFMNextTrack.value = null
    personalFMQueue.value = []
  }

  async function playPersonalFMNext(): Promise<void> {
    if (personalFMQueue.value.length > 0) {
      const nextTrack = personalFMQueue.value.shift()!
      personalFMTrack.value = nextTrack
      personalFMNextTrack.value = personalFMQueue.value[0] ?? null
      await playSong(nextTrack)
    } else if (personalFMNextTrack.value) {
      // 兼容旧的单 nextTrack 模式
      personalFMTrack.value = personalFMNextTrack.value
      personalFMNextTrack.value = null
      await playSong(personalFMTrack.value)
    }
  }

  /** 私人 FM：不感兴趣（垃圾桶），调用 API 后自动跳下一首 */
  async function trashCurrentFMTrack(): Promise<void> {
    if (!isPersonalFM.value || !currentSong.value) return
    const songId = currentSong.value.id
    // 异步调用垃圾桶 API，不阻塞切歌
    fmTrash(songId).catch((e) => logger.warn('player', `FM trash failed for song ${songId}`, e))
    // 从队列中移除当前歌曲（如果还在）
    personalFMQueue.value = personalFMQueue.value.filter((s) => s.id !== songId)
    await playPersonalFMNext()
  }

  function destroy(): void {
    clearSleepTimerHandles()
    if (endDetectTimer !== null) {
      clearTimeout(endDetectTimer)
      endDetectTimer = null
    }
    playerCache.releaseAllBlobUrls()
    // 清理音频事件监听器
    audioTimeUpdateCleanup?.()
    audioStateChangeCleanup?.()
    audioEndedCleanup?.()
    audioErrorCleanup?.()
    audioBufferedCleanup?.()
    // 清理歌词行监听器
    lyricsLinesWatcher?.()
  }

  // Watch playing state and send to main process for Touch Bar
  watch(playing, (isPlaying) => {
    if (window.electronAPI?.sendIpcEvent) {
      window.electronAPI.sendIpcEvent('player:updatePlayState', isPlaying)
    }
  })

  return {
    playlist, currentIndex, playing, playMode, currentTime, duration,
    volume, muted, shuffledList, playNextList, isPersonalFM,
    personalFMTrack, personalFMNextTrack, personalFMQueue, status, currentSongCache,
    sleepTimerDeadline, playHistory, playNavStack, currentSong, progress, bufferedProgress,
    frequencyData, actualQuality,
    setPlaylist, addToPlaylist, playSong, removeFromPlaylist, clearPlaylist,
    reorderPlaylist, removeDuplicates,
    addToPlayNext, insertNext, removeQueueItem, playNext, playPrev, togglePlaying, togglePlayMode,
    setVolume, setPlaybackSpeed, toggleMute, syncAudioEngineState, seek, setCurrentTime, setDuration,
    setEqualizerBand, setEqualizerBands, setEqualizerEnabled,
    setSleepTimer, clearSleepTimer, clearPlayHistory, removeHistoryBySongId, loadPersistentState,
    enablePersonalFM, startPersonalFM, addToPersonalFMQueue, trashCurrentFMTrack, disablePersonalFM, restorePlayback, reloadCurrentSongAudio, destroy,
  }
}, {
  persist: {
    // 节流存储：播放期间瞬态字段高频变化会触发全量序列化+写盘，去重+500ms 合并写入
    storage: throttledPersistStorage,
    pick: ['playMode', 'volume', 'muted', 'playlist', 'currentIndex'],
    afterHydrate: (ctx) => {
      try {
        const state = ctx.store.$state as Record<string, unknown>
        const merged = migrateWithDefaults(playerDefaults, {
          playMode: state.playMode,
          volume: state.volume,
          muted: state.muted,
          playlist: state.playlist,
          currentIndex: state.currentIndex,
        })
        Object.assign(ctx.store.$state, merged)

        const playlist = state.playlist as Song[] | undefined
        if (Array.isArray(playlist)) {
          const validPlaylist = playlist.filter(s =>
            s && typeof s.id === 'number' && s.name && s.artists && s.album
          )
          if (validPlaylist.length !== playlist.length) {
            logger.warn('player', `Migration: filtered ${playlist.length - validPlaylist.length} invalid songs`)
            ctx.store.$state.playlist = validPlaylist
          }
        }

        // shuffledList 为派生数据不持久化，重启恢复后需按恢复的随机模式重建，
        // 否则随机模式下 playNext/playPrev 在空列表上静默失效（表现为播完不自动切歌）
        if (state.playMode === 'random' && Array.isArray(state.playlist) && state.playlist.length > 0) {
          ctx.store.$state.shuffledList = buildShuffledList(state.playlist as Song[])
        }
      } catch {
        // 迁移失败时保持当前值
      }
    }
  }
})
