<template>
  <div
    class="player-full fixed inset-0 z-50 flex flex-col overflow-hidden"
    :style="{ '--accent-color': accentColor }"
  >
    <!-- 动态背景层：封面模糊 + 渐变叠加 -->
    <div class="absolute inset-0 overflow-hidden">
      <img
        v-if="playerStore.currentSong?.album?.picUrl"
        :src="playerStore.currentSong.album.picUrl + '?param=400y400'"
        alt=""
        class="bg-image h-full w-full object-cover scale-110"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-[#0a0a10]/95 via-[#09090f]/90 to-[#050508]" />
      <!-- 环境光效 -->
      <div class="ambient-glow" :class="{ active: playerStore.playing }" />
    </div>

    <!-- Header -->
    <header class="relative flex items-center justify-between px-6 py-4" style="-webkit-app-region: drag;">
      <button
        class="header-btn"
        style="-webkit-app-region: no-drag;"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div class="flex items-center gap-2">
        <span class="playing-dot" :class="{ active: playerStore.playing }" />
        <span class="text-xs font-medium tracking-wider text-white/60 uppercase">Now Playing</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative flex min-h-0 flex-1 overflow-hidden">
      <!-- Left: Cover + Info + Controls -->
      <section class="flex flex-1 flex-col items-center justify-center gap-6 px-8 pb-6">
        <!-- 唱片封面 -->
        <div class="vinyl-container">
          <!-- 外部光晕 -->
          <div class="vinyl-glow" :class="{ active: playerStore.playing }" />
          <!-- 唱片主体 -->
          <div
            class="vinyl-disc"
            :class="{ spinning: playerStore.playing }"
          >
            <img
              v-if="playerStore.currentSong?.album?.picUrl"
              :src="playerStore.currentSong.album.picUrl + '?param=600y600'"
              alt="cover"
              class="disc-cover"
            />
            <div v-else class="disc-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <!-- 中心孔 -->
            <div class="disc-center-hole">
              <div class="disc-center-inner" />
            </div>
            <!-- 唱片纹路 -->
            <div class="disc-grooves" />
          </div>
          <!-- 底部反射 -->
          <div class="vinyl-reflection" />
        </div>

        <!-- 曲目信息 -->
        <div class="song-info max-w-sm text-center">
          <h1 class="song-title">{{ playerStore.currentSong?.name || '未在播放' }}</h1>
          <p class="song-artist">
            <template v-if="playerStore.currentSong?.artists?.length">
              <template v-for="(artist, idx) in playerStore.currentSong.artists" :key="artist.id">
                <router-link :to="`/artist/${artist.id}`" class="artist-link">{{ artist.name }}</router-link>
                <span v-if="idx < playerStore.currentSong.artists.length - 1" class="mx-1"> / </span>
              </template>
            </template>
            <span v-else>--</span>
          </p>
          <p v-if="playerStore.currentSong?.album?.name" class="song-album">
            <router-link :to="`/album/${playerStore.currentSong.album.id}`" class="album-link">{{ playerStore.currentSong.album.name }}</router-link>
          </p>
        </div>

        <!-- 进度条（增强版） -->
        <div class="progress-section w-full max-w-md">
          <div
            ref="progressBarEl"
            class="progress-track"
            @mousedown="onProgressDragStart"
            @touchstart.prevent="onProgressTouchStart"
            @mouseenter="isProgressHovered = true"
            @mouseleave="isProgressHovered = false"
            @mousemove="onProgressHoverMove"
          >
            <!-- 缓冲条（预留） -->
            <div class="progress-buffer" :style="bufferStyle" />
            <!-- 已播进度 -->
            <div class="progress-fill" :style="progressStyle" />
            <!-- 拖拽手柄 -->
            <div
              class="progress-thumb"
              :class="{ visible: isDragging || isProgressHovered }"
              :style="progressThumbStyle"
            />
            <!-- 悬停预览 -->
            <div
              v-if="isProgressHovered && !isDragging"
              class="progress-tooltip"
              :style="hoverTooltipStyle"
            >
              {{ formatTime(hoverTime) }}
            </div>
            <!-- 拖拽时的时间预览 -->
            <div
              v-if="isDragging"
              class="progress-tooltip dragging"
              :style="dragTooltipStyle"
            >
              {{ formatTime(dragTime) }}
            </div>
          </div>
          <div class="time-labels">
            <span>{{ formatTime(playerStore.currentTime) }}</span>
            <span>{{ formatTime(playerStore.duration) }}</span>
          </div>
        </div>

        <!-- 控制按钮组 -->
        <div class="controls-row flex items-center gap-5">
          <!-- 播放模式 -->
          <button class="ctrl-btn ctrl-btn-sm" @click="playerStore.togglePlayMode" :title="playModeLabel">
            <span class="text-base leading-none">{{ playModeIcon }}</span>
          </button>

          <!-- 上一首 -->
          <button class="ctrl-btn" @click="playerStore.playPrev" title="上一首">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <!-- 播放/暂停（主按钮）-->
          <button
            class="play-btn-main"
            :class="{ playing: playerStore.playing }"
            @click="playerStore.togglePlaying"
          >
            <!-- 播放图标 -->
            <svg v-if="!playerStore.playing" xmlns="http://www.w3.org/2000/svg" class="play-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <!-- 暂停图标 -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="pause-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <!-- 播放时的脉冲环 -->
            <div v-if="playerStore.playing" class="pulse-ring" />
          </button>

          <!-- 下一首 -->
          <button class="ctrl-btn" @click="playerStore.playNext" title="下一首">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <!-- 喜欢 -->
          <button class="ctrl-btn ctrl-btn-sm" @click="handleLike" :title="isLiked ? '取消喜欢' : '喜欢'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-colors duration-300" :class="[isLiked ? 'text-coral' : '']" :fill="isLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          <!-- 播放队列 -->
          <button class="ctrl-btn ctrl-btn-sm" @click="showQueue = true" title="播放队列">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h10m-10 4h6" />
            </svg>
          </button>
        </div>

        <!-- 音量控制行 -->
        <div class="volume-row flex w-full max-w-xs items-center gap-3">
          <button class="vol-btn" @click="toggleMute" :title="playerStore.volume === 0 ? '取消静音' : '静音'">
            <!-- 静音图标 -->
            <svg v-if="playerStore.volume === 0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            <!-- 低音量 -->
            <svg v-else-if="playerStore.volume < 0.35" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z" />
            </svg>
            <!-- 中音量 -->
            <svg v-else-if="playerStore.volume < 0.7" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 6l-4 4H4v4h4l4 4V6z" />
            </svg>
            <!-- 高音量 -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 6l-4 4H4v4h4l4 4V6z" />
            </svg>
          </button>
          <div
            ref="volumeBarEl"
            class="volume-track"
            @mousedown="onVolumeDragStart"
            @touchstart.prevent="onVolumeTouchStart"
            @mouseenter="isVolumeHovered = true"
            @mouseleave="isVolumeHovered = false"
          >
            <div class="volume-track-bg" />
            <div class="volume-fill" :style="volumeFillStyle" />
            <div
              class="volume-thumb"
              :class="{ visible: isVolumeDragging || isVolumeHovered }"
              :style="volumeThumbStyle"
            />
          </div>
          <span class="volume-value text-xs text-white/40 tabular-nums w-8 text-right">
            {{ Math.round(playerStore.volume * 100) }}%
          </span>
        </div>
      </section>

      <!-- Right: 歌词面板 -->
      <aside class="lyric-panel glass-panel flex w-[380px] flex-col overflow-hidden border-l border-white/5 lg:w-[420px]">
        <LyricView
          v-if="lyrics.length > 0"
          :lyrics="lyrics"
          :current-index="currentLyricIndex"
          @seek="handleLyricSeek"
        />
        <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 text-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span class="text-sm">暂无歌词</span>
        </div>
      </aside>
    </main>

    <!-- 播放队列弹窗 -->
    <PlayQueue
      v-if="showQueue"
      :playlist="playerStore.playlist"
      :current-index="playerStore.currentIndex"
      :play-next-list="playerStore.playNextList"
      :visible="showQueue"
      @close="showQueue = false"
      @play="(s, i) => { playerStore.currentIndex = i; playerStore.playSong(s) }"
      @remove="(i) => playerStore.removeFromPlaylist(i)"
      @clear-all="playerStore.clearPlaylist()"
      @reorder="(from, to) => playerStore.reorderPlaylist(from, to)"
      @remove-duplicates="handleRemoveDuplicates"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useUserStore } from '@/stores/user'
import { useAudio } from '@/composables/useAudio'
import { useLyric } from '@/composables/useLyric'
import { formatTime } from '@/utils/format'
import LyricView from './LyricView.vue'
import PlayQueue from './PlayQueue.vue'

defineEmits<{
  close: []
}>()

const playerStore = usePlayerStore()
const userStore = useUserStore()
const { seek, seekByProgress } = useAudio()
const { lyrics, currentIndex: currentLyricIndex } = useLyric()

// UI State
const showQueue = ref(false)
const wasPlaying = ref(false)
const prevVolume = ref(0.8)

// Progress Bar State
const progressBarEl = ref<HTMLElement>()
let isDragging = false
let dragProgress = 0
let dragTime = 0
const isProgressHovered = ref(false)
const hoverProgress = ref(0)
const hoverTime = ref(0)
const bufferProgress = ref(0)
const displayProgress = computed(() =>
  isDragging ? dragProgress : playerStore.progress
)

// 动态样式（避免模板内联表达式解析问题）
const progressStyle = computed(() => ({ width: displayProgress.value * 100 + '%' }))
const progressThumbStyle = computed(() => ({ left: displayProgress.value * 100 + '%' }))
const bufferStyle = computed(() => ({ width: bufferProgress.value * '%' }))
const hoverTooltipStyle = computed(() => ({ left: (hoverProgress.value * 100) + '%' }))
const dragTooltipStyle = computed(() => ({ left: (dragProgress * 100) + '%' }))
const volumeFillStyle = computed(() => ({ width: (playerStore.volume * 100) + '%' }))
const volumeThumbStyle = computed(() => ({ left: (playerStore.volume * 100) + '%' }))

// Volume Bar State
const volumeBarEl = ref<HTMLElement>()
let isVolumeDragging = false
const isVolumeHovered = ref(false)

// Watch playing state for vinyl animation continuity
watch(() => playerStore.playing, (val) => {
  if (val) wasPlaying.value = true
})

// Computed
const isLiked = computed(() =>
  playerStore.currentSong ? userStore.isLiked(playerStore.currentSong.id) : false
)

const playModeIcon = computed(() => {
  const icons: Record<string, string> = {
    sequence: '\u{1F500}', loop: '\u{1F501}', random: '\u{1F3B2}',
    loopOne: '\u{1F502}', reversed: '\u23EE}'
  }
  return icons[playerStore.playMode]
})

const playModeLabel = computed(() => {
  const labels: Record<string, string> = {
    sequence: '顺序播放', loop: '列表循环', random: '随机播放',
    loopOne: '单曲循环', reversed: '倒序播放'
  }
  return labels[playerStore.playMode]
})

// Accent color derived from cover (placeholder)
const accentColor = computed(() => '#FF5A5F')

// === Actions ===
function toggleMute() {
  if (playerStore.volume > 0) {
    prevVolume.value = playerStore.volume
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(prevVolume.value)
  }
}

function handleLike() {
  if (playerStore.currentSong) {
    userStore.toggleLike(playerStore.currentSong.id)
  }
}

function handleRemoveDuplicates() {
  const removedCount = playerStore.removeDuplicates()
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} duplicate songs`)
  }
}

function handleLyricSeek(time: number) {
  seek(time)
}

// === Progress Bar Drag Logic ===
function calcProgressFromEvent(e: MouseEvent | TouchEvent): number {
  if (!progressBarEl.value) return 0
  const rect = progressBarEl.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

function onProgressDragStart(e: MouseEvent) {
  isDragging = true
  document.addEventListener('mousemove', onProgressDragMove)
  document.addEventListener('mouseup', onProgressDragEnd)
  updateDrag(calcProgressFromEvent(e))
}

function onProgressTouchStart(e: TouchEvent) {
  isDragging = true
  document.addEventListener('touchmove', onProgressDragMove, { passive: false })
  document.addEventListener('touchend', onProgressDragEnd)
  updateDrag(calcProgressFromEvent(e))
}

function onProgressDragMove(e: Event) {
  if (!isDragging) return
  updateDrag(calcProgressFromEvent(e as MouseEvent | TouchEvent))
}

function onProgressDragEnd(e: MouseEvent | TouchEvent | Event) {
  if (!isDragging) return
  isDragging = false
  document.removeEventListener('mousemove', onProgressDragMove)
  document.removeEventListener('mouseup', onProgressDragEnd)
  document.removeEventListener('touchmove', onProgressDragMove)
  document.removeEventListener('touchend', onProgressDragEnd)
  // Seek to final position
  seekByProgress(dragProgress)
}

function updateDrag(progress: number) {
  dragProgress = progress
  dragTime = progress * playerStore.duration
}

// Progress hover (via @mousemove on element)
// Progress hover (via @mousemove on element)
function onProgressHoverMove(e: MouseEvent) {
  if (!progressBarEl.value) return
  const rect = progressBarEl.value.getBoundingClientRect()
  const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  hoverProgress.value = p
  hoverTime.value = p * playerStore.duration
}

// === Volume Bar Drag Logic ===
function calcVolumeFromEvent(e: MouseEvent | TouchEvent): number {
  if (!volumeBarEl.value) return playerStore.volume
  const rect = volumeBarEl.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

function onVolumeDragStart(e: MouseEvent) {
  isVolumeDragging = true
  document.addEventListener('mousemove', onVolumeDragMove)
  document.addEventListener('mouseup', onVolumeDragEnd)
  updateVolume(calcVolumeFromEvent(e))
}

function onVolumeTouchStart(e: TouchEvent) {
  isVolumeDragging = true
  document.addEventListener('touchmove', onVolumeDragMove, { passive: false })
  document.addEventListener('touchend', onVolumeDragEnd)
  updateVolume(calcVolumeFromEvent(e))
}

function onVolumeDragMove(e: Event) {
  if (!isVolumeDragging) return
  e.preventDefault()
  updateVolume(calcVolumeFromEvent(e as MouseEvent | TouchEvent))
}

function onVolumeDragEnd(_?: Event) {
  isVolumeDragging = false
  document.removeEventListener('mousemove', onVolumeDragMove)
  document.removeEventListener('mouseup', onVolumeDragEnd)
  document.removeEventListener('touchmove', onVolumeDragMove)
  document.removeEventListener('touchend', onVolumeDragEnd)
}

function updateVolume(vol: number) {
  playerStore.setVolume(vol)
}

// 组件卸载时清理所有残留的拖拽事件监听器
onUnmounted(() => {
  if (isDragging) isDragging = false
  if (isVolumeDragging) isVolumeDragging = false
  document.removeEventListener('mousemove', onProgressDragMove)
  document.removeEventListener('mouseup', onProgressDragEnd)
  document.removeEventListener('touchmove', onProgressDragMove)
  document.removeEventListener('touchend', onProgressDragEnd)
  document.removeEventListener('mousemove', onVolumeDragMove)
  document.removeEventListener('mouseup', onVolumeDragEnd)
  document.removeEventListener('touchmove', onVolumeDragMove)
  document.removeEventListener('touchend', onVolumeDragEnd)
})
</script>

<style scoped>
@reference "tailwindcss";

/* ===== Root Variables ===== */
.player-full {
  font-family: var(--font-sans);
  color: #F0F0F5;
}

/* ===== Background Image ===== */
.bg-image {
  filter: blur(80px) saturate(1.5) brightness(0.4);
  transform: scale(1.1);
  opacity: 0.6;
  transition: opacity 0.8s ease;
}

/* ===== Ambient Glow Effect ===== */
.ambient-glow {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 95, 0.08) 0%, transparent 70%);
  pointer-events: none;
  transition: opacity 0.6s ease;
  opacity: 0;
}

.ambient-glow.active {
  opacity: 1;
  animation: ambientPulse 4s ease-in-out infinite alternate;
}

@keyframes ambientPulse {
  0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
}

/* ===== Header ===== */
.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

/* Playing indicator dot */
.playing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #FF5A5F;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.playing-dot.active {
  opacity: 1;
  animation: dotBlink 2s ease-in-out infinite;
}

@keyframes dotBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ===== Vinyl Container ===== */
.vinyl-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* External glow ring */
.vinyl-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 95, 0.15) 0%, rgba(255, 90, 95, 0.05) 40%, transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.vinyl-glow.active {
  opacity: 1;
  animation: glowPulse 3s ease-in-out infinite alternate;
}

@keyframes glowPulse {
  0% { transform: translate(-50%, -50%) scale(0.98); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(1.06); opacity: 1; }
}

/* Main Disc */
.vinyl-disc {
  position: relative;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 120px rgba(255, 90, 95, 0.05);
  /* 动画始终生效，通过 play-state 控制暂停，避免暂停时 transform 回弹 */
  animation: vinylSpin 20s linear infinite;
  animation-play-state: paused;
}

.vinyl-disc.spinning {
  animation-play-state: running;
}

@keyframes vinylSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.disc-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #13131C 0%, #1a1a28 100%);
}

/* Center hole assembly */
.disc-center-hole {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #09090B;
  box-shadow:
    inset 0 2px 8px rgba(0, 0, 0, 0.6),
    0 0 0 4px rgba(15, 15, 20, 0.9),
    0 0 0 5px rgba(255, 255, 255, 0.04);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disc-center-inner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a2a38 0%, #1a1a26 100%);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

/* Vinyl groove texture overlay */
.disc-grooves {
  position: absolute;
  inset: 32px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0px,
    transparent 2px,
    rgba(255, 255, 255, 0.02) 2.5px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 2;
}

/* Bottom reflection */
.vinyl-reflection {
  position: absolute;
  bottom: -35px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 40px;
  background: radial-gradient(ellipse at center, rgba(255, 90, 95, 0.08), transparent 70%);
  filter: blur(12px);
  pointer-events: none;
  opacity: 0.6;
}

/* ===== Song Info ===== */
.song-info {
  padding-top: 8px;
  pointer-events: auto;
}

.song-title {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.song-artist {
  margin-top: 6px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.4;
}

.artist-link {
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  transition: color 0.2s ease;
}

.artist-link:hover {
  color: rgba(255, 255, 255, 0.85);
}

.song-album {
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.28);
}

.album-link {
  color: rgba(255, 255, 255, 0.35);
  text-decoration: none;
  transition: color 0.2s ease;
}

.album-link:hover {
  color: rgba(255, 255, 255, 0.7);
}

/* ===== Progress Section ===== */
.progress-section {
  padding-top: 4px;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 4px;
  cursor: pointer;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  transition: height 0.2s ease;
}

.progress-track:hover {
  height: 6px;
}

.progress-buffer {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
  width: 0%;
  pointer-events: none;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #FF5A5F, #FF7F66);
  transition: width 0.08s linear;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(255, 90, 95, 0.3);
}

.progress-track:active .progress-fill {
  transition: none;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 90, 95, 0.3);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  z-index: 2;
}

.progress-thumb.visible {
  transform: translate(-50%, -50%) scale(1);
}

.progress-tooltip {
  position: absolute;
  top: -32px;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(30, 30, 42, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
  pointer-events: none;
  z-index: 3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.progress-tooltip.dragging {
  background: rgba(255, 90, 95, 0.9);
  border-color: transparent;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
}

/* ===== Controls Row ===== */
.controls-row {
  padding-top: 4px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  transform: scale(1.06);
}

.ctrl-btn:active {
  transform: scale(0.94);
}

.ctrl-btn-sm {
  width: 2.25rem;
  height: 2.25rem;
}

/* Main Play Button */
.play-btn-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.75rem;
  height: 3.75rem;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #FF5A5F 0%, #E0484D 100%);
  color: #fff;
  cursor: pointer;
  box-shadow:
    0 4px 20px rgba(255, 90, 95, 0.4),
    0 0 0 0 rgba(255, 90, 95, 0);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.play-btn-main:hover {
  transform: scale(1.07);
  box-shadow:
    0 6px 28px rgba(255, 90, 95, 0.5),
    0 0 0 4px rgba(255, 90, 95, 0.12);
}

.play-btn-main:active {
  transform: scale(0.96);
}

.play-icon,
.pause-icon {
  width: 1.5rem;
  height: 1.5rem;
  z-index: 2;
}

/* Pulse ring when playing */
.pulse-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid rgba(255, 90, 95, 0.3);
  animation: playPulse 2s ease-out infinite;
  pointer-events: none;
}

@keyframes playPulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.text-coral {
  color: #FF5A5F;
}

/* ===== Volume Row ===== */
.volume-row {
  padding-top: 2px;
}

.vol-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.vol-btn:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.06);
}

.volume-track {
  position: relative;
  width: 100%;
  height: 3px;
  cursor: pointer;
  border-radius: 2px;
  transition: height 0.2s ease;
}

.volume-track:hover {
  height: 5px;
}

.volume-track-bg {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.volume-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #FF5A5F, #FF7F66);
  transition: width 0.05s linear;
  pointer-events: none;
}

.volume-track:active .volume-fill {
  transition: none;
}

.volume-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.05s linear;
  pointer-events: none;
  z-index: 2;
}

.volume-thumb.visible {
  transform: translate(-50%, -50%) scale(1);
}

/* ===== Lyrics Panel ===== */
.glass-panel {
  background: rgba(12, 12, 18, 0.65);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
}

.lyric-panel {
  animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ===== Responsive: Mobile / Tablet ===== */
@media (max-width: 900px) {
  .player-full main {
    flex-direction: column;
    overflow-y: auto;
  }

  .lyric-panel {
    width: 100% !important;
    max-height: 40vh;
    border-left: none !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .vinyl-disc {
    width: 220px;
    height: 220px;
  }

  .vinyl-glow {
    width: 260px;
    height: 260px;
  }

  .ambient-glow {
    width: 400px;
    height: 400px;
  }

  .song-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .vinyl-disc {
    width: 180px;
    height: 180px;
  }

  .vinyl-glow {
    width: 220px;
    height: 220px;
  }

  .disc-center-hole {
    width: 48px;
    height: 48px;
  }

  .play-btn-main {
    width: 3.25rem;
    height: 3.25rem;
  }

  .ctrl-btn {
    width: 2.5rem;
    height: 2.5rem;
  }

  .song-info {
    padding: 0 1rem;
  }

  .progress-section,
  .volume-row {
    padding: 0 1rem;
  }
}
</style>
