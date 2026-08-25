import { usePlayerStore } from '@/stores/player'

/**
 * 音频控制 composable
 * 注意：实际音频播放由 playerStore 内部的 AudioEngine (Howler.js) 负责。
 * 此 composable 仅提供 seek 等辅助功能，避免双重音频引擎冲突。
 */
export function useAudio() {
  const playerStore = usePlayerStore()

  function seek(time: number) {
    playerStore.seek(time)
  }

  function seekByProgress(progress: number) {
    if (playerStore.duration > 0) {
      playerStore.seek(progress * playerStore.duration)
    }
  }

  return { seek, seekByProgress }
}
