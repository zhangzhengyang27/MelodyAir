/**
 * 统一音频适配器
 * - Electron 环境：通过 IPC 调用隐藏窗口的音频引擎
 * - 浏览器环境：使用本地 AudioEngine 实例（降级方案）
 *
 * 提供统一的播放控制接口和事件监听，上层代码无需关心底层实现
 */
import { AudioEngine } from './player'
import type { PlayerStatus } from './player'
import { logger } from './logger'

// 频率数据数组长度（AnalyserNode fftSize / 2）
const FREQUENCY_BIN_COUNT = 128

class AudioAdapter {
  private isElectron: boolean
  private localEngine: AudioEngine | null = null
  private frequencyData: Uint8Array = new Uint8Array(FREQUENCY_BIN_COUNT)
  private frequencyIntervalId: ReturnType<typeof setInterval> | null = null
  private frequencyCallbacks: Array<(data: Uint8Array) => void> = []

  constructor() {
    this.isElectron = !!(window as any).electronAPI
    logger.info('audio-adapter', `Environment: ${this.isElectron ? 'Electron (IPC)' : 'Browser (local AudioEngine)'}`)

    if (!this.isElectron) {
      this.initLocalEngine()
    }
  }

  /**
   * 初始化本地音频引擎（浏览器降级方案）
   */
  private initLocalEngine(): void {
    this.localEngine = new AudioEngine({
      volume: 0.8,
      onEnd: () => {
        this.emit('ended', {})
      },
      onPlayStateChange: (status: PlayerStatus) => {
        this.emit('stateChange', { status })
      },
      onProgress: (currentTime: number, duration: number) => {
        this.emit('timeUpdate', { currentTime, duration })
      },
      onBuffered: (progress: number) => {
        this.emit('buffered', { progress })
      },
      onError: (error: Error) => {
        this.emit('error', { message: error.message })
      },
    })

    // 启动频率数据采集（浏览器环境）
    this.startFrequencyCollection()
  }

  /**
   * 启动频率数据采集（浏览器环境，从 AudioEngine 获取）
   * 使用 setInterval 而不是 requestAnimationFrame，更稳定可靠
   */
  private startFrequencyCollection(): void {
    if (this.frequencyIntervalId !== null) return

    this.frequencyIntervalId = setInterval(() => {
      if (this.localEngine) {
        // 直接从 AudioEngine 获取频率数据（已连接 AnalyserNode）
        this.frequencyData = this.localEngine.getFrequencyData()
        this.emitFrequencyData()
      }
    }, 50) // 20fps，足够流畅且性能好
  }

  /**
   * 停止频率数据采集
   */
  private stopFrequencyCollection(): void {
    if (this.frequencyIntervalId !== null) {
      clearInterval(this.frequencyIntervalId)
      this.frequencyIntervalId = null
    }
  }

  // ==================== 播放控制 ====================

  async play(url: string, songId: string | number): Promise<void> {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioPlay(url, songId)
    } else if (this.localEngine) {
      await this.localEngine.play(url)
    }
  }

  pause(): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioPause()
    } else {
      this.localEngine?.pause()
    }
  }

  resume(): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioResume()
    } else {
      this.localEngine?.resume()
    }
  }

  toggle(): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioToggle()
    } else {
      // AudioEngine 没有 toggle 方法，需要手动判断
      if (this.localEngine?.isPlaying()) {
        this.localEngine.pause()
      } else {
        this.localEngine?.resume()
      }
    }
  }

  seek(time: number): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioSeek(time)
    } else {
      this.localEngine?.seek(time)
    }
  }

  setVolume(volume: number): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioSetVolume(volume)
    } else {
      this.localEngine?.setVolume(volume)
    }
  }

  getVolume(): number {
    if (this.isElectron) {
      return (window as any).electronAPI.audioGetVolume?.() ?? 0.8
    }
    return this.localEngine?.getVolume() ?? 0.8
  }

  toggleMute(): boolean {
    if (this.isElectron) {
      return (window as any).electronAPI.audioToggleMute?.() ?? false
    }
    return this.localEngine?.toggleMute() ?? false
  }

  setPlaybackRate(rate: number): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioSetPlaybackRate(rate)
    } else {
      this.localEngine?.setPlaybackRate(rate)
    }
  }

  getPlaybackRate(): number {
    if (this.isElectron) {
      return (window as any).electronAPI.audioGetPlaybackRate?.() ?? 1
    }
    return this.localEngine?.getPlaybackRate() ?? 1
  }

  setEqualizerBand(bandIndex: number, gain: number): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioSetEqualizerBand(bandIndex, gain)
    } else {
      this.localEngine?.setEqualizerBand(bandIndex, gain)
    }
  }

  setEqualizerBands(gains: number[]): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioSetEqualizerBands(gains)
    } else {
      this.localEngine?.setEqualizerBands(gains)
    }
  }

  setEqualizerEnabled(enabled: boolean): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioSetEqualizerEnabled(enabled)
    } else {
      this.localEngine?.setEqualizerEnabled(enabled)
    }
  }

  getCurrentTime(): number {
    if (this.isElectron) {
      return (window as any).electronAPI.audioGetCurrentTime?.() ?? 0
    }
    return this.localEngine?.getCurrentTime() ?? 0
  }

  getDuration(): number {
    if (this.isElectron) {
      return (window as any).electronAPI.audioGetDuration?.() ?? 0
    }
    return this.localEngine?.getDuration() ?? 0
  }

  isPlaying(): boolean {
    if (this.isElectron) {
      return (window as any).electronAPI.audioIsPlaying?.() ?? false
    }
    return this.localEngine?.isPlaying() ?? false
  }

  stop(): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioStop()
    } else {
      this.localEngine?.stop()
    }
  }

  // ==================== 事件监听 ====================

  private eventCallbacks: Record<string, Array<(data: any) => void>> = {
    timeUpdate: [],
    stateChange: [],
    ended: [],
    error: [],
    buffered: [],
    frequencyData: [],
  }

  private ipcCleanups: Array<() => void> = []

  /**
   * 初始化 IPC 事件监听（Electron 环境）
   */
  initIpcListeners(): void {
    if (!this.isElectron) return

    const api = (window as any).electronAPI

    if (api.onAudioTimeUpdate) {
      this.ipcCleanups.push(api.onAudioTimeUpdate((data: any) => this.emit('timeUpdate', data)))
    }
    if (api.onAudioStateChange) {
      this.ipcCleanups.push(api.onAudioStateChange((data: any) => this.emit('stateChange', data)))
    }
    if (api.onAudioEnded) {
      this.ipcCleanups.push(api.onAudioEnded(() => this.emit('ended', {})))
    }
    if (api.onAudioError) {
      this.ipcCleanups.push(api.onAudioError((data: any) => this.emit('error', data)))
    }
    if (api.onAudioBuffered) {
      this.ipcCleanups.push(api.onAudioBuffered((data: any) => this.emit('buffered', data)))
    }
    if (api.onAudioFrequencyData) {
      this.ipcCleanups.push(api.onAudioFrequencyData((data: any) => {
        this.frequencyData = new Uint8Array(data.frequencyData)
        this.emitFrequencyData()
      }))
    }
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = []
    }
    this.eventCallbacks[event].push(callback)
    return () => {
      const idx = this.eventCallbacks[event]?.indexOf(callback)
      if (idx !== undefined && idx >= 0) {
        this.eventCallbacks[event].splice(idx, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    this.eventCallbacks[event]?.forEach((cb) => {
      try {
        cb(data)
      } catch (e) {
        logger.error('audio-adapter', `Event callback error (${event}):`, e)
      }
    })
  }

  private emitFrequencyData(): void {
    this.eventCallbacks.frequencyData?.forEach((cb) => {
      try {
        cb(this.frequencyData)
      } catch (e) {
        // 静默失败
      }
    })
  }

  /**
   * 获取当前频率数据（同步）
   */
  getFrequencyData(): Uint8Array {
    return this.frequencyData
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopFrequencyCollection()
    this.ipcCleanups.forEach((cleanup) => cleanup())
    this.ipcCleanups = []
    if (this.localEngine) {
      this.localEngine.stop()
      this.localEngine = null
    }
  }
}

// 单例
let audioAdapterInstance: AudioAdapter | null = null

export function getAudioAdapter(): AudioAdapter {
  if (!audioAdapterInstance) {
    audioAdapterInstance = new AudioAdapter()
    audioAdapterInstance.initIpcListeners()
  }
  return audioAdapterInstance
}

export { AudioAdapter }
