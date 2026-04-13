import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AudioEngine, type PlayMode, type PlayerStatus } from '../utils/player'

export interface Song {
  id: number
  name: string
  artists: { id: number; name: string }[]
  album: { id: number; name: string; picUrl: string }
  duration: number
  url?: string
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
   * 播放指定歌曲
   */
  async function playSong(song: Song): Promise<void> {
    initAudioEngine()

    if (!song.url) {
      console.warn('Song URL is missing:', song.id)
      return
    }

    try {
      await audioEngine!.play(song.url)
      updateCurrentSongCache(song)

      // 发送 IPC 事件到主进程（Electron 环境）
      if (window.electronAPI?.sendIpcEvent) {
        window.electronAPI.sendIpcEvent('player:updateTrack', {
          title: song.name,
          artist: song.artists.map(a => a.name).join(', '),
          album: song.album.name,
          cover: song.album.picUrl,
          duration: song.duration
        })
      }
    } catch (error) {
      console.error('Failed to play song:', error)
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

  /**
   * 停止播放
   */
  function stopPlayback(): void {
    if (audioEngine) {
      audioEngine.stop()
    }
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
    enablePersonalFM,
    disablePersonalFM,
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
