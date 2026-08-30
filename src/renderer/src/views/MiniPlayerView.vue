<template>
  <div class="mini-player">
    <!-- 封面：点击回到主窗口 -->
    <div class="cover" :title="currentTrack?.title || '未在播放'" @click="handleBackToMain">
      <img v-if="currentTrack?.cover" :src="coverWithParam" alt="cover" />
      <div v-else class="cover-placeholder">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
    </div>

    <div class="body">
      <!-- 第一行：歌曲信息 + 右上角工具按钮 -->
      <div class="row row-head">
        <div class="track-info">
          <div class="title" :title="currentTrack?.title">{{ currentTrack?.title || '未在播放' }}</div>
          <div class="artist" :title="currentTrack?.artist">
            {{ currentTrack?.artist || '-' }}
          </div>
        </div>

        <div class="head-actions">
          <button
            class="icon-btn"
            :class="{ active: liked }"
            :title="liked ? '取消喜欢' : '喜欢'"
            @click="sendAction('toggleLike')"
          >
            <svg viewBox="0 0 24 24" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
            </svg>
          </button>

          <button class="icon-btn" title="返回主窗口" @click="handleBackToMain">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M15 3h6v6M21 3l-8 8M10 21H4v-6M3 21l8-8"/>
            </svg>
          </button>

          <button class="icon-btn close" title="关闭迷你播放器" @click="handleClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 第二行：当前歌词 -->
      <div class="row lyric-row">
        <span class="lyric" :title="currentLyric">{{ currentLyric || (currentTrack ? '暂无歌词' : '') }}</span>
      </div>

      <!-- 第三行：进度条 + 时间 -->
      <div class="row progress-row">
        <span class="time">{{ formatTime(displayTime) }}</span>
        <div
          ref="trackRef"
          class="progress-track"
          @pointerdown="onProgressPointerDown"
        >
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
        </div>
        <span class="time">{{ formatTime(duration) }}</span>
      </div>

      <!-- 第四行：播放控制 + 音量 -->
      <div class="row control-row">
        <button class="ctrl-btn" title="上一首" @click="sendAction('prev')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
          </svg>
        </button>

        <button class="ctrl-btn play-btn" :title="isPlaying ? '暂停' : '播放'" @click="sendAction('toggle')">
          <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <button class="ctrl-btn" title="下一首" @click="sendAction('next')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <div class="volume-group">
          <button class="ctrl-btn volume-btn" :title="muted ? '取消静音' : '静音'" @click="sendAction('toggleMute')">
            <svg v-if="muted || volume === 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M11 5 6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>
            </svg>
          </button>
          <input
            class="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="muted ? 0 : volume"
            title="音量"
            @input="onVolumeInput"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatTime } from '@/utils/format'
import type { DesktopLyricPayload, WindowTrackInfo } from '@/types/electron'

const currentTrack = ref<WindowTrackInfo | null>(null)
const isPlaying = ref(false)
const liked = ref(false)
const volume = ref(1)
const muted = ref(false)
const currentLyric = ref('')

/** 最近一次收到的歌曲时间（秒）与对应的本地时钟，用于插值出平滑进度 */
let anchorSongTime = 0
let anchorWallClock = 0

const displayTime = ref(0)
const dragging = ref(false)
const trackRef = ref<HTMLElement | null>(null)

let rafId = 0
const disposers: Array<() => void> = []

/** 进度百分比（0~100），duration 为 0 时退化为 0，避免除零得到 NaN */
const progressPercent = computed(() => {
  const total = currentTrack.value?.duration ?? 0
  if (!total || total <= 0) return 0
  return Math.min(100, Math.max(0, (displayTime.value / total) * 100))
})

const duration = computed(() => currentTrack.value?.duration ?? 0)

const coverWithParam = computed(() => {
  const cover = currentTrack.value?.cover
  if (!cover) return ''
  return cover.includes('?') ? cover : `${cover}?param=200y200`
})

/** 播放中时用 rAF 在两次 IPC 之间插值，避免进度条 300ms 一跳 */
function tick(): void {
  if (isPlaying.value && !dragging.value) {
    const elapsed = (performance.now() - anchorWallClock) / 1000
    const total = duration.value
    const next = anchorSongTime + elapsed
    displayTime.value = total > 0 ? Math.min(next, total) : next
  }
  rafId = requestAnimationFrame(tick)
}

function startTicking(): void {
  if (rafId) return
  rafId = requestAnimationFrame(tick)
}

function stopTicking(): void {
  if (!rafId) return
  cancelAnimationFrame(rafId)
  rafId = 0
}

function syncTime(currentTime: number): void {
  anchorSongTime = currentTime
  anchorWallClock = performance.now()
  if (!isPlaying.value || dragging.value) displayTime.value = currentTime
}

function sendAction(action: string): void {
  window.electronAPI?.sendPlayerAction?.(action)
}

function handleBackToMain(): void {
  window.electronAPI?.windowShowMain?.()
}

async function handleClose(): Promise<void> {
  await window.electronAPI?.closeMiniWindow()
}

function onVolumeInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  volume.value = value
  if (value > 0) muted.value = false
  sendAction(`volume:${value}`)
}

// ---------------- 进度条拖拽 ----------------

function seekFromClientX(clientX: number): void {
  const track = trackRef.value
  if (!track) return
  const rect = track.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  const total = duration.value
  if (total <= 0) return
  const time = ratio * total
  displayTime.value = time
  anchorSongTime = time
  anchorWallClock = performance.now()
}

function onProgressPointerDown(event: PointerEvent): void {
  if (duration.value <= 0) return
  event.preventDefault()
  dragging.value = true
  seekFromClientX(event.clientX)

  const onMove = (e: PointerEvent): void => seekFromClientX(e.clientX)
  const onUp = (e: PointerEvent): void => {
    seekFromClientX(e.clientX)
    dragging.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    sendAction(`seek:${displayTime.value.toFixed(3)}`)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

watch(isPlaying, (playing) => {
  if (playing) startTicking()
  else stopTicking()
})

onMounted(() => {
  const api = window.electronAPI
  if (!api) return

  disposers.push(
    api.onTrackUpdated((track) => {
      currentTrack.value = track
      displayTime.value = 0
      anchorSongTime = 0
      anchorWallClock = performance.now()
    }),
    api.onPlayStateUpdated((playing) => {
      isPlaying.value = playing
    }),
    api.onLikeStateUpdated((value) => {
      liked.value = value
    }),
    api.onProgressUpdated((currentTime) => {
      syncTime(currentTime)
    }),
    api.onVolumeUpdated((data) => {
      volume.value = data.volume
      muted.value = data.muted
    }),
    api.onLyricsUpdated((data: DesktopLyricPayload) => {
      currentLyric.value = data?.currentText ?? ''
    }),
  )

  // 新开的窗口收不到历史事件，主动向主进程要一次全量状态
  api.sendIpcEvent('player:requestState')
})

onUnmounted(() => {
  stopTicking()
  disposers.forEach((dispose) => dispose())
  disposers.length = 0
})
</script>

<style scoped>
.mini-player {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  -webkit-app-region: drag;
}

/* ---------- 封面 ---------- */
.cover {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}

.cover-placeholder svg {
  width: 44px;
  height: 44px;
}

/* ---------- 右侧内容 ---------- */
.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
}

.row {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* 第一行 */
.row-head {
  gap: 4px;
}

.track-info {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.head-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.icon-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn svg {
  width: 13px;
  height: 13px;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.icon-btn.active {
  color: #ff5a5f;
}

.icon-btn.close:hover {
  background: rgba(255, 90, 95, 0.85);
  color: #fff;
}

/* 第二行：歌词 */
.lyric-row {
  height: 16px;
}

.lyric {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 第三行：进度 */
.progress-row {
  gap: 6px;
  -webkit-app-region: no-drag;
}

.time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 28px;
  text-align: center;
}

.progress-track {
  position: relative;
  flex: 1;
  height: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: none;
}

.progress-track::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.14);
}

.progress-fill {
  position: absolute;
  left: 0;
  height: 3px;
  border-radius: 2px;
  background: #ff5a5f;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background: #fff;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.progress-track:hover .progress-thumb {
  opacity: 1;
}

/* 第四行：控制 */
.control-row {
  gap: 6px;
  -webkit-app-region: no-drag;
}

.ctrl-btn {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.ctrl-btn svg {
  width: 15px;
  height: 15px;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.ctrl-btn:active {
  transform: scale(0.92);
}

.play-btn {
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.18);
}

.play-btn svg {
  width: 17px;
  height: 17px;
}

/* 音量 */
.volume-group {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.volume-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
}

.volume-btn svg {
  width: 14px;
  height: 14px;
}

.volume-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.volume-slider {
  width: 60px;
  height: 3px;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 9px;
  height: 9px;
  border: none;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}
</style>
