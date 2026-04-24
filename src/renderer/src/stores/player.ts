import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { AudioEngine, type PlayMode, type PlayerStatus } from '../utils/player'
import { showToast } from '../composables/useToast'
import { logger } from '../utils/logger'
import { playerDefaults, migrateWithDefaults } from './defaults'
import { usePlayerCache } from '../composables/usePlayerCache'
import { useScrobble } from '../composables/useScrobble'
import { useMediaSession } from '../composables/useMediaSession'
import { usePlaybackProgress } from '../composables/usePlaybackProgress'
import { useDesktopNotification } from '../composables/useDesktopNotification'
import { getStorage, setStorage } from '../utils/storage'
import { useSettingsStore } from './settings'
import { useLyricsStore } from './lyrics'
import { useUserStore } from './user'

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
  shuffledList: Song[]
  playNextList: Song[]
  isPersonalFM: boolean
  personalFMTrack: Song | null
  personalFMNextTrack: Song | null
  status: PlayerStatus
  currentSongCache: Song | null
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
  const volume = ref(0.8)
  const muted = ref(false)
  const shuffledList = ref<Song[]>([])
  const playNextList = ref<Song[]>([])
  const isPersonalFM = ref(false)
  const personalFMTrack = ref<Song | null>(null)
  const personalFMNextTrack = ref<Song | null>(null)
  const status = ref<PlayerStatus>('paused')
  const currentSongCache = ref<Song | null>(null)
  const sleepTimerDeadline = ref<number | null>(null)
  const sleepTimerTimeoutId = ref<number | null>(null)
  const sleepTimerTickId = ref<number | null>(null)
  const playHistory = ref<Array<{ song: Song; playedAt: number; playCount: number }>>([])

  // 音频引擎实例
  let audioEngine: AudioEngine | null = null

  // Blob URL 内存管理
  const createdBlobUrls: string[] = []
  const activeBlobUrl = ref<string | null>(null)

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
  const playerCache = usePlayerCache({ createdBlobUrls, activeBlobUrl })

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
  const desktopNotification = useDesktopNotification()

  // 通知节流：避免快速切歌时刷屏
  let lastNotificationTime = 0
  const NOTIFICATION_THROTTLE_MS = 2000 // 2秒内最多一次通知

  // ==================== 音频引擎 ====================
  function initAudioEngine(): void {
    if (!audioEngine) {
      audioEngine = new AudioEngine({
        volume: volume.value,
        fadeDuration: 200,
        playbackRate: settingsStore.playbackSpeed,
        autoNext: true,
        onEnd: () => handlePlayEnd(),
        onPlayStateChange: (newStatus: PlayerStatus) => {
          status.value = newStatus
          playing.value = newStatus === 'playing'
        },
        onProgress: (time: number, dur: number) => {
          currentTime.value = time
          duration.value = dur
          playbackProgress.savePlaybackProgress()
          scrobbleHelper.accumulatePlayedTime()
          scrobbleHelper.checkAndSubmitScrobble()
          mediaSessionHelper.updateMediaSessionPlaybackState()

          // Send progress and lyrics to Touch Bar
          if (window.electronAPI?.sendIpcEvent) {
            window.electronAPI.sendIpcEvent('player:updateProgress', time)

            const lyricsStore = useLyricsStore()
            window.electronAPI.sendIpcEvent('player:updateLyrics', {
              currentText: lyricsStore.currentLine?.text || '',
              hasLyrics: lyricsStore.hasLyrics
            })
          }
        },
        onError: (error: Error) => {
          logger.error('player', 'Player error:', error)
          status.value = 'error'
          playing.value = false
        }
      })
    }
  }

  // ==================== 核心播放逻辑 ====================
  async function playSong(song: Song): Promise<void> {
    initAudioEngine()

    // 切歌时释放旧 Blob URL
    playerCache.releaseStaleBlobUrls()
    // 重置 scrobble 追踪
    scrobbleHelper.resetScrobbleState()

    try {
      status.value = 'loading'
      markPlayHistory(song)

      const url = await playerCache.getAudioSource(song.id, true, song._localTrackId)
      if (!url) {
        logger.warn('player', `No playable source for "${song.name}" (id=${song.id})`)
        status.value = 'error'
        playing.value = false
        showToast(`无法播放「${song.name}」`, { type: 'warning', dedupeKey: 'player-unplayable' })
        setTimeout(() => playNext(), 500)
        return
      }

      logger.info('player', `开始播放: "${song.name}", url=${url.slice(0, 100)}...`)
      await audioEngine!.play(url)
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

      // 桌面通知（带节流）
      const now = Date.now()
      if (now - lastNotificationTime >= NOTIFICATION_THROTTLE_MS) {
        lastNotificationTime = now
        void desktopNotification.notify({
          title: '正在播放',
          body: `${song.name} - ${song.artists.map(a => a.name).join(', ')}`,
          tag: `track-${song.id}`,
          icon: song.album.picUrl,
        })
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
      setTimeout(() => playNext(), 500)
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
      sleepTimerTickId.value = window.setInterval(syncSleepTimerState, 1000)
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

  function getPlayHistory() {
    return playHistory.value
  }

  function addToPlayNext(song: Song): void {
    if (!playNextList.value.find((s) => s.id === song.id)) {
      playNextList.value.push(song)
    }
  }

  function insertNext(song: Song): void {
    const existingIndex = playlist.value.findIndex((s) => s.id === song.id)
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
    if (playNextList.value.length > 0) {
      const nextSong = playNextList.value.shift()!
      addToPlaylist(nextSong)
      return
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
        currentIndex.value = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length
        if (currentSong.value) await playSong(currentSong.value)
        break
      case 'loop':
      case 'sequence':
      default:
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
        if (currentSong.value) await playSong(currentSong.value)
        break
    }
  }

  async function playPrev(): Promise<void> {
    if (isPersonalFM.value) return
    if (playlist.value.length === 0) return

    if (currentTime.value > 3) {
      seek(0)
      return
    }

    switch (playMode.value) {
      case 'random':
        if (shuffledList.value.length > 1) {
          let prevIndex: number
          do {
            prevIndex = Math.floor(Math.random() * shuffledList.value.length)
          } while (prevIndex === currentIndex.value && shuffledList.value.length > 1)
          const prevSong = shuffledList.value[prevIndex]
          const originalIndex = playlist.value.findIndex((s) => s.id === prevSong.id)
          if (originalIndex >= 0) {
            currentIndex.value = originalIndex
            await playSong(prevSong)
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
    initAudioEngine()
    if (!audioEngine || !currentSong.value) return
    if (playing.value) {
      audioEngine.pause()
    } else {
      audioEngine.resume()
    }
  }

  function togglePlayMode(): void {
    const modes: PlayMode[] = ['sequence', 'loop', 'loopOne', 'random', 'reversed']
    const idx = modes.indexOf(playMode.value)
    playMode.value = modes[(idx + 1) % modes.length]
    if (playMode.value === 'random') generateShuffledList()
  }

  function setVolume(v: number): void {
    volume.value = Math.max(0, Math.min(1, v))
    if (audioEngine) audioEngine.setVolume(volume.value)
  }

  function setPlaybackSpeed(rate: number): void {
    const safeRate = Math.max(0.5, Math.min(2, rate))
    settingsStore.playbackSpeed = safeRate
    if (audioEngine) audioEngine.setPlaybackRate(safeRate)
  }

  function setEqualizerBand(bandIndex: number, gain: number): void {
    initAudioEngine()
    if (audioEngine) audioEngine.setEqualizerBand(bandIndex, gain)
  }

  function setEqualizerBands(gains: number[]): void {
    initAudioEngine()
    if (audioEngine) audioEngine.setEqualizerBands(gains)
  }

  function setEqualizerEnabled(enabled: boolean): void {
    initAudioEngine()
    if (audioEngine) audioEngine.setEqualizerEnabled(enabled)
  }

  function toggleMute(): void {
    initAudioEngine()
    if (audioEngine) muted.value = audioEngine.toggleMute()
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

  function syncSleepTimerState(): void {
    if (!sleepTimerDeadline.value) return
    if (Date.now() >= sleepTimerDeadline.value) {
      finishSleepTimer()
    }
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

    sleepTimerTickId.value = window.setInterval(syncSleepTimerState, 1000)
  }

  function clearSleepTimer(): void {
    clearSleepTimerHandles()
    sleepTimerDeadline.value = null
    setStorage('sleep-timer-deadline', null)
    showToast('睡眠定时已取消', { type: 'info', dedupeKey: 'sleep-timer-cancel' })
  }

  function seek(time: number): void {
    if (audioEngine) audioEngine.seek(time)
  }

  async function handlePlayEnd(): Promise<void> {
    if (sleepTimerDeadline.value && Date.now() >= sleepTimerDeadline.value) {
      setSleepTimerDeadline(null)
      showToast('播放已因睡眠定时暂停', { type: 'info', dedupeKey: 'sleep-timer' })
      stopPlayback()
      return
    }
    await playNext()
  }

  function generateShuffledList(): void {
    shuffledList.value = [...playlist.value]
    for (let i = shuffledList.value.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledList.value[i], shuffledList.value[j]] = [shuffledList.value[j]!, shuffledList.value[i]!]
    }
  }

  // ==================== 恢复播放 ====================
  async function restorePlayback(): Promise<void> {
    if (playlist.value.length === 0 || currentIndex.value < 0) return

    const savedProgress = playbackProgress.getSavedPlaybackProgress()
    const song = playlist.value[currentIndex.value]
    if (!song) return

    try {
      initAudioEngine()
      status.value = 'loading'
      const url = await playerCache.getAudioSource(song.id, true, song._localTrackId)
      if (!url) {
        logger.warn('player', 'Failed to restore playback: no source')
        return
      }

      await audioEngine!.play(url)
      updateCurrentSongCache(song)
      mediaSessionHelper.updateMediaSession(song)

      if (savedProgress > 0) {
        setTimeout(() => {
          if (audioEngine && savedProgress < duration.value) {
            seek(savedProgress)
          }
        }, 500)
      }

      if (audioEngine) audioEngine.pause()

      if (window.electronAPI?.sendIpcEvent) {
        window.electronAPI.sendIpcEvent('player:updateTrack', {
          title: song.name,
          artist: song.artists.map(a => a.name).join(', '),
          album: song.album.name,
          cover: song.album.picUrl,
          duration: song.duration
        })
      }
      void desktopNotification.notify({
        title: '恢复播放',
        body: `${song.name} - ${song.artists.map(a => a.name).join(', ')}`,
        tag: `restore-${song.id}`,
        icon: song.album.picUrl,
      })
    } catch (e) {
      logger.error('player', 'Failed to restore playback:', e)
    }
  }

  // ==================== 停止/销毁 ====================
  function stopPlayback(): void {
    if (audioEngine) audioEngine.stop()
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

  function disablePersonalFM(): void {
    isPersonalFM.value = false
    personalFMTrack.value = null
    personalFMNextTrack.value = null
  }

  async function playPersonalFMNext(): Promise<void> {
    if (personalFMNextTrack.value) {
      personalFMTrack.value = personalFMNextTrack.value
      personalFMNextTrack.value = null
      await playSong(personalFMTrack.value)
    }
  }

  function destroy(): void {
    clearSleepTimerHandles()
    playerCache.releaseAllBlobUrls()
    if (audioEngine) {
      audioEngine.destroy()
      audioEngine = null
    }
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
    personalFMTrack, personalFMNextTrack, status, currentSongCache,
    sleepTimerDeadline, playHistory, currentSong, progress,
    setPlaylist, addToPlaylist, playSong, removeFromPlaylist, clearPlaylist,
    reorderPlaylist, removeDuplicates,
    addToPlayNext, insertNext, removeQueueItem, playNext, playPrev, togglePlaying, togglePlayMode,
    setVolume, setPlaybackSpeed, toggleMute, seek, setCurrentTime, setDuration,
    setEqualizerBand, setEqualizerBands, setEqualizerEnabled,
    setSleepTimer, clearSleepTimer, clearPlayHistory, removeHistoryBySongId, loadPersistentState,
    enablePersonalFM, disablePersonalFM, restorePlayback, destroy,
  }
}, {
  persist: {
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
      } catch {
        // 迁移失败时保持当前值
      }
    }
  }
})

declare global {
  interface Window {
    electronAPI?: {
      sendIpcEvent: (channel: string, data?: unknown) => void
      onIpcEvent: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}
