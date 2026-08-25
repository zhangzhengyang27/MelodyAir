import { Howl, Howler } from 'howler'
import { logger } from './logger'

export type PlayMode = 'sequence' | 'loop' | 'loopOne' | 'random' | 'reversed'
export type PlayerStatus = 'playing' | 'paused' | 'loading' | 'error'

export interface PlayerOptions {
  volume?: number
  fadeDuration?: number
  playbackRate?: number
  onEnd?: () => void
  onPlayStateChange?: (status: PlayerStatus) => void
  onProgress?: (currentTime: number, duration: number) => void
  onError?: (error: Error) => void
}

export interface EqualizerBand {
  frequency: number
  gain: number
  Q: number
}

/**
 * 基于 Howler.js 的音频引擎封装
 * 参考 YesPlayMusic Player.js 设计：
 * - 全局单例 Howl 实例（每次播放新歌时 unload 旧的再创建新的）
 * - HTML5 模式以支持流媒体
 * - 淡入淡出效果
 * - Web Audio API 均衡器支持
 */
export class AudioEngine {
  private _howl: Howl | null = null
  private _volume: number = 0.8
  private _volumeBeforeMuted: number = 0.8
  private _muted: boolean = false
  private _fadeDuration: number = 200
  private _playbackRate: number = 1
  private _isFadeIn: boolean = false
  private _isFadeOut: boolean = false
  /** 防止手动 stop() 时误触发 onend 回调 */
  private _isStopping: boolean = false

  // Web Audio API 均衡器
  private audioContext: AudioContext | null = null
  private equalizerFilters: BiquadFilterNode[] = []
  private equalizerEnabled: boolean = false

  // 回调函数
  private onEndCallback?: () => void
  private onPlayStateChangeCallback?: (status: PlayerStatus) => void
  private onProgressCallback?: (currentTime: number, duration: number) => void
  private onErrorCallback?: (error: Error) => void

  // 进度追踪（requestAnimationFrame）
  private rafId: number | null = null
  private lastProgressTime: number = 0
  private readonly PROGRESS_INTERVAL_MS = 66 // ~15fps

  constructor(options: PlayerOptions = {}) {
    this._volume = options.volume ?? 0.8
    this._fadeDuration = options.fadeDuration ?? 200
    this._playbackRate = options.playbackRate ?? 1
    this.onEndCallback = options.onEnd
    this.onPlayStateChangeCallback = options.onPlayStateChange
    this.onProgressCallback = options.onProgress
    this.onErrorCallback = options.onError

    Howler.volume(this._volume)
    this.initializeEqualizer()
  }

  /**
   * 初始化 Web Audio API 均衡器
   * 创建 5 个频段的 BiquadFilterNode
   */
  private initializeEqualizer(): void {
    try {
      // 获取或创建 AudioContext
      const ctx = Howler.ctx as AudioContext
      if (!ctx) {
        logger.warn('player', '[AudioEngine] AudioContext not available')
        return
      }

      this.audioContext = ctx

      // 定义 5 个频段（与 useEqualizer 对应）
      const frequencies = [60, 230, 910, 3600, 14000]

      // 创建 BiquadFilterNode
      this.equalizerFilters = frequencies.map((freq) => {
        const filter = ctx.createBiquadFilter()
        filter.type = 'peaking'
        filter.frequency.value = freq
        filter.Q.value = 1
        filter.gain.value = 0
        return filter
      })

      logger.info('player', '[AudioEngine] Equalizer initialized with', this.equalizerFilters.length, 'bands')
    } catch (error) {
      logger.error('player', '[AudioEngine] Failed to initialize equalizer:', error)
    }
  }

  /**
   * 播放音频（核心方法）
   * 参照 YPM: 每次 unload 全局 Howl，创建新实例
   */
  play(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // ★ 关键：先停止并卸载旧实例（stop 内部已调用 howl.unload()）
      this.stop()

      this.emitStateChange('loading')

      const format = this.guessFormat(src)

      // 重置停止标志，允许新实例的 onend 回调正常触发
      this._isStopping = false

      this._howl = new Howl({
        src: [src],
        html5: true,
        format: [format],
        // ★ 修复：不再初始化 volume=0（HTML5 模式下 fade 不可靠会导致永久静音）
        // 淡入效果改为 onplay 后手动处理
        volume: this._muted ? 0 : this._volume,
        onplay: () => {
          // 确保音量正确（HTML5 模式下 fade 不可靠）
          if (this._howl) {
            this._howl.volume(this._muted ? 0 : this._volume)
            this._howl.rate(this._playbackRate)
          }
          // 连接均衡器
          this.connectEqualizer()
          this.emitStateChange('playing')
          this.startProgressTracking()
          resolve()
        },
        onend: () => {
          // 如果是手动 stop 导致的，不触发 onEnd（避免自动切歌）
          if (!this._isStopping && !this._isFadeOut) {
            this.stopProgressTracking()
            this.onEndCallback?.()
          }
        },
        onpause: () => {
          this.emitStateChange('paused')
          this.stopProgressTracking()
        },
        onloaderror: (_id, errCode) => {
          logger.warn('player', `[AudioEngine] loaderror code=${errCode} for`, src)
          const err = new Error(`加载音频失败 (code=${errCode})`)
          this.onErrorCallback?.(err)
          this.emitStateChange('error')
          reject(err)
        },
        onplayerror: (_id, errCode) => {
          logger.warn('player', `[AudioEngine] playerror code=${errCode}`)
          const err = new Error(`播放错误 (code=${errCode})`)
          this.onErrorCallback?.(err)
          this.emitStateChange('error')
          reject(err)
        }
      })

      this._howl.play()
    })
  }

  setPlaybackRate(rate: number): void {
    this._playbackRate = Math.max(0.5, Math.min(2, rate))
    if (this._howl) {
      this._howl.rate(this._playbackRate)
    }
  }

  getPlaybackRate(): number {
    return this._playbackRate
  }

  /** 继续播放（暂停后恢复） */
  resume(): void {
    if (!this._howl) return
    if (this._howl.playing()) return

    this._howl.play()
    // 等待 play 事件后设置正确音量
    const doResume = () => {
      if (this._howl) {
        this._howl.volume(this._muted ? 0 : this._volume)
      }
      this.emitStateChange('playing')
      this.startProgressTracking()
      this._howl?.off('play', doResume)
    }
    this._howl.on('play', doResume)
  }

  /** 暂停 */
  pause(): void {
    if (this._howl && this._howl.playing()) {
      // ★ HTML5 模式下 fade 不可靠，直接 pause
      this._howl.pause()
    }
  }

  /** 停止并卸载 */
  stop(): void {
    this._isStopping = true
    this.stopProgressTracking()
    if (this._howl) {
      this._howl.stop()
      this._howl.unload()
      this._howl = null
    }
    // 注意：_isStopping 标志不在此重置，由下一次 play() 调用时重置
    // 这样可以确保 stop() 触发的 onend 不会误触发自动切歌
  }

  /** 跳转 */
  seek(time: number): void {
    if (this._howl) {
      this._howl.seek(time)
      this.onProgressCallback?.(time, this._howl.duration())
    }
  }

  getCurrentTime(): number {
    return this._howl ? this._howl.seek() : 0
  }

  getDuration(): number {
    return this._howl ? this._howl.duration() : 0
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
    Howler.volume(this._muted ? 0 : this._volume)
    if (this._howl && !this._isFadeIn && !this._isFadeOut) {
      this._howl.volume(this._muted ? 0 : this._volume)
    }
  }

  getVolume(): number {
    return this._volume
  }

  toggleMute(): boolean {
    if (this._muted) {
      this._muted = false
      Howler.volume(this._volume)
      if (this._howl && !this._isFadeIn && !this._isFadeOut) {
        this._howl.volume(this._volume)
      }
    } else {
      this._muted = true
      this._volumeBeforeMuted = this._volume
      Howler.volume(0)
      if (this._howl && !this._isFadeIn && !this._isFadeOut) {
        this._howl.volume(0)
      }
    }
    return this._muted
  }

  isPlaying(): boolean {
    return this._howl ? this._howl.playing() : false
  }

  destroy(): void {
    this.stop()
    this._howl = null
    this.destroyEqualizer()
  }

  /**
   * 设置均衡器频段增益
   * @param bandIndex 频段索引 (0-4)
   * @param gain 增益值 (-12 到 12 dB)
   */
  setEqualizerBand(bandIndex: number, gain: number): void {
    if (bandIndex < 0 || bandIndex >= this.equalizerFilters.length) {
      logger.warn('player', '[AudioEngine] Invalid band index:', bandIndex)
      return
    }

    const safeGain = Math.max(-12, Math.min(12, gain))
    this.equalizerFilters[bandIndex].gain.value = safeGain
    logger.debug('player', `[AudioEngine] Set band ${bandIndex} to ${safeGain}dB`)
  }

  /**
   * 批量设置均衡器所有频段
   * @param gains 增益值数组 [60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz]
   */
  setEqualizerBands(gains: number[]): void {
    gains.forEach((gain, index) => {
      if (index < this.equalizerFilters.length) {
        this.setEqualizerBand(index, gain)
      }
    })
  }

  /**
   * 启用或禁用均衡器
   */
  setEqualizerEnabled(enabled: boolean): void {
    this.equalizerEnabled = enabled

    if (!enabled) {
      // 禁用时将所有增益设为 0
      this.equalizerFilters.forEach(filter => {
        filter.gain.value = 0
      })
    }

    logger.info('player', '[AudioEngine] Equalizer', enabled ? 'enabled' : 'disabled')
  }

  /**
   * 获取均衡器启用状态
   */
  isEqualizerEnabled(): boolean {
    return this.equalizerEnabled
  }

  /**
   * 连接均衡器到音频链路
   * 在 Howl 实例创建后调用
   */
  private connectEqualizer(): void {
    if (!this.audioContext || this.equalizerFilters.length === 0) {
      return
    }

    try {
      // Howler.js 使用 Web Audio API，我们可以获取其 masterGain 节点
      const masterGain = (Howler as any).masterGain
      if (!masterGain) {
        logger.warn('player', '[AudioEngine] masterGain not available')
        return
      }

      // 断开现有连接
      masterGain.disconnect()

      // 连接均衡器链：masterGain -> filter1 -> filter2 -> ... -> destination
      let previousNode: AudioNode = masterGain

      for (const filter of this.equalizerFilters) {
        previousNode.connect(filter)
        previousNode = filter
      }

      // 最后连接到输出
      previousNode.connect(this.audioContext.destination)

      logger.info('player', '[AudioEngine] Equalizer connected to audio chain')
    } catch (error) {
      logger.error('player', '[AudioEngine] Failed to connect equalizer:', error)
    }
  }

  /**
   * 断开均衡器连接
   */
  private disconnectEqualizer(): void {
    if (!this.audioContext) return

    try {
      const masterGain = (Howler as any).masterGain
      if (masterGain) {
        // 断开所有连接
        masterGain.disconnect()
        this.equalizerFilters.forEach(filter => filter.disconnect())

        // 直接连接到输出
        masterGain.connect(this.audioContext.destination)
      }
    } catch (error) {
      logger.error('player', '[AudioEngine] Failed to disconnect equalizer:', error)
    }
  }

  /**
   * 销毁均衡器
   */
  private destroyEqualizer(): void {
    this.disconnectEqualizer()
    this.equalizerFilters = []
    this.audioContext = null
  }

  // ---- 私有方法 ----

  private guessFormat(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'mp3'
    const map: Record<string, string> = {
      mp3: 'mp3', m4a: 'mp4', ogg: 'ogg', wav: 'wav', flac: 'flac', aac: 'aac'
    }
    return map[ext] || 'mp3'
  }

  private emitStateChange(status: PlayerStatus): void {
    this.onPlayStateChangeCallback?.(status)
  }

  private startProgressTracking(): void {
    this.stopProgressTracking()
    this.lastProgressTime = 0
    const tick = (timestamp: number) => {
      if (this._howl && this._howl.playing()) {
        if (timestamp - this.lastProgressTime >= this.PROGRESS_INTERVAL_MS) {
          this.lastProgressTime = timestamp
          this.onProgressCallback?.(
            this._howl.seek(),
            this._howl.duration()
          )
        }
      }
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopProgressTracking(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
