import { ref, watch, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { getSongUrl } from '@/api/song'

// Singleton audio instance - prevents multiple audio elements from competing
let singletonAudio: HTMLAudioElement | null = null

function getAudioInstance(): HTMLAudioElement {
  if (!singletonAudio) {
    singletonAudio = new Audio()
    // Preload strategy for smoother playback
    singletonAudio.preload = 'auto'
  }
  return singletonAudio
}

export function useAudio() {
  const playerStore = usePlayerStore()
  const audio = getAudioInstance()
  const loading = ref(false)

  audio.volume = playerStore.volume

  // Sync volume
  watch(
    () => playerStore.volume,
    (v) => {
      audio.volume = v
    }
  )

  // Time update
  const onTimeUpdate = () => {
    playerStore.setCurrentTime(audio.currentTime)
  }

  // Duration
  const onLoadedMetadata = () => {
    playerStore.setDuration(audio.duration)
  }

  // Ended
  const onEnded = () => {
    if (playerStore.playMode === 'loop') {
      audio.currentTime = 0
      audio.play().catch(() => {
        playerStore.playing = false
      })
    } else {
      playerStore.playNext()
    }
  }

  // Error
  const onError = () => {
    console.error('Audio playback error')
    playerStore.togglePlaying()
  }

  // Register listeners (idempotent - safe to call multiple times)
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadedmetadata', onLoadedMetadata)
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('error', onError)

  // Watch current song changes
  watch(
    () => playerStore.currentSong,
    async (song) => {
      if (!song) return
      await loadAndPlay(song.id)
    }
  )

  // Watch playing state
  watch(
    () => playerStore.playing,
    (isPlaying) => {
      if (isPlaying) {
        audio.play().catch(() => {
          playerStore.playing = false
        })
      } else {
        audio.pause()
      }
    }
  )

  async function loadAndPlay(songId: number) {
    loading.value = true
    try {
      const res: any = await getSongUrl(songId, 'exhigh')
      const url = res?.data?.[0]?.url
      if (!url) {
        console.error('No playback URL available')
        playerStore.playing = false
        return
      }
      audio.src = url
      audio.load()
      if (playerStore.playing) {
        audio.play().catch(() => {
          playerStore.playing = false
        })
      }
    } catch (e) {
      console.error('Failed to load song:', e)
      playerStore.playing = false
    } finally {
      loading.value = false
    }
  }

  function seek(time: number) {
    audio.currentTime = time
  }

  function seekByProgress(progress: number) {
    if (playerStore.duration > 0) {
      audio.currentTime = progress * playerStore.duration
    }
  }

  onUnmounted(() => {
    // Only pause and clean up - don't destroy the singleton
    audio.pause()
    // Remove event listeners to prevent memory leaks when component unmounts
    audio.removeEventListener('timeupdate', onTimeUpdate)
    audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    audio.removeEventListener('ended', onEnded)
    audio.removeEventListener('error', onError)
  })

  return { loading, seek, seekByProgress }
}
