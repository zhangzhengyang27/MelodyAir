/**
 * 音频引擎窗口脚本
 * 在隐藏的 BrowserWindow 中运行，作为全局唯一的音频播放引擎
 * 通过 IPC 与主进程通信，主进程再广播到所有窗口
 */
import { AudioEngine } from './utils/player'
import type { PlayerStatus } from './utils/player'

// 在隐藏窗口中直接使用 electron（需要 nodeIntegration: true）
const { ipcRenderer } = require('electron')

// 音频引擎单例
let audioEngine: AudioEngine | null = null

// 当前播放的歌曲 ID（用于避免重复播放）
let currentSongId: string | number | null = null

// 频率数据发送（用于音频可视化）
let frequencyRafId: number | null = null
let lastFrequencySendTime = 0
const FREQUENCY_SEND_INTERVAL = 33 // ~30fps

/**
 * 启动频率数据采集和发送
 */
function startFrequencyCollection() {
  if (frequencyRafId !== null) return

  const collect = () => {
    if (audioEngine) {
      const now = Date.now()
      if (now - lastFrequencySendTime >= FREQUENCY_SEND_INTERVAL) {
        lastFrequencySendTime = now
        const freqData = audioEngine.getFrequencyData()
        // 转换为普通数组通过 IPC 发送
        ipcRenderer.send('audio:frequencyData', { frequencyData: Array.from(freqData) })
      }
    }
    frequencyRafId = requestAnimationFrame(collect)
  }

  frequencyRafId = requestAnimationFrame(collect)
  console.log('[AudioEngine] Frequency collection started')
}

/**
 * 初始化音频引擎
 */
function initAudioEngine() {
  audioEngine = new AudioEngine({
    volume: 0.8,
    onEnd: () => {
      ipcRenderer.send('audio:ended')
    },
    onPlayStateChange: (status: PlayerStatus) => {
      ipcRenderer.send('audio:stateChange', { status })
    },
    onProgress: (currentTime: number, duration: number) => {
      ipcRenderer.send('audio:timeUpdate', { currentTime, duration })
    },
    onBuffered: (progress: number) => {
      ipcRenderer.send('audio:buffered', { progress })
    },
    onError: (error: Error) => {
      ipcRenderer.send('audio:error', { message: error.message })
    }
  })

  console.log('[AudioEngine] Initialized')

  // 启动频率数据采集（用于音频可视化）
  startFrequencyCollection()
}

/**
 * 播放歌曲
 */
async function play(params: { url: string; songId: string | number }) {
  if (!audioEngine) initAudioEngine()

  // 如果是同一首歌且正在播放，忽略
  if (currentSongId === params.songId && audioEngine?.isPlaying()) {
    return
  }

  currentSongId = params.songId
  try {
    await audioEngine!.play(params.url)
  } catch (error) {
    console.error('[AudioEngine] Play failed:', error)
  }
}

/**
 * 暂停
 */
function pause() {
  audioEngine?.pause()
}

/**
 * 继续播放
 */
function resume() {
  audioEngine?.resume()
}

/**
 * 切换播放/暂停
 */
function toggle() {
  if (audioEngine?.isPlaying()) {
    audioEngine.pause()
  } else {
    audioEngine?.resume()
  }
}

/**
 * 跳转
 */
function seek(params: { time: number }) {
  audioEngine?.seek(params.time)
}

/**
 * 设置音量
 */
function setVolume(params: { volume: number }) {
  audioEngine?.setVolume(params.volume)
}

/**
 * 获取音量
 */
function getVolume() {
  return audioEngine?.getVolume() ?? 0.8
}

/**
 * 切换静音
 */
function toggleMute() {
  return audioEngine?.toggleMute() ?? false
}

/**
 * 设置播放速率
 */
function setPlaybackRate(params: { rate: number }) {
  audioEngine?.setPlaybackRate(params.rate)
}

/**
 * 获取播放速率
 */
function getPlaybackRate() {
  return audioEngine?.getPlaybackRate() ?? 1
}

/**
 * 设置均衡器频段
 */
function setEqualizerBand(params: { bandIndex: number; gain: number }) {
  audioEngine?.setEqualizerBand(params.bandIndex, params.gain)
}

/**
 * 批量设置均衡器
 */
function setEqualizerBands(params: { gains: number[] }) {
  audioEngine?.setEqualizerBands(params.gains)
}

/**
 * 启用/禁用均衡器
 */
function setEqualizerEnabled(params: { enabled: boolean }) {
  audioEngine?.setEqualizerEnabled(params.enabled)
}

/**
 * 获取当前时间
 */
function getCurrentTime() {
  return audioEngine?.getCurrentTime() ?? 0
}

/**
 * 获取时长
 */
function getDuration() {
  return audioEngine?.getDuration() ?? 0
}

/**
 * 是否正在播放
 */
function isPlaying() {
  return audioEngine?.isPlaying() ?? false
}

/**
 * 停止
 */
function stop() {
  currentSongId = null
  audioEngine?.stop()
}

// 注册 IPC 命令处理
const commandHandlers: Record<string, (params: any) => any> = {
  'audio:play': play,
  'audio:pause': pause,
  'audio:resume': resume,
  'audio:toggle': toggle,
  'audio:seek': seek,
  'audio:setVolume': setVolume,
  'audio:getVolume': getVolume,
  'audio:toggleMute': toggleMute,
  'audio:setPlaybackRate': setPlaybackRate,
  'audio:getPlaybackRate': getPlaybackRate,
  'audio:setEqualizerBand': setEqualizerBand,
  'audio:setEqualizerBands': setEqualizerBands,
  'audio:setEqualizerEnabled': setEqualizerEnabled,
  'audio:getCurrentTime': getCurrentTime,
  'audio:getDuration': getDuration,
  'audio:isPlaying': isPlaying,
  'audio:stop': stop
}

// 监听来自主进程的命令
Object.entries(commandHandlers).forEach(([channel, handler]) => {
  ipcRenderer.on(channel, async (_event: any, params: any) => {
    try {
      const result = await handler(params)
      // 对于需要返回值的命令，通过 reply 返回
      if (result !== undefined) {
        _event.reply(`${channel}:reply`, result)
      }
    } catch (error) {
      console.error(`[AudioEngine] Command ${channel} failed:`, error)
    }
  })
})

// 初始化
initAudioEngine()

// 通知主进程音频引擎已就绪
ipcRenderer.send('audio:ready')

console.log('[AudioEngine] Window loaded, waiting for commands...')
