import { Howl, Howler } from 'howler'
import { logger } from './logger'

export type PlayMode = 'sequence' | 'loop' | 'loopOne' | 'random' | 'reversed'
export type PlayerStatus = 'playing' | 'paused' | 'loading' | 'error'

/** play() 等待 onplay 的超时时间（自动播放被拦截时兜底放行） */
const PLAY_START_TIMEOUT_MS = 15000

/** 频率数据数组长度（AnalyserNode fftSize / 2） */
const FREQUENCY_BIN_COUNT = 128

/** Howler 把 html5 模式标记挂在实例私有属性上，类型定义里没有公开 */
function isHtml5Howl(howl: Howl): boolean {
  return Boolean((howl as unknown as { _html5?: boolean })._html5)
}

export interface PlayerOptions {
  volume?: number
  fadeDuration?: number
  playbackRate?: number
  onEnd?: () => void
  onPlayStateChange?: (status: PlayerStatus) => void
  onProgress?: (currentTime: number, duration: number) => void
  onBuffered?: (progress: number) => void
  onError?: (error: Error) => void
}

/**
 * 基于 Howler.js 的音频引擎封装
 * 参考 YesPlayMusic Player.js 设计：
 * - 全局单例 Howl 实例（每次播放新歌时 unload 旧的再创建新的）
 * - HTML5 模式以支持流媒体
 * - 淡入淡出效果
 * - Web Audio AnalyserNode 支持音频可视化
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
  /** 淡出结束后是否自动暂停（resume 时取消） */
  private _pauseAfterFade: boolean = false
  /** 防止手动 stop() 时误触发 onend 回调 */
  private _isStopping: boolean = false

  /** 待执行的 resume play 监听器，防止多次 resume 累积监听器 */
  private _pendingResumeListener: (() => void) | null = null

  // 音频可视化 AnalyserNode（旁路连接，不影响音频输出）
  private audioContext: AudioContext | null = null
  private analyserNode: AnalyserNode | null = null
  // 显式绑定 ArrayBuffer：getByteFrequencyData 要求 Uint8Array<ArrayBuffer>，
  // 直接用 new Uint8Array(length) 会被推断成 Uint8Array<ArrayBufferLike>
  private frequencyDataArray: Uint8Array<ArrayBuffer> | null = null

  // 回调函数
  private onEndCallback?: () => void
  private onPlayStateChangeCallback?: (status: PlayerStatus) => void
  private onProgressCallback?: (currentTime: number, duration: number) => void
  private onBufferedCallback?: (progress: number) => void
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
    this.onBufferedCallback = options.onBuffered
    this.onErrorCallback = options.onError

    Howler.volume(this._volume)
    this.initializeAnalyser()
  }

  /**
   * 初始化音频可视化 AnalyserNode
   */
  private initializeAnalyser(): void {
    try {
      // 获取或创建 AudioContext
      const ctx = Howler.ctx as AudioContext
      if (!ctx) {
        logger.warn('player', '[AudioEngine] AudioContext not available')
        return
      }

      this.audioContext = ctx

      // 创建音频可视化 AnalyserNode（旁路连接）
      this.analyserNode = ctx.createAnalyser()
      this.analyserNode.fftSize = 256 // 128 个频率数据点
      this.analyserNode.smoothingTimeConstant = 0.8
      this.frequencyDataArray = new Uint8Array(new ArrayBuffer(this.analyserNode.frequencyBinCount))

      logger.info('player', '[AudioEngine] AnalyserNode initialized')
    } catch (error) {
      logger.error('player', '[AudioEngine] Failed to initialize analyser:', error)
    }
  }

  /**
   * 播放音频（核心方法）
   * 参照 YPM: 每次 unload 全局 Howl，创建新实例
   * @param src 音频 URL
   * @param options.html5 是否使用 HTML5 Audio 模式（流式播放，适合长音频如播客；但不经过 Web Audio，可视化不可用）
   */
  play(src: string, options?: { html5?: boolean }): Promise<void> {
    return new Promise((resolve, reject) => {
      // ★ 关键：先停止并卸载旧实例（stop 内部已调用 howl.unload()）
      this.stop()

      this.emitStateChange('loading')

      // 兜底放行：浏览器自动播放策略拦截时 Howl 会一直等待用户手势，
      // onplay 可能长时间不触发，调用方（如切换音质）会永远卡在 loading。
      // 超时后仍 resolve —— 音频是事件驱动的，解锁后 onplay 照常播放，
      // 提前放行只是让调用方的后续步骤（恢复进度/暂停）不被阻塞。
      const playWaitTimer = setTimeout(() => {
        logger.warn('player', '[AudioEngine] play() 等待 onplay 超时，提前放行')
        resolve()
      }, PLAY_START_TIMEOUT_MS)

      // 确保 AudioContext 处于运行状态（浏览器中需要用户交互才能 resume）
      try {
        const ctx = (Howler as any).ctx as AudioContext
        if (ctx && ctx.state === 'suspended') {
          ctx.resume()
        }
      } catch (e) {
        logger.warn('player', '[AudioEngine] Failed to resume AudioContext:', e)
      }

      const format = this.guessFormat(src)
      const useHtml5 = options?.html5 ?? false

      // 重置停止标志，允许新实例的 onend 回调正常触发
      this._isStopping = false

      // html5: false（默认）使用 Web Audio API 模式，音频经过 masterGain，
      // AnalyserNode（音频可视化）才能正常工作，但需要先下载整个文件再解码。
      // html5: true 使用 HTML5 Audio 元素，支持流式播放，适合长音频（如播客），
      // 但不经过 Web Audio API，可视化不可用。
      this._howl = new Howl({
        src: [src],
        html5: useHtml5,
        format: [format],
        volume: useHtml5 ? (this._muted ? 0 : this._volume) : 0, // Web Audio 模式从 0 开始淡入
        onplay: () => {
          clearTimeout(playWaitTimer)
          // 确保播放速率正确
          if (this._howl) {
            this._howl.rate(this._playbackRate)
          }
          // 旁路连接 AnalyserNode
          this.connectAnalyser()
          this.emitStateChange('playing')
          this.startProgressTracking()
          // Web Audio 模式下淡入
          if (!useHtml5 && !this._muted && this._volume > 0) {
            this._isFadeIn = true
            this._howl?.fade(0, this._volume, this._fadeDuration)
            this._howl?.once('fade', () => {
              this._isFadeIn = false
              if (this._howl) this._howl.volume(this._volume)
            })
          } else if (this._howl) {
            this._howl.volume(this._muted ? 0 : this._volume)
          }
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
          clearTimeout(playWaitTimer)
          logger.warn('player', `[AudioEngine] loaderror code=${errCode} for`, src)
          const err = new Error(`加载音频失败 (code=${errCode})`)
          this.onErrorCallback?.(err)
          this.emitStateChange('error')
          reject(err)
        },
        onplayerror: (_id, errCode) => {
          clearTimeout(playWaitTimer)
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

  /** 继续播放（暂停后恢复，淡入） */
  resume(): void {
    if (!this._howl) return
    if (this._howl.playing()) return

    // 移除之前待执行的 resume 监听器，防止多次 resume 累积
    if (this._pendingResumeListener) {
      this._howl.off('play', this._pendingResumeListener)
      this._pendingResumeListener = null
    }

    // 取消暂停淡出后的自动暂停（防止淡出回调在 resume 后触发导致意外暂停）
    if (this._pauseAfterFade) {
      this._pauseAfterFade = false
      this._isFadeOut = false
      this._howl.off('fade')
    }

    // HTML5 模式下直接播放
    if (isHtml5Howl(this._howl)) {
      this._howl.volume(this._muted ? 0 : this._volume)
      this._howl.play()
      this.emitStateChange('playing')
      this.startProgressTracking()
      return
    }

    // Web Audio 模式：从 0 开始淡入
    this._howl.volume(0)
    this._howl.play()
    const doResume = () => {
      if (this._howl) {
        this._isFadeIn = true
        this._howl.fade(0, this._muted ? 0 : this._volume, this._fadeDuration)
        this._howl.once('fade', () => {
          this._isFadeIn = false
        })
      }
      this.emitStateChange('playing')
      this.startProgressTracking()
      this._howl?.off('play', doResume)
      if (this._pendingResumeListener === doResume) {
        this._pendingResumeListener = null
      }
    }
    this._pendingResumeListener = doResume
    this._howl.on('play', doResume)
  }

  /** 暂停（淡出后暂停） */
  pause(): void {
    if (!this._howl || !this._howl.playing()) return
    // HTML5 模式下 fade 不可靠，直接 pause
    if (isHtml5Howl(this._howl)) {
      this._howl.pause()
      return
    }
    // 淡出后暂停
    this._isFadeOut = true
    this._pauseAfterFade = true
    const currentVol = this._howl.volume()
    this._howl.fade(currentVol, 0, this._fadeDuration)
    this._howl.once('fade', () => {
      if (this._howl && this._pauseAfterFade) {
        this._howl.pause()
        this._howl.volume(this._volume) // 恢复音量设置，下次 resume 时从正确音量开始
      }
      this._isFadeOut = false
      this._pauseAfterFade = false
    })
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

  /**
   * 设置淡入淡出时长（毫秒）
   */
  setFadeDuration(ms: number): void {
    this._fadeDuration = Math.max(0, Math.min(1000, Math.round(ms)))
    logger.debug('player', `[AudioEngine] Fade duration set to ${this._fadeDuration}ms`)
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
    this.destroyAnalyser()
  }

  /**
   * 获取音频频率数据（用于可视化）
   * 返回 Uint8Array，每个值 0-255
   */
  getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (this.analyserNode && this.frequencyDataArray) {
      this.analyserNode.getByteFrequencyData(this.frequencyDataArray)
      return this.frequencyDataArray
    }
    // 返回空数组
    return new Uint8Array(new ArrayBuffer(FREQUENCY_BIN_COUNT))
  }

  /**
   * 旁路连接 AnalyserNode 到音频链路（不影响输出）
   * 在 Howl 实例创建后调用
   */
  private connectAnalyser(): void {
    // 检查 AudioContext 是否有效（未关闭且与 Howler.ctx 相同）
    const howlerCtx = (Howler as any).ctx as AudioContext
    const ctxInvalid = !this.audioContext ||
      this.audioContext.state === 'closed' ||
      this.audioContext !== howlerCtx

    // 如果 AudioContext 无效或 AnalyserNode 未初始化，重新初始化
    if (ctxInvalid || !this.analyserNode) {
      this.initializeAnalyser()
      if (!this.analyserNode) {
        return
      }
    }

    try {
      // Howler.js 使用 Web Audio API，音频最终汇总到 masterGain
      const masterGain = (Howler as any).masterGain
      if (!masterGain) {
        logger.warn('player', '[AudioEngine] masterGain not available')
        return
      }

      // 旁路连接 AnalyserNode（不影响音频输出，用于可视化）
      try {
        masterGain.connect(this.analyserNode)
      } catch (e) {
        // 可能已经连接，忽略错误
      }

      logger.info('player', '[AudioEngine] AnalyserNode connected')
    } catch (error) {
      logger.error('player', '[AudioEngine] Failed to connect analyser:', error)
    }
  }

  /**
   * 销毁可视化节点
   */
  private destroyAnalyser(): void {
    try {
      this.analyserNode?.disconnect()
    } catch (error) {
      logger.error('player', '[AudioEngine] Failed to disconnect analyser:', error)
    }
    this.analyserNode = null
    this.frequencyDataArray = null
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
          // 获取缓冲进度（HTML5 模式下访问内部 audio 元素）
          try {
            const sound = (this._howl as any)?._sounds?.[0]
            const audioEl = sound?._node
            if (audioEl && audioEl.buffered && audioEl.buffered.length > 0 && audioEl.duration > 0) {
              const bufferedEnd = audioEl.buffered.end(audioEl.buffered.length - 1)
              this.onBufferedCallback?.(Math.min(1, bufferedEnd / audioEl.duration))
            }
          } catch {
            // 忽略缓冲进度获取失败
          }
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
