import { scrobble } from '@/api/record'
import type { Ref } from 'vue'

/**
 * Scrobble（听歌打卡）composable
 * 负责：提交"正在播放"通知、检查并提交 Scrobble
 */
export function useScrobble(deps: {
  currentSong: Ref<any>
  currentTime: Ref<number>
  duration: Ref<number>
}) {
  let scrobbleSubmitted = false
  let scrobblePlayedTime = 0
  let lastAccumulateTimestamp = 0

  /**
   * 重置 scrobble 追踪状态（切歌时调用）
   */
  function resetScrobbleState(): void {
    scrobbleSubmitted = false
    scrobblePlayedTime = 0
    lastAccumulateTimestamp = 0
  }

  /**
   * 累加已播放时间（进度回调时调用）
   * 使用实际时间戳差值，避免 rAF 间隔不固定导致的统计偏差
   */
  function accumulatePlayedTime(): void {
    const now = Date.now()
    if (lastAccumulateTimestamp > 0) {
      const delta = now - lastAccumulateTimestamp
      // 异常值保护：间隔超过 10 秒（如标签页切后台）不计入
      if (delta > 0 && delta <= 10000) {
        scrobblePlayedTime += delta / 1000
      }
    }
    lastAccumulateTimestamp = now
  }

  /**
   * 提交"正在播放"通知
   */
  function submitScrobbleNowPlaying(song: { id: number }): void {
    scrobble(song.id, 0, 0).catch(() => {})
  }

  /**
   * 检查并提交 Scrobble（当播放进度达到 50% 或超过 4 分钟时提交）
   */
  function checkAndSubmitScrobble(): void {
    if (scrobbleSubmitted || !deps.currentSong.value) return

    const song = deps.currentSong.value
    const durationSec = deps.duration.value
    if (durationSec <= 0) return

    const progressRatio = deps.currentTime.value / durationSec
    if (progressRatio >= 0.5 || scrobblePlayedTime >= 240) {
      scrobbleSubmitted = true
      scrobble(song.id, 0, Math.floor(deps.currentTime.value)).catch(() => {})
    }
  }

  return {
    resetScrobbleState,
    accumulatePlayedTime,
    submitScrobbleNowPlaying,
    checkAndSubmitScrobble,
  }
}
