<template>
  <div
    class="player-full fixed inset-0 z-50 flex flex-col overflow-hidden"
    :style="{ '--accent-color': accentColor, '--accent-rgb': accentRgb }"
    @click="showLyricsSettings = false"
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
    <header class="relative flex items-center justify-between px-4 py-3 md:px-6 md:py-4" style="-webkit-app-region: drag;">
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
        <span class="max-md:hidden whitespace-nowrap text-xs font-medium tracking-wider text-white/60 uppercase">Now Playing</span>
      </div>
      <!-- 功能按钮组 -->
      <div class="flex items-center gap-1" style="-webkit-app-region: no-drag;">
        <!-- 显示模式切换 -->
        <div class="flex items-center rounded-full bg-white/10 p-0.5">
          <button
            v-for="mode in displayModes"
            :key="mode.value"
            class="display-mode-btn"
            :class="{ active: displayMode === mode.value }"
            :title="mode.label"
            @click="displayMode = mode.value"
          >
            <component :is="mode.icon" class="h-4 w-4" />
          </button>
        </div>
        <!-- 音频可视化 -->
        <button class="header-icon-btn" :class="{ active: showVisualizer }" title="音频可视化" @click="showVisualizer = !showVisualizer">
          <Activity class="h-4 w-4" />
        </button>
        <!-- 睡眠定时 -->
        <button class="header-icon-btn relative" :class="{ active: sleepTimerEnabled }" :title="sleepTimerEnabled ? `睡眠定时：${sleepTimerLabel}` : '睡眠定时'" @click="showSleepTimer = !showSleepTimer">
          <Timer class="h-4 w-4" />
          <span v-if="sleepTimerEnabled" class="timer-dot" />
        </button>
        <!-- 歌曲详情 -->
        <button class="header-icon-btn" title="歌曲详情" @click="showSongDetail = !showSongDetail">
          <Info class="h-4 w-4" />
        </button>
        <!-- 分享 -->
        <button class="header-icon-btn" title="分享" @click="handleShare">
          <Share2 class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- Main Content - 网易云布局：上下结构 -->
    <main class="relative flex min-h-0 flex-1 flex-col overflow-hidden" :class="`mode-${displayMode}`">
      <!-- 上半部分：左右布局 -->
      <div class="content-top relative flex flex-1 min-h-0">
        <!-- 音频可视化 Canvas -->
        <canvas
          v-if="showVisualizer"
          ref="visualizerCanvas"
          class="visualizer-canvas"
        />
        <!-- 左侧：唱片封面（纯歌词模式隐藏） -->
        <section v-if="displayMode !== 'lyrics'" class="cover-section flex items-center justify-center" :class="{ 'cover-only': displayMode === 'cover' }">
          <div class="vinyl-container">
            <div class="vinyl-glow" :class="{ active: playerStore.playing }" />
            <div class="vinyl-disc" :class="{ spinning: playerStore.playing }">
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
              <div class="disc-center-hole">
                <div class="disc-center-inner" />
              </div>
              <div class="disc-grooves" />
            </div>
            <div class="vinyl-reflection" />
          </div>
        </section>

        <!-- 右侧：歌词面板 -->
        <aside class="lyrics-section" :class="{ 'lyrics-only': displayMode === 'lyrics' }">
          <!-- 歌曲标题和艺术家 -->
          <div class="lyrics-header">
            <div class="lyrics-title-row">
              <h1 class="lyrics-song-title">{{ playerStore.currentSong?.name || '未在播放' }}</h1>
              <button class="lyrics-settings-btn" @click.stop="showLyricsSettings = !showLyricsSettings" title="歌词设置">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <!-- 歌词设置面板 -->
              <div v-if="showLyricsSettings" class="lyrics-settings-panel" @click.stop>
                <!-- 显示模式 -->
                <div class="settings-section">
                  <div class="settings-section-title">显示模式</div>
                  <div class="display-mode-segment">
                    <button
                      v-for="m in displayModeOptions"
                      :key="m.value"
                      class="segment-btn"
                      :class="{ active: lyricsStore.displayMode === m.value }"
                      @click="lyricsStore.setDisplayMode(m.value)"
                    >
                      <component :is="m.icon" class="h-3.5 w-3.5" />
                      <span>{{ m.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="settings-divider" />

                <!-- 翻译 / 罗马音 -->
                <div class="settings-section">
                  <div class="settings-row">
                    <span class="settings-row-label">翻译</span>
                    <button
                      class="toggle-switch"
                      :class="{ active: lyricsStore.showTranslation }"
                      @click="lyricsStore.toggleTranslation()"
                    >
                      <span class="toggle-knob" />
                    </button>
                  </div>
                  <div class="settings-row">
                    <span class="settings-row-label">罗马音</span>
                    <button
                      class="toggle-switch"
                      :class="{ active: lyricsStore.showRomanized }"
                      @click="lyricsStore.toggleRomanized()"
                    >
                      <span class="toggle-knob" />
                    </button>
                  </div>
                </div>

                <div class="settings-divider" />

                <!-- 字号 -->
                <div class="settings-section">
                  <div class="settings-row">
                    <span class="settings-row-label">字号</span>
                    <div class="font-size-control">
                      <button class="font-size-btn" @click="lyricsStore.setFontSize(Math.max(12, lyricsStore.fontSize - 2))">
                        <Minus class="h-3 w-3" />
                      </button>
                      <span class="font-size-value">{{ lyricsStore.fontSize }}</span>
                      <button class="font-size-btn" @click="lyricsStore.setFontSize(Math.min(28, lyricsStore.fontSize + 2))">
                        <Plus class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p class="lyrics-song-artist">
              <template v-if="playerStore.currentSong?.artists?.length">
                <template v-for="(artist, idx) in playerStore.currentSong.artists" :key="artist.id">
                  <router-link :to="`/artist/${artist.id}`" class="artist-link">{{ artist.name }}</router-link>
                  <span v-if="idx < playerStore.currentSong.artists.length - 1" class="mx-1"> / </span>
                </template>
              </template>
              <span v-else>--</span>
            </p>
          </div>

          <!-- 歌词显示 -->
          <div class="lyrics-display-wrapper">
            <LyricsDisplay
              :lyrics="lyricsStore.lines"
              :current-index="lyricsStore.currentIndex"
              :current-line="lyricsStore.currentLine"
              :prev-line="lyricsStore.prevLine"
              :next-line="lyricsStore.nextLine"
              :mode="lyricsStore.effectiveMode"
              :font-size="lyricsStore.fontSize"
              :show-translation="lyricsStore.showTranslation"
              :show-romanized="lyricsStore.showRomanized"
              :loading="lyricsStore.loading"
              :error="lyricsStore.error"
              @line-click="handleLyricSeek"
            />
          </div>
        </aside>
      </div>

      <!-- 下半部分：播放控制区 -->
      <div class="controls-bottom">
        <!-- 进度条 -->
        <div class="progress-wrapper">
          <span class="time-current">{{ formatTime(playerStore.currentTime) }}</span>
          <div
            ref="progressBarEl"
            class="progress-track"
            @mousedown="onProgressDragStart"
            @touchstart.prevent="onProgressTouchStart"
            @mouseenter="isProgressHovered = true"
            @mouseleave="isProgressHovered = false"
            @mousemove="onProgressHoverMove"
          >
            <div class="progress-buffer" :style="bufferStyle" />
            <div class="progress-fill" :style="progressStyle" />
            <div
              class="progress-thumb"
              :class="{ visible: isDragging || isProgressHovered }"
              :style="progressThumbStyle"
            />
            <div
              v-if="isProgressHovered && !isDragging"
              class="progress-tooltip"
              :style="hoverTooltipStyle"
            >
              {{ formatTime(hoverTime) }}
            </div>
            <div
              v-if="isDragging"
              class="progress-tooltip dragging"
              :style="dragTooltipStyle"
            >
              {{ formatTime(dragTime) }}
            </div>
          </div>
          <span class="time-duration">{{ formatTime(playerStore.duration) }}</span>
        </div>

        <!-- 控制按钮 -->
        <div class="controls-bar">
          <div class="controls-left">
            <button class="ctrl-btn-icon" @click="playerStore.togglePlayMode" :title="playModeLabel">
              <div class="relative">
                <component :is="playModeIcon" class="h-5 w-5" />
                <span v-if="playerStore.playMode === 'loopOne'" class="loop-one-badge">1</span>
              </div>
            </button>
            <button class="ctrl-btn-icon" @click="handleLike" :title="isLiked ? '取消喜欢' : '喜欢'">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="[isLiked ? 'text-coral' : '']" :fill="isLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          <div class="controls-center">
            <button class="ctrl-btn-icon" @click="playerStore.playPrev" title="上一首">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button class="play-btn-large" @click="playerStore.togglePlaying">
              <svg v-if="!playerStore.playing" xmlns="http://www.w3.org/2000/svg" class="play-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="pause-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>

            <button class="ctrl-btn-icon" @click="playerStore.playNext" title="下一首">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div class="controls-right">
            <button
              v-if="hasDesktopLyrics"
              class="ctrl-btn-icon"
              :class="{ 'is-active': lyricsWindowOpen }"
              :title="lyricsWindowOpen ? '关闭桌面歌词' : '桌面歌词'"
              @click="toggleDesktopLyrics"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </button>

            <button class="ctrl-btn-icon" @click="showQueue = true" title="播放队列">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h10m-10 4h6" />
              </svg>
            </button>

            <button class="ctrl-btn-icon mute-btn" @click="toggleMute" :title="playerStore.muted ? '取消静音' : '静音'">
              <svg v-if="playerStore.muted" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 6l-4 4H4v4h4l4 4V6z" />
              </svg>
            </button>

            <div
              ref="volumeBarEl"
              class="volume-slider"
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
          </div>
        </div>
      </div>
    </main>

    <!-- 睡眠定时器弹窗 -->
    <Transition name="slide-up">
      <div v-if="showSleepTimer" class="sleep-timer-panel" @click.self="showSleepTimer = false">
        <div class="sleep-timer-content">
          <div class="panel-header">
            <h3 class="panel-title">睡眠定时</h3>
            <button class="panel-close" @click="showSleepTimer = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="sleep-timer-body">
            <div v-if="sleepTimerEnabled" class="timer-countdown">
              <Timer class="h-8 w-8 text-[#FF5A5F]" />
              <span class="timer-countdown-text">{{ sleepTimerLabel }}后停止播放</span>
            </div>
            <div class="timer-presets">
              <button class="timer-preset-btn" @click="startSleepTimer(15)">15 分钟</button>
              <button class="timer-preset-btn" @click="startSleepTimer(30)">30 分钟</button>
              <button class="timer-preset-btn" @click="startSleepTimer(60)">60 分钟</button>
              <button class="timer-preset-btn" @click="startSleepTimer(90)">90 分钟</button>
            </div>
            <div class="timer-custom">
              <input
                v-model.number="customSleepMinutes"
                type="number"
                min="1"
                max="720"
                placeholder="自定义分钟数"
                class="timer-custom-input"
              />
              <button class="timer-custom-btn" @click="startCustomSleepTimer">开始</button>
            </div>
            <button
              v-if="sleepTimerEnabled"
              class="timer-cancel-btn"
              @click="cancelSleepTimer"
            >
              取消定时
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 歌曲详情弹窗 -->
    <Transition name="slide-up">
      <div v-if="showSongDetail" class="song-detail-panel" @click.self="showSongDetail = false">
        <div class="song-detail-content">
          <div class="detail-header">
            <h3 class="detail-title">歌曲详情</h3>
            <button class="detail-close" @click="showSongDetail = false">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div v-if="songDetailLoading" class="detail-loading">
            <LoadingSpinner />
          </div>
          <div v-else-if="songDetail" class="detail-body">
            <div class="detail-info">
              <div class="detail-row">
                <span class="detail-label">歌曲名称</span>
                <span class="detail-value">{{ songDetail.name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">歌手</span>
                <span class="detail-value">{{ songDetail.ar?.map((a: any) => a.name).join(' / ') }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">专辑</span>
                <span class="detail-value">{{ songDetail.al?.name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">发行时间</span>
                <span class="detail-value">{{ formatPublishTime(songDetail.publishTime) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">歌曲时长</span>
                <span class="detail-value">{{ formatTime(songDetail.dt / 1000) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">歌曲 ID</span>
                <span class="detail-value">{{ songDetail.id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

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
      @save-as-playlist="handleSaveAsPlaylist"
      @restore-queue="handleRestoreQueue"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'
import { useUserStore } from '@/stores/user'
import { useAudio } from '@/composables/useAudio'
import { formatTime } from '@/utils/format'
import { getSongDetail } from '@/api/song'
import { logger } from '@/utils/logger'
import LyricsDisplay from '@/components/lyrics/LyricsDisplay.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PlayQueue from './PlayQueue.vue'
import { useLyricsSync } from '@/composables/useLyricsSync'
import { Disc3, AlignLeft, Image as ImageIcon, Activity, Info, Share2, X, Timer, Shuffle, Repeat, ArrowRight, RotateCcw, AlignCenter, AlignJustify, Minus, Plus } from 'lucide-vue-next'
import { usePlatform } from '@/composables/usePlatform'

const emitClose = defineEmits<{
  close: []
}>()

const playerStore = usePlayerStore()
const lyricsStore = useLyricsStore()
const userStore = useUserStore()
const { seek, seekByProgress } = useAudio()
// Web 端无桌面歌词独立窗口，按钮按平台能力隐藏
const { hasDesktopLyrics } = usePlatform()

// 歌词加载由 AppLayout 中的 useAutoLoadLyrics 全局统一处理，
// 这里不再重复加载：两套加载器会争抢同一个 lyricsStore，互相 resetForTrack 清空歌词。
const { seekToIndex } = useLyricsSync()

function handleLyricSeek(index: number) {
  seekToIndex(index)
}

// UI State
const showQueue = ref(false)
const showLyricsSettings = ref(false)
const wasPlaying = ref(false)

// === 高优先级功能新增 ===
// 显示模式：vinyl(黑胶) / lyrics(纯歌词) / cover(封面)
type DisplayMode = 'vinyl' | 'lyrics' | 'cover'
const displayMode = ref<DisplayMode>('vinyl')
const displayModes = [
  { value: 'vinyl' as const, label: '黑胶模式', icon: Disc3 },
  { value: 'lyrics' as const, label: '纯歌词模式', icon: AlignLeft },
  { value: 'cover' as const, label: '封面模式', icon: ImageIcon },
]

// 音频可视化
const showVisualizer = ref(false)
const visualizerCanvas = ref<HTMLCanvasElement>()
let visualizerAnimId: number | null = null
let audioAnalyserData: Uint8Array | null = null

// 歌曲详情
const showSongDetail = ref(false)
const songDetail = ref<any>(null)
const songDetailLoading = ref(false)

// 分享提示
const shareToast = ref(false)

// === 睡眠定时器 ===
const showSleepTimer = ref(false)
const customSleepMinutes = ref<number | null>(30)

const sleepTimerEnabled = computed(() => playerStore.sleepTimerDeadline !== null)
const sleepTimerLabel = computed(() => {
  const deadline = playerStore.sleepTimerDeadline
  if (!deadline) return '未开启'
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return minutes > 0 ? `${minutes}分${String(seconds).padStart(2, '0')}秒` : `${seconds}秒`
})

function startSleepTimer(minutes: number) {
  playerStore.setSleepTimer(minutes)
  showSleepTimer.value = false
}

function startCustomSleepTimer() {
  const minutes = Number(customSleepMinutes.value)
  if (!Number.isFinite(minutes) || minutes <= 0) return
  startSleepTimer(minutes)
}

function cancelSleepTimer() {
  playerStore.clearSleepTimer()
  showSleepTimer.value = false
}

// Progress Bar State
const progressBarEl = ref<HTMLElement>()
let isDragging = false
let dragProgress = 0
let dragTime = 0
const isProgressHovered = ref(false)
const hoverProgress = ref(0)
const hoverTime = ref(0)
const displayProgress = computed(() =>
  isDragging ? dragProgress : playerStore.progress
)

// 动态样式（避免模板内联表达式解析问题）
const progressStyle = computed(() => ({ width: displayProgress.value * 100 + '%' }))
const progressThumbStyle = computed(() => ({ left: displayProgress.value * 100 + '%' }))
const bufferStyle = computed(() => ({ width: playerStore.bufferedProgress * 100 + '%' }))
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
  const icons: Record<string, any> = {
    sequence: ArrowRight,
    loop: Repeat,
    random: Shuffle,
    loopOne: Repeat,
    reversed: RotateCcw,
  }
  return icons[playerStore.playMode] || ArrowRight
})

const playModeLabel = computed(() => {
  const labels: Record<string, string> = {
    sequence: '顺序播放', loop: '列表循环', random: '随机播放',
    loopOne: '单曲循环', reversed: '倒序播放'
  }
  return labels[playerStore.playMode]
})

// 歌词显示模式选项
const displayModeOptions = [
  { value: 'compact' as const, label: '单行', icon: AlignLeft },
  { value: 'normal' as const, label: '三行', icon: AlignCenter },
  { value: 'expanded' as const, label: '全部', icon: AlignJustify },
]

// Accent color derived from cover
const accentColorRef = ref('#FF5A5F')
const accentRgbRef = ref('255, 90, 95')
const accentColor = computed(() => accentColorRef.value)
const accentRgb = computed(() => accentRgbRef.value)

let accentColorImg: HTMLImageElement | null = null
function extractAccentColor(imgUrl: string) {
  if (!imgUrl) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // 缩小到 20x20 加速计算
      canvas.width = 20
      canvas.height = 20
      ctx.drawImage(img, 0, 0, 20, 20)
      const data = ctx.getImageData(0, 0, 20, 20).data
      let r = 0, g = 0, b = 0, count = 0
      // 采样：跳过过暗和过亮的像素
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i], pg = data[i + 1], pb = data[i + 2]
        const brightness = (pr + pg + pb) / 3
        if (brightness < 20 || brightness > 235) continue
        r += pr; g += pg; b += pb; count++
      }
      if (count > 0) {
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        // 增加饱和度，让颜色更鲜明
        const avg = (r + g + b) / 3
        r = Math.round(avg + (r - avg) * 1.4)
        g = Math.round(avg + (g - avg) * 1.4)
        b = Math.round(avg + (b - avg) * 1.4)
        r = Math.min(255, Math.max(0, r))
        g = Math.min(255, Math.max(0, g))
        b = Math.min(255, Math.max(0, b))
        accentColorRef.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        accentRgbRef.value = `${r}, ${g}, ${b}`
      }
    } catch {
      // 跨域或其他错误，保持默认色
    }
  }
  img.onerror = () => {}
  img.src = imgUrl
  accentColorImg = img
}

// 切换歌曲时提取主题色
watch(
  () => playerStore.currentSong?.album?.picUrl,
  (picUrl) => {
    if (picUrl) {
      extractAccentColor(picUrl + '?param=200y200')
    }
  },
  { immediate: true }
)

// === Actions ===
// 静音统一走 store 的 muted 标志（与底栏、快捷键一致），音量值在静音期间保留
function toggleMute() {
  playerStore.toggleMute()
}

function handleLike() {
  if (playerStore.currentSong) {
    userStore.toggleLike(playerStore.currentSong.id)
  }
}

// === 高优先级功能方法 ===

// 获取歌曲详情
async function fetchSongDetail() {
  if (!playerStore.currentSong) return
  songDetailLoading.value = true
  try {
    const res: any = await getSongDetail(playerStore.currentSong.id)
    if (res?.songs?.length > 0) {
      songDetail.value = res.songs[0]
    }
  } catch (e) {
    logger.error('player', 'Failed to fetch song detail:', e)
  } finally {
    songDetailLoading.value = false
  }
}

// 监听歌曲详情弹窗显示
watch(showSongDetail, (val) => {
  if (val && !songDetail.value) {
    fetchSongDetail()
  }
})

// 切换歌曲时重置歌曲详情
watch(
  () => playerStore.currentSong?.id,
  () => {
    songDetail.value = null
  }
)

// 格式化发布时间
function formatPublishTime(timestamp: number): string {
  if (!timestamp) return '--'
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 分享功能
async function handleShare() {
  if (!playerStore.currentSong) return
  const song = playerStore.currentSong
  const shareText = `🎵 ${song.name} - ${song.artists?.map((a: any) => a.name).join(' / ')}`
  // Web 端分享本站歌曲深链（/song/:id，打开即定位到该歌曲页）；
  // Electron 桌面端的 origin 是 file://（打包）或 localhost（开发），不是可访问的站点，回退网易云歌曲页
  const origin = window.location.origin
  const isSiteOrigin = /^https?:\/\//.test(origin) && !/localhost|127\.0\.0\.1/.test(origin)
  const shareUrl = !(window as any).electronAPI && isSiteOrigin ? `${origin}/song/${song.id}` : `https://music.163.com/song?id=${song.id}`

  try {
    // 优先使用系统分享（如果支持）
    if (navigator.share) {
      await navigator.share({
        title: song.name,
        text: shareText,
        url: shareUrl,
      })
      return
    }
  } catch (e) {
    // 用户取消分享，不处理
  }

  // 复制到剪贴板
  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
    showShareToast('分享链接已复制到剪贴板')
  } catch (e) {
    // 降级方案：使用 textarea
    const textarea = document.createElement('textarea')
    textarea.value = `${shareText}\n${shareUrl}`
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    showShareToast('分享链接已复制到剪贴板')
  }
}

function showShareToast(msg: string) {
  // 简单的 toast 提示
  const toast = document.createElement('div')
  toast.className = 'share-toast'
  toast.textContent = msg
  toast.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.8); color: white; padding: 10px 20px;
    border-radius: 8px; font-size: 14px; z-index: 9999;
    transition: opacity 0.3s;
  `
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => document.body.removeChild(toast), 300)
  }, 2000)
}

// === 音频可视化 ===
// 音频可视化：使用从音频引擎获取的真实频率数据
let visualizerResize: (() => void) | null = null

function startVisualizer() {
  if (!visualizerCanvas.value) return
  const canvas = visualizerCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  visualizerResize = () => {
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
  }
  visualizerResize()
  window.addEventListener('resize', visualizerResize)

  const bars = 64
  const barWidth = canvas.width / bars

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 获取真实频率数据（从音频引擎通过 IPC 传递）
    const freqData = playerStore.frequencyData
    const hasRealData = freqData && freqData.length > 0 && playerStore.playing

    if (hasRealData) {
      // 使用真实频率数据
      // 频率数据是 Uint8Array(128)，值 0-255，我们采样前 64 个点
      for (let i = 0; i < bars; i++) {
        // 从 128 个频率点中采样 64 个（取偶数索引）
        const freqIndex = Math.floor(i * (freqData.length / bars))
        const value = freqData[freqIndex] ?? 0
        // 归一化到 0-1，增加一点灵敏度
        const normalized = Math.min(1, value / 200)
        const height = Math.max(canvas.height * 0.03, normalized * canvas.height * 0.85)

        const x = i * barWidth
        const y = canvas.height - height

        // 渐变颜色
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height)
        gradient.addColorStop(0, `rgba(${accentRgb.value}, 0.9)`)
        gradient.addColorStop(1, `rgba(${accentRgb.value}, 0.2)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x + 2, y, barWidth - 4, height, 3)
        ctx.fill()
      }
    } else {
      // 暂停或无数据时显示静态低条
      for (let i = 0; i < bars; i++) {
        const height = canvas.height * 0.05
        const x = i * barWidth
        const y = canvas.height - height
        ctx.fillStyle = `rgba(${accentRgb.value}, 0.3)`
        ctx.beginPath()
        ctx.roundRect(x + 2, y, barWidth - 4, height, 3)
        ctx.fill()
      }
    }

    visualizerAnimId = requestAnimationFrame(draw)
  }

  draw()
}

function stopVisualizer() {
  if (visualizerAnimId) {
    cancelAnimationFrame(visualizerAnimId)
    visualizerAnimId = null
  }
  if (visualizerResize) {
    window.removeEventListener('resize', visualizerResize)
    visualizerResize = null
  }
}

watch(showVisualizer, (val) => {
  if (val) {
    nextTick(() => startVisualizer())
  } else {
    stopVisualizer()
  }
})

onUnmounted(() => {
  stopVisualizer()
  window.removeEventListener('keydown', handleEscKeydown, true)
})

// Esc 关闭全屏播放器。
// 使用 capture 阶段 + stopPropagation，避免同一按键同时触发
// 底栏 AppPlayer 的 Esc 处理器（否则会一次关掉两层）。
function handleEscKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  e.stopPropagation()
  emitClose('close')
}
window.addEventListener('keydown', handleEscKeydown, true)

/** 桌面歌词窗口是否打开（驱动按钮高亮） */
const lyricsWindowOpen = ref(false)

async function toggleDesktopLyrics() {
  try {
    if (!window.electronAPI?.openLyricsWindow) {
      logger.warn('player', 'electronAPI.openLyricsWindow not available')
      return
    }
    if (lyricsWindowOpen.value) {
      await window.electronAPI.closeLyricsWindow()
      lyricsWindowOpen.value = false
    } else {
      await window.electronAPI.openLyricsWindow()
      lyricsWindowOpen.value = true
    }
  } catch (e) {
    logger.error('player', 'toggleDesktopLyrics failed:', e)
  }
}

onMounted(async () => {
  try {
    lyricsWindowOpen.value = (await window.electronAPI?.isLyricsWindowOpen?.()) ?? false
  } catch {
    // 查询失败不影响按钮可用性
  }
})

function handleRemoveDuplicates() {
  const removedCount = playerStore.removeDuplicates()
  if (removedCount > 0) {
    logger.debug('player', `Removed ${removedCount} duplicate songs`)
  }
}

async function handleSaveAsPlaylist() {
  const playlistName = prompt('请输入歌单名称', `播放队列 ${new Date().toLocaleDateString()}`)
  if (!playlistName || !playlistName.trim()) return

  try {
    // 获取当前播放列表的歌曲 ID
    const trackIds = playerStore.playlist.map(song => song.id)

    if (trackIds.length === 0) {
      alert('播放列表为空')
      return
    }

    // 调用创建歌单 API
    const { createPlaylist, addTracksToPlaylist } = await import('@/api/playlist')
    const result = await createPlaylist(playlistName.trim())

    if (result && result.id) {
      // 添加歌曲到歌单
      await addTracksToPlaylist(result.id, trackIds)
      alert(`成功创建歌单「${playlistName}」，已添加 ${trackIds.length} 首歌曲`)
    }
  } catch (error) {
    logger.error('player', 'Failed to save playlist:', error)
    alert('保存歌单失败，请重试')
  }
}

function handleRestoreQueue(playlist: any[], currentIndex: number) {
  if (confirm(`确定要恢复这个队列吗？当前队列将被替换。`)) {
    playerStore.setPlaylist(playlist, currentIndex)
    if (playlist.length > 0 && currentIndex >= 0 && currentIndex < playlist.length) {
      playerStore.playSong(playlist[currentIndex])
    }
  }
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
  // 静音状态下拖动音量视为解除静音
  if (vol > 0 && playerStore.muted) playerStore.toggleMute()
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
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.12) 0%, transparent 70%);
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
  background: var(--accent-color);
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

/* ===== Header 功能按钮 ===== */
.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.header-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.header-icon-btn.active {
  color: var(--accent-color);
  background: rgba(var(--accent-rgb), 0.15);
}

/* 显示模式切换 */
.display-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.display-mode-btn:hover {
  color: #fff;
}

.display-mode-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* ===== 音频可视化 ===== */
.visualizer-canvas {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
}

/* ===== 显示模式布局 ===== */
.mode-lyrics .cover-section {
  display: none;
}

.mode-lyrics .lyrics-section {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.mode-cover .cover-section {
  flex: 1;
}

.mode-cover .lyrics-section {
  width: 320px;
  flex-shrink: 0;
}

.cover-only .vinyl-container {
  transform: scale(1.3);
}

.lyrics-only .lyrics-display-wrapper {
  max-height: calc(100vh - 280px);
}

/* ===== 歌曲详情弹窗 ===== */
.song-detail-panel {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-detail-content {
  background: rgba(30, 30, 45, 0.95);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.detail-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

.detail-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.detail-body {
  padding: 20px;
}

.detail-info {
  min-width: 0;
}

.detail-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  width: 70px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.detail-value {
  flex: 1;
  color: #fff;
  font-size: 13px;
  word-break: break-all;
}

.detail-loading {
  padding: 40px;
  display: flex;
  justify-content: center;
}

/* ===== 通用弹窗面板 ===== */
.sleep-timer-panel {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sleep-timer-content {
  background: rgba(30, 30, 45, 0.95);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 85vh;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

.panel-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* ===== 睡眠定时器 ===== */
.timer-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #FF5A5F;
}

.sleep-timer-body {
  padding: 20px;
}

.timer-countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  margin-bottom: 20px;
  background: rgba(255, 90, 95, 0.1);
  border-radius: 12px;
}

.timer-countdown-text {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
}

.timer-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.timer-preset-btn {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.timer-preset-btn:hover {
  border-color: #FF5A5F;
  background: rgba(255, 90, 95, 0.1);
  color: #FF5A5F;
}

.timer-custom {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.timer-custom-input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

/* 触屏设备：iOS 聚焦 <16px 输入框会自动放大页面且失焦不恢复，字号需提到 16px */
@media (pointer: coarse) {
  .timer-custom-input {
    font-size: 16px;
  }
}

.timer-custom-input:focus {
  border-color: #FF5A5F;
}

.timer-custom-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.timer-custom-btn {
  padding: 0 20px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: #FF5A5F;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.timer-custom-btn:hover {
  background: #E0484D;
}

.timer-cancel-btn {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.timer-cancel-btn:hover {
  border-color: rgba(255, 90, 95, 0.5);
  color: #FF5A5F;
}

/* ===== 过渡动画 ===== */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.25s ease;
}

.slide-up-enter-active .song-detail-content,
.slide-up-leave-active .song-detail-content,
.slide-up-enter-active .sleep-timer-content,
.slide-up-leave-active .sleep-timer-content {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-from .song-detail-content,
.slide-up-leave-to .song-detail-content,
.slide-up-enter-from .sleep-timer-content,
.slide-up-leave-to .sleep-timer-content {
  transform: translateY(20px);
  opacity: 0;
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
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.15) 0%, rgba(var(--accent-rgb), 0.05) 40%, transparent 70%);
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
    0 0 120px rgba(var(--accent-rgb), 0.05);
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
  background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.08), transparent 70%);
  filter: blur(12px);
  pointer-events: none;
  opacity: 0.6;
}

/* ===== Main Content Layout - 网易云风格 ===== */
.content-top {
  padding: 0;
  gap: 0;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.cover-section {
  flex: 0 0 42%;
  padding: 40px 40px 40px 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lyrics-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 60px 60px 40px 40px;
  position: relative;
}

/* 歌词区域标题 */
.lyrics-header {
  position: relative;
  margin-bottom: 24px;
  text-align: center;
}

.lyrics-song-title {
  font-size: 24px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.lyrics-song-artist {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.lyrics-song-artist .artist-link {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;
}

.lyrics-song-artist .artist-link:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* 歌词标题行 */
.lyrics-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  width: fit-content;
  margin: 0 auto;
}

.lyrics-settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.lyrics-settings-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

/* 歌词设置面板 */
.lyrics-settings-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  padding: 14px;
  background: rgba(18, 18, 28, 0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.3);
  z-index: 100;
  min-width: 240px;
  text-align: left;
  animation: settingsFadeIn 0.2s ease;
}

@keyframes settingsFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.settings-section {
  padding: 4px 0;
}

.settings-section-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.settings-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 10px 0;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.settings-row-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

/* 显示模式分段控件 */
.display-mode-segment {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.segment-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.segment-btn.active {
  background: var(--accent-color);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Toggle 开关 */
.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: background 0.25s ease;
  padding: 0;
  flex-shrink: 0;
}

.toggle-switch.active {
  background: var(--accent-color);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(18px);
}

/* 字号控制 */
.font-size-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.font-size-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.font-size-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.font-size-value {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  min-width: 22px;
  text-align: center;
}

/* 歌词显示区域 */
.lyrics-display-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ===== Bottom Controls Area ===== */
.controls-bottom {
  flex-shrink: 0;
  padding: 0 60px 32px;
  background: transparent;
}

.bottom-song-info {
  text-align: center;
  margin-bottom: 12px;
}

.bottom-song-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px 0;
}

.bottom-song-artist {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.bottom-song-artist .artist-link {
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  transition: color 0.2s ease;
}

.bottom-song-artist .artist-link:hover {
  color: rgba(255, 255, 255, 0.75);
}

/* ===== Progress Section ===== */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 0;
}

.time-current,
.time-duration {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
  min-width: 40px;
}

.time-current {
  text-align: right;
}

.time-duration {
  text-align: left;
}

.progress-track {
  position: relative;
  flex: 1;
  height: 3px;
  cursor: pointer;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  transition: transform 0.2s ease;
  transform-origin: center;
}

.progress-track:hover {
  transform: scaleY(1.33);
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
  background: var(--accent-color);
  transition: width 0.08s linear;
  pointer-events: none;
}

.progress-track:active .progress-fill {
  transition: none;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
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
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: rgba(30, 30, 42, 0.95);
  backdrop-filter: blur(12px);
  white-space: nowrap;
  pointer-events: none;
  z-index: 3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.progress-tooltip.dragging {
  background: rgba(var(--accent-rgb), 0.95);
}

/* ===== Controls Bar ===== */
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.controls-right {
  justify-content: flex-end;
}

.controls-center {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.ctrl-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-btn-icon:hover {
  color: rgba(255, 255, 255, 0.9);
}

/* 已启用的桌面能力（如桌面歌词窗口已打开） */
.ctrl-btn-icon.is-active {
  color: #ff5a5f;
}

.ctrl-btn-icon.is-active:hover {
  color: #ff5a5f;
}

.loop-one-badge {
  position: absolute;
  bottom: -2px;
  right: -4px;
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1;
}

/* Main Play Button */
.play-btn-large {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent-color);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.3);
  transition: all 0.2s ease;
}

.play-btn-large:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(var(--accent-rgb), 0.4);
}

.play-btn-large:active {
  transform: scale(0.98);
}

.play-icon,
.pause-icon {
  width: 20px;
  height: 20px;
}

.text-coral {
  color: var(--accent-color);
}

/* ===== Volume Control ===== */
.volume-slider {
  position: relative;
  width: 100px;
  height: 3px;
  cursor: pointer;
  border-radius: 2px;
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
  background: var(--accent-color);
  transition: width 0.05s linear;
  pointer-events: none;
}

.volume-slider:active .volume-fill {
  transition: none;
}

.volume-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
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

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Responsive: Mobile / Tablet ===== */
@media (max-width: 900px) {
  .content-top {
    flex-direction: column;
    padding: 16px 24px 0;
  }

  .cover-section,
  .lyrics-section {
    max-width: 100%;
    padding: 0;
  }

  .lyrics-section {
    margin-top: 20px;
    max-height: 40vh;
  }

  /* 移动端纯歌词模式：隐藏封面后，歌词区域应填满 content-top 剩余空间，
     而不是被 max-height: 40vh 截断导致大片空白。 */
  .mode-lyrics .lyrics-section {
    flex: 1 1 auto;
    max-height: none;
    height: 100%;
    margin-top: 0;
    padding: 0 16px 8px;
  }

  .mode-lyrics .lyrics-display-wrapper {
    max-height: none;
  }

  .controls-bottom {
    padding: 16px 24px 24px;
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
}

@media (min-width: 1400px) {
  .content-top {
    padding: 32px 80px 0;
  }

  .controls-bottom {
    padding: 24px 100px 40px;
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

  .play-btn-large {
    width: 3.25rem;
    height: 3.25rem;
  }

  .ctrl-btn-icon {
    width: 2.25rem;
    height: 2.25rem;
  }

  .controls-bottom {
    padding: 12px 20px 20px;
  }

  /* 移动端控制按钮收成一行：居中排列，隐藏音量控件（用硬件音量） */
  .controls-bar {
    justify-content: center;
    gap: 10px;
  }

  .controls-left,
  .controls-right {
    flex: 0 0 auto;
    gap: 10px;
  }

  .controls-center {
    gap: 14px;
  }

  .mute-btn,
  .volume-slider {
    display: none;
  }
}
</style>
