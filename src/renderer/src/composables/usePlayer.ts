import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useAudio } from './useAudio'
import { getSongDetail } from '@/api/song'
import type { Song } from '@/stores/player'

export function usePlayer() {
  const playerStore = usePlayerStore()
  const { seek, seekByProgress } = useAudio()

  const playModeIcon = computed(() => {
    const icons: Record<string, string> = { sequence: '🔀', loop: '🔁', random: '🎲' }
    return icons[playerStore.playMode]
  })

  const playModeLabel = computed(() => {
    const labels: Record<string, string> = { sequence: '顺序播放', loop: '单曲循环', random: '随机播放' }
    return labels[playerStore.playMode]
  })

  async function playSong(song: Song) {
    playerStore.addToPlaylist(song)
    // 注意：不需要设置 playing=true，因为 addToPlaylist 内部调用 playSong()
    // AudioEngine 的 onPlay 回调会自动将状态设为 'playing'
  }

  async function playSongList(songs: Song[], index = 0) {
    playerStore.setPlaylist(songs, index)
    // 同上：setPlaylist 内部已触发播放，回调自动管理 playing 状态
  }

  async function playSongById(id: number) {
    try {
      const res: any = await getSongDetail(id)
      const songData = res?.songs?.[0]
      if (songData) {
        const song: Song = {
          id: songData.id,
          name: songData.name,
          artists: songData.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
          album: {
            id: songData.al?.id || 0,
            name: songData.al?.name || '',
            picUrl: songData.al?.picUrl || ''
          },
          duration: songData.dt || 0
        }
        playSong(song)
      }
    } catch (e) {
      console.error('Failed to play song by id:', e)
    }
  }

  return {
    playModeIcon,
    playModeLabel,
    seek,
    seekByProgress,
    playSong,
    playSongList,
    playSongById
  }
}
