import { Howl, Howler } from 'howler'
import type { Song } from '../stores/player'

export type PlayMode = 'sequence' | 'loop' | 'loopOne' | 'random' | 'reversed'
export type PlayerStatus = 'playing' | 'paused' | 'loading' | 'error'

export interface PlayerOptions {
  /** 音量 0-1 */
  volume?: number
  /** 淡入淡出时长(ms) */
  fadeDuration?: number
  /** 是否自动播放下一首 */
  autoNext?: boolean
  /** 音频结束回调 */
  onEnd?: () => void
  /** 播放状态变更回调 */
  onPlayStateChange?: (status: PlayerStatus) => void
  /** 进度更新回调 */
  onProgress?: (currentTime: number, duration: number) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

/**
 * 基于 Howler.js 的音频引擎封装
 * 借鉴 YesPlayMusic 的 Player.js 设计
 */
export class AudioEngine {
  private howl: Howl | null = null
  private _volume: number = 0.8
  private _volumeBeforeMuted: number = 0.8
  private _muted: boolean = false
  private _fadeDuration: number = 200
  private _autoNext: boolean = true
  private _isFadeIn: boolean = false
  private _isFadeOut: boolean = false

  // 回调函数
  private onEndCallback?: () => void
  private onPlayStateChangeCallback?: (status: PlayerStatus) => void
  private onProgressCallback?: (currentTime: number, duration: number) => void
  private onErrorCallback?: (error: Error) => void

  constructor(options: PlayerOptions = {}) {
    this._volume = options.volume ?? 0.8
    this._fadeDuration = options.fadeDuration ?? 200
    this._autoNext = options.autoNext ?? true
    this.onEndCallback = options.onEnd
    this.onPlayStateChangeCallback = options.onPlayStateChange
    this.onProgressCallback = options.onProgress
    this.onErrorCallback = options.onError

    Howler.volume(this._volume)
  }

  /**
   * 加载并播放音频
   * @param src 音频URL
   * @param html5 是否使用HTML5 Audio（支持流媒体）
   * @param format 音频格式
   */
  play(src: string, html5 = true, format?: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // 停止当前播放的音频
      this.stop()

      this.emitStateChange('loading')

      const sourceFormat = format || [this.getAudioFormat(src)]

      this.howl = new Howl({
        src: [src],
        html5,
        format: sourceFormat,
        volume: 0, // 从0开始淡入
        onplay: () => {
          // 淡入效果
          if (this.howl && this._fadeDuration > 0 && !this._muted) {
            this._isFadeIn = true
            this.howl.fade(0, this._volume, this._fadeDuration, () => {
              this._isFadeIn = false
            })
          } else if (this.howl) {
            this.howl.volume(this._muted ? 0 : this._volume)
          }

          this.emitStateChange('playing')
          this.startProgressTracking()
          resolve()
        },
        onend: () => {
          // 如果正在淡出，不触发onEnd（因为可能是手动停止）
          if (!this._isFadeOut) {
            this.onEndCallback?.()
          }
        },
        onpause: () => {
          this.emitStateChange('paused')
          this.stopProgressTracking()
        },
        onloaderror: (_id, error) => {
          const err = new Error(`加载音频失败: ${error}`)
          this.onErrorCallback?.(err)
          this.emitStateChange('error')
          reject(err)
        },
        onplayerror: (_id, error) => {
          const err = new Error(`播放错误: ${error}`)
          this.onErrorCallback?.(err)
          this.emitStateChange('error')
          reject(err)
        }
      })

      // 开始加载和播放
      this.howl.play()
    })
  }

  /**
   * 继续播放（从暂停状态恢复）
   */
  resume(): void {
    if (this.howl) {
      if (!this._muted && this._fadeDuration > 0) {
        // 淡入效果
        this._isFadeIn = true
        this.howl.fade(0, this._volume, this._fadeDuration, () => {
          this._isFadeIn = false
        })
      }
      this.howl.play()
    }
  }

  /**
   * 暂停播放（带淡出效果）
   */
  pause(): void {
    if (this.howl && this.howl.playing()) {
      if (this._fadeDuration > 0) {
        this._isFadeOut = true
        this.howl.fade(this.howl.volume(), 0, this._fadeDuration, () => {
          this._isFadeOut = false
          this.howl?.pause()
          if (this.howl) {
            this.howl.volume(this._muted ? 0 : this._volume)
          }
        })
      } else {
        this.howl.pause()
      }
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.howl) {
      this.stopProgressTracking()
      this.howl.stop()
      this.howl.unload()
      this.howl = null
    }
  }

  /**
   * 跳转到指定时间位置
   */
  seek(time: number): void {
    if (this.howl) {
      this.howl.seek(time)
      this.onProgressCallback?.(time, this.howl.duration())
    }
  }

  /**
   * 获取当前播放时间
   */
  getCurrentTime(): number {
    return this.howl ? this.howl.seek() : 0
  }

  /**
   * 获取音频总时长
   */
  getDuration(): number {
    return this.howl ? this.howl.duration() : 0
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
    Howler.volume(this._muted ? 0 : this._volume)

    if (this.howl && !this._isFadeIn && !this._isFadeOut) {
      this.howl.volume(this._muted ? 0 : this._volume)
    }
  }

  /**
   * 获取音量
   */
  getVolume(): number {
    return this._volume
  }

  /**
   * 静音切换
   */
  toggleMute(): boolean {
    if (this._muted) {
      // 取消静音
      this._muted = false
      Howler.volume(this._volume)
      if (this.howl && !this._isFadeIn && !this._isFadeOut) {
        this.howl.volume(this._volume)
      }
    } else {
      // 静音
      this._muted = true
      this._volumeBeforeMuted = this._volume
      Howler.volume(0)
      if (this.howl && !this._isFadeIn && !this._isFadeOut) {
        this.howl.volume(0)
      }
    }
    return this._muted
  }

  /**
   * 是否处于静音状态
   */
  isMuted(): boolean {
    return this._muted
  }

  /**
   * 是否正在播放
   */
  isPlaying(): boolean {
    return this.howl ? this.howl.playing() : false
  }

  /**
   * 获取音频缓冲进度 (HTML5模式)
   */
  getBuffered(): number[] | null {
    // Howler.js 在 HTML5 模式下无法直接获取 buffered 信息
    // 这里返回 null，如果需要可以通过原生 API 实现
    return null
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.stop()
    this.howl = null
  }

  /**
   * 根据URL推断音频格式
   */
  private getAudioFormat(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'mp3'
    const formatMap: Record<string, string> = {
      mp3: 'mp3',
      m4a: 'mp4',
      ogg: 'ogg',
      wav: 'wav',
      flac: 'flac',
      aac: 'aac'
    }
    return formatMap[ext] || 'mp3'
  }

  /**
   * 发送状态变更通知
   */
  private emitStateChange(status: PlayerStatus): void {
    this.onPlayStateChangeCallback?.(status)
  }

  /**
   * 进度追踪定时器
   */
  private progressInterval: ReturnType<typeof setInterval> | null = null

  private startProgressTracking(): void {
    this.stopProgressTracking()
    this.progressInterval = setInterval(() => {
      if (this.howl && this.howl.playing()) {
        const currentTime = this.howl.seek()
        const duration = this.howl.duration()
        this.onProgressCallback?.(currentTime, duration)
      }
    }, 200) // 每200ms更新一次
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = null
    }
  }
}
