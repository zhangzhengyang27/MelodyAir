<template>
  <section class="lyrics-container" @mouseenter="lyricsStore.setHovering(true)" @mouseleave="lyricsStore.setHovering(false)">
    <!-- 顶部歌曲信息 - 简洁版 -->
    <div class="song-header">
      <h3 class="song-title">{{ title || '未播放' }}</h3>
      <p class="song-artist">{{ artists || '-' }}</p>
    </div>

    <!-- 歌词显示区域 - 占据主要空间 -->
    <div class="lyrics-main">
      <LyricsDisplay
        :lyrics="lyrics"
        :current-index="currentIndex"
        :current-line="currentLine"
        :prev-line="prevLine"
        :next-line="nextLine"
        :mode="mode"
        :font-size="fontSize"
        :show-translation="showTranslation"
        :show-romanized="showRomanized"
        :loading="loading"
        :error="error"
        @line-click="(index) => emit('seek-lyric', index)"
      />
    </div>

    <!-- 底部控制栏 - 悬停时显示 -->
    <transition name="slide-up">
      <div v-if="hovered" class="controls-bar">
        <div class="controls-group">
          <button class="ctrl-icon" @click="emit('toggle-mode')" title="切换显示模式">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          <button class="ctrl-icon" @click="emit('toggle-follow')" :class="{ active: autoFollow }" :title="autoFollow ? '关闭自动跟随' : '开启自动跟随'">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button class="ctrl-icon" @click="emit('increase-font')" title="放大字号">
            <span style="font-size: 16px; font-weight: 600;">A+</span>
          </button>
          <button class="ctrl-icon" @click="emit('decrease-font')" title="缩小字号">
            <span style="font-size: 14px; font-weight: 600;">A-</span>
          </button>
        </div>

        <div class="sync-controls">
          <button class="sync-btn" @click="emit('adjust-offset', -100)">-100ms</button>
          <span class="offset-display">{{ offsetMs > 0 ? '+' : '' }}{{ offsetMs }}ms</span>
          <button class="sync-btn" @click="emit('adjust-offset', 100)">+100ms</button>
          <button class="sync-btn reset" @click="emit('reset-offset')">重置</button>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLyricsStore } from '@/stores/lyrics'
import type { ParsedLyricLine, LyricsDisplayMode } from '@/types/lyrics'
import LyricsDisplay from './LyricsDisplay.vue'
import LyricsActions from './LyricsActions.vue'
import LyricsSyncAdjuster from './LyricsSyncAdjuster.vue'

const lyricsStore = useLyricsStore()
const props = defineProps<{
  title: string
  artists: string
  lyrics: ParsedLyricLine[]
  currentIndex: number
  currentLine: ParsedLyricLine | null
  prevLine: ParsedLyricLine | null
  nextLine: ParsedLyricLine | null
  mode: LyricsDisplayMode
  fontSize: number
  offsetMs: number
  showTranslation: boolean
  showRomanized: boolean
  isTopMost: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'copy-current'): void
  (e: 'toggle-mode'): void
  (e: 'toggle-topmost'): void
  (e: 'toggle-follow'): void
  (e: 'reset-offset'): void
  (e: 'change-font-size', value: number): void
  (e: 'adjust-offset', delta: number): void
  (e: 'seek-lyric', index: number): void
}>()

const hovered = computed(() => lyricsStore.isHovering)
const lyrics = computed(() => props.lyrics)
const currentIndex = computed(() => props.currentIndex)
const currentLine = computed(() => props.currentLine)
const prevLine = computed(() => props.prevLine)
const nextLine = computed(() => props.nextLine)
const mode = computed(() => props.mode)
const fontSize = computed(() => props.fontSize)
const offsetMs = computed(() => props.offsetMs)
const showTranslation = computed(() => props.showTranslation)
const showRomanized = computed(() => props.showRomanized)
const isTopMost = computed(() => props.isTopMost)
const autoFollow = computed(() => lyricsStore.autoFollow)
const loading = computed(() => props.loading ?? false)
const error = computed(() => props.error ?? null)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

function handleCopyCurrent() {
  emit('copy-current')
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1200)
}
</script>

<style scoped>
.lyrics-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  -webkit-app-region: no-drag;
  position: relative;
}

/* 顶部歌曲信息 - 极简 */
.song-header {
  flex-shrink: 0;
  padding: 24px 32px 20px;
  text-align: center;
}

.song-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.song-artist {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  line-height: 1.4;
}

/* 歌词主区域 */
.lyrics-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 32px;
}

/* 底部控制栏 */
.controls-bar {
  flex-shrink: 0;
  padding: 16px 24px 24px;
  background: linear-gradient(to top, rgba(12, 12, 18, 0.95) 0%, rgba(12, 12, 18, 0.8) 50%, transparent 100%);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.controls-group {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.ctrl-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-icon:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
}

.ctrl-icon.active {
  background: rgba(255, 90, 95, 0.2);
  color: #FF5A5F;
}

.sync-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.sync-btn {
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sync-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.95);
}

.sync-btn.reset {
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
}

.offset-display {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  min-width: 70px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 响应式 */
@media (max-width: 900px) {
  .song-header {
    padding: 20px 24px 16px;
  }

  .lyrics-main {
    padding: 0 24px;
  }

  .controls-bar {
    padding: 12px 20px 20px;
  }
}
</style>
