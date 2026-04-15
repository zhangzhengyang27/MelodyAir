import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AudioEngine, type PlayMode, type PlayerStatus } from '../utils/player'
import { showToast } from '../composables/useToast'
import { playerDefaults, migrateWithDefaults } from './defaults'
import { usePlayerCache } from '../composables/usePlayerCache'
import { useScrobble } from '../composables/useScrobble'
import { useMediaSession } from '../composables/useMediaSession'
import { usePlaybackProgress } from '../composables/usePlaybackProgress'

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

  // ==================== 音频引擎 ====================
  function initAudioEngine(): void {
    if (!audioEngine) {
      audioEngine = new AudioEngine({
        volume: volume.value,
        fadeDuration: 200,
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
        },
        onError: (error: Error) => {
          console.error('Player error:', error)
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

      const url = await playerCache.getAudioSource(song.id, true, song._localTrackId)
      if (!url) {
        console.warn(`[player] No playable source for "${song.name}" (id=${song.id})`)
        status.value = 'error'
        playing.value = false
        showToast(`无法播放「${song.name}」`, { type: 'warning', dedupeKey: 'player-unplayable' })
        setTimeout(() => playNext(), 500)
        return
      }

      console.log(`[player] 开始播放: "${song.name}", url=${url.slice(0, 100)}...`)
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
      }

      // 预缓存下一首
      playerCache.preloadNextTrack({
        playNextList, isPersonalFM, personalFMNextTrack, playlist, currentIndex,
      })
    } catch (error) {
      console.error(`[player] Failed to play "${song.name}":`, error)
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

  function addToPlayNext(song: Song): void {
    if (!playNextList.value.find((s) => s.id === song.id)) {
      playNextList.value.push(song)
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

  function toggleMute(): void {
    initAudioEngine()
    if (audioEngine) muted.value = audioEngine.toggleMute()
  }

  function seek(time: number): void {
    if (audioEngine) audioEngine.seek(time)
  }

  async function handlePlayEnd(): Promise<void> {
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
        console.warn('[player] Failed to restore playback: no source')
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
    } catch (e) {
      console.error('[player] Failed to restore playback:', e)
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
    playerCache.releaseAllBlobUrls()
    if (audioEngine) {
      audioEngine.destroy()
      audioEngine = null
    }
  }

  return {
    playlist, currentIndex, playing, playMode, currentTime, duration,
    volume, muted, shuffledList, playNextList, isPersonalFM,
    personalFMTrack, personalFMNextTrack, status, currentSongCache,
    currentSong, progress,
    setPlaylist, addToPlaylist, playSong, removeFromPlaylist, clearPlaylist,
    addToPlayNext, playNext, playPrev, togglePlaying, togglePlayMode,
    setVolume, toggleMute, seek, setCurrentTime, setDuration,
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
            console.warn(`[player] Migration: filtered ${playlist.length - validPlaylist.length} invalid songs`)
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
