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
import { useSettingsStore } from '@/stores/settings'

// 频率数据数组长度（AnalyserNode fftSize / 2）
const FREQUENCY_BIN_COUNT = 128

/**
 * Web 环境将音源 URL 改写为后端 /proxy/audio 代理地址。
 * 音源 CDN 响应不带 CORS 头，Web Audio 的 fetch 拉流会被浏览器拦截；
 * 后端代理（AI-node /proxy/audio）会按白名单反射 Origin（本机源默认放行）
 * 并支持 Range 断点，使 Web 模式保留 Web Audio 的均衡器/可视化能力。
 * 仅改写网易云 CDN（*.music.126.net，与后端默认代理白名单一致），
 * 其余远程 URL 无法确保后端放行，交由调用方降级 HTML5 直连。
 */
function toProxiedUrl(url: string): string {
  try {
    const target = new URL(url)
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return url
    if (!target.hostname.endsWith('.music.126.net')) return url
    const apiBase = useSettingsStore().apiBase.replace(/\/+$/, '')
    return `${apiBase}/proxy/audio?url=${encodeURIComponent(url)}`
  } catch {
    return url
  }
}

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

  /**
   * 播放音频
   * @param url 音频 URL
   * @param songId 歌曲 ID
   * @param html5 是否使用 HTML5 Audio 模式（流式播放，适合长音频如播客）
   */
  async play(url: string, songId: string | number, html5 = false): Promise<void> {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioPlay(url, songId, html5)
    } else if (this.localEngine) {
      const isRemote = !url.startsWith('blob:') && !url.startsWith('data:')
      if (isRemote && html5) {
        // 长音频（播客）走 HTML5 流式：audio 标签拉流不受 CORS 限制，直连 CDN 即可
        await this.localEngine.play(url, { html5: true })
      } else if (isRemote) {
        // 音源经后端代理补 CORS 后保留 Web Audio 模式（均衡器/可视化可用）；
        // 非白名单音源无法代理，降级 HTML5 直连（audio 标签不受 CORS 限制）
        const proxied = toProxiedUrl(url)
        if (proxied !== url) {
          await this.localEngine.play(proxied, { html5: false })
        } else {
          logger.info('audio-adapter', 'Web 环境：非白名单音源，降级为 HTML5 Audio 模式（规避 CORS）')
          await this.localEngine.play(url, { html5: true })
        }
      } else {
        // blob:/data: 本地数据同源，直接 Web Audio
        await this.localEngine.play(url, { html5 })
      }
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

  // 注意：不提供 getVolume/getPlaybackRate/getCurrentTime/getDuration/isPlaying 等读取方法。
  // Electron 下引擎运行在隐藏窗口，preload 未暴露对应查询 API（单向 send 拿不到返回值），
  // 这类方法只会返回误导性的假默认值；播放状态统一由 timeUpdate/stateChange 等事件驱动。

  toggleMute(): boolean | undefined {
    if (this.isElectron) {
      // IPC 为单向 send（fire-and-forget），拿不到引擎切换后的状态，
      // 返回 undefined 让上层走乐观翻转；兜底成 false 会把静音状态永远压回未静音
      return (window as any).electronAPI.audioToggleMute?.()
    }
    return this.localEngine?.toggleMute()
  }

  setPlaybackRate(rate: number): void {
    if (this.isElectron) {
      ;(window as any).electronAPI.audioSetPlaybackRate(rate)
    } else {
      this.localEngine?.setPlaybackRate(rate)
    }
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
