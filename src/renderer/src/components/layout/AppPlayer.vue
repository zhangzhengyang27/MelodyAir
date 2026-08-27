<template>
  <footer class="flex h-20 shrink-0 items-center border-t border-neutral-200 bg-white px-4 dark:border-white/10 dark:bg-[#0F0F14]" style="-webkit-app-region: no-drag;">
    <!-- Song info -->
    <div class="flex w-72 items-center gap-3">
      <div
        v-if="playerStore.currentSong"
        class="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-neutral-200 dark:bg-[#1F1F2E]"
        @click="openFullPlayer"
      >
        <img
          v-if="playerStore.currentSong.album?.picUrl"
          :src="playerStore.currentSong.album.picUrl + '?param=100y100'"
          alt="cover"
          class="h-full w-full object-cover transition-transform group-hover:scale-110"
        />
        <div class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </div>
      </div>
      <div v-if="playerStore.currentSong" class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{{ playerStore.currentSong.name }}</p>
        <p class="truncate text-xs text-neutral-500">{{ playerStore.currentSong.artists?.map(a => a.name).join(' / ') }}</p>
      </div>
      <!-- 喜欢按钮 -->
      <button
        v-if="playerStore.currentSong"
        class="like-btn shrink-0"
        :class="{ 'liked': isCurrentSongLiked }"
        :title="isCurrentSongLiked ? '取消喜欢' : '喜欢'"
        @click="toggleLike"
      >
        <Heart class="h-[18px] w-[18px]" :fill="isCurrentSongLiked ? 'currentColor' : 'none'" />
      </button>
      <p v-else class="text-sm text-neutral-400">未在播放</p>
    </div>

    <!-- Controls -->
    <div class="flex flex-1 flex-col items-center gap-1">
      <div class="flex items-center gap-4">
        <button class="player-btn" @click="playerStore.togglePlayMode" :title="playModeLabel">
          <component :is="playModeIcon" class="h-[18px] w-[18px]" />
        </button>
        <button class="player-btn" @click="playerStore.playPrev">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF5A5F] text-white transition-colors hover:bg-[#E0484D]"
          @click="playerStore.togglePlaying"
        >
          <svg v-if="!playerStore.playing" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
        <button class="player-btn" @click="playerStore.playNext">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <SleepTimerButton />

        <div class="volume-group relative flex items-center">
          <button class="player-btn" @click="toggleMute" :title="playerStore.muted ? '取消静音' : '静音'">
            <VolumeX v-if="playerStore.muted" class="h-[18px] w-[18px]" />
            <Volume2 v-else class="h-[18px] w-[18px]" />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="playerStore.volume"
            @input="playerStore.setVolume(($event.target as HTMLInputElement).valueAsNumber)"
            class="volume-slider"
          />
        </div>
      </div>

      <div class="flex w-full max-w-xl items-center gap-2 text-xs text-neutral-400">
        <span class="w-10 text-right">{{ formatTime(playerStore.currentTime) }}</span>
        <div
          class="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-neutral-200 dark:bg-[#252535]"
          @click="handleProgressClick"
          @mousemove="handleProgressHover"
          @mouseleave="hoverTime = null"
        >
          <div
            class="absolute left-0 top-0 h-full rounded-full bg-[#FF5A5F] transition-[width] duration-100"
            :style="{ width: (playerStore.progress * 100) + '%' }"
          />
          <div
            class="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF5A5F] opacity-0 shadow transition-opacity group-hover:opacity-100"
            :style="{ left: (playerStore.progress * 100) + '%' }"
          />
          <div
            v-if="hoverTime !== null"
            class="absolute -top-7 -translate-x-1/2 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-white"
            :style="{ left: (hoverProgress * 100) + '%' }"
          >
            {{ formatTime(hoverTime) }}
          </div>
        </div>
        <span class="w-10">{{ formatTime(playerStore.duration) }}</span>
      </div>
    </div>

    <!-- Right area -->
    <div class="flex w-72 items-center justify-end gap-2">
      <div class="relative" ref="qualityPopupRef">
        <button
          class="player-btn whitespace-nowrap text-[11px] font-medium leading-tight"
          :class="{ 'text-[#FF5A5F]': settingsStore.musicQuality !== 'exhigh' }"
          :title="'当前音质：' + settingsStore.currentQualityLabel"
          @click.stop="showQualityPopup = !showQualityPopup"
        >
          {{ qualityShortLabel }}
        </button>
        <Teleport to="body">
          <Transition name="fade-scale">
            <div
              v-if="showQualityPopup"
              class="fixed bottom-[5.75rem] z-50 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#171722] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
              :style="qualityPopupStyle"
            >
              <div class="border-b border-neutral-100 px-3 py-2 dark:border-white/6">
                <span class="text-xs font-semibold tracking-wide text-neutral-500">音质</span>
              </div>
              <div class="py-0.5">
                <button
                  v-for="(label, key) in settingsStore.qualityLabels"
                  :key="key"
                  class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
                  :class="{ 'text-[#FF5A5F]': key === settingsStore.musicQuality }"
                  @click="selectQuality(key as any)"
                >
                  <span class="text-[13px]">{{ label }}</span>
                  <svg v-if="key === settingsStore.musicQuality" class="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>

      <button class="player-btn" title="播放列表" @click="showPlaylist = !showPlaylist">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10m-10 4h6" />
        </svg>
      </button>
      <button class="player-btn" title="全屏播放" @click="openFullPlayer">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      <!-- 更多菜单（平台专属能力：桌面歌词/迷你播放器） -->
      <div v-if="showMoreButton" class="relative" ref="moreMenuRef">
        <button class="player-btn" title="更多" @click.stop="showMoreMenu = !showMoreMenu">
          <MoreHorizontal class="h-5 w-5" />
        </button>
        <Teleport to="body">
          <Transition name="fade-scale">
            <div
              v-if="showMoreMenu"
              class="fixed bottom-[5.75rem] z-50 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#171722] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
              :style="moreMenuStyle"
            >
              <div class="border-b border-neutral-100 px-3 py-2 dark:border-white/6">
                <span class="text-xs font-semibold tracking-wide text-neutral-500">桌面工具</span>
              </div>
              <div class="py-0.5">
                <button
                  v-if="hasDesktopLyrics"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
                  @click="toggleDesktopLyrics(); showMoreMenu = false"
                >
                  <MonitorPlay class="h-4 w-4 text-neutral-400" />
                  <span>桌面歌词</span>
                </button>
                <button
                  v-if="hasMiniPlayer"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
                  @click="toggleMiniPlayer(); showMoreMenu = false"
                >
                  <AppWindow class="h-4 w-4 text-neutral-400" />
                  <span>迷你播放器</span>
                </button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>
    </div>
  </footer>

  <!-- 播放队列滑出面板 -->
  <PlayQueuePanel v-model:visible="showPlaylist" />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Shuffle, Repeat, Repeat1, ListOrdered, Volume2, VolumeX, Heart, MoreHorizontal, MonitorPlay, AppWindow } from 'lucide-vue-next'
import { usePlayerStore } from '@/stores/player'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { useAudio } from '@/composables/useAudio'
import { usePlatform } from '@/composables/usePlatform'
import SleepTimerButton from '@/components/player/SleepTimerButton.vue'
import PlayQueuePanel from '@/components/player/PlayQueuePanel.vue'
import { formatTime } from '@/utils/format'

const playerStore = usePlayerStore()
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const { seekByProgress } = useAudio()
const { hasDesktopLyrics, hasMiniPlayer } = usePlatform()

/** 是否显示「更多」按钮（仅当有平台专属能力时） */
const showMoreButton = hasDesktopLyrics || hasMiniPlayer

// 当前歌曲是否喜欢
const isCurrentSongLiked = computed(() => {
  if (!playerStore.currentSong) return false
  return userStore.isLiked(playerStore.currentSong.id)
})

function toggleLike() {
  if (!playerStore.currentSong) return
  userStore.toggleLike(playerStore.currentSong.id)
}

const showPlaylist = ref(false)
const props = defineProps<{
  showFullPlayer?: boolean
}>()
const emit = defineEmits<{
  'update:showFullPlayer': [value: boolean]
}>()

function openFullPlayer() {
  emit('update:showFullPlayer', true)
}
const hoverTime = ref<number | null>(null)
const hoverProgress = ref(0)
const showQualityPopup = ref(false)
const showMoreMenu = ref(false)
const moreMenuRef = ref<HTMLElement | null>(null)
const qualityPopupRef = ref<HTMLElement | null>(null)
const popupPositionTick = ref(0) // 窗口 resize 时递增，触发 computed 重新计算

const qualityShortLabel = computed(() => {
  const map: Record<string, string> = {
    standard: '标准', higher: '较高', exhigh: '高品质',
    lossless: '无损', hires: 'HiRes', jyeffect: '环绕',
    sky: '沉浸', dolby: '杜比', jymaster: '母带'
  }
  return map[settingsStore.musicQuality] || '品质'
})

const playModeIcon = computed(() => {
  const icons: Record<string, any> = { sequence: ListOrdered, loop: Repeat, random: Shuffle, loopOne: Repeat1 }
  return icons[playerStore.playMode] || ListOrdered
})

const playModeLabel = computed(() => {
  const labels: Record<string, string> = { sequence: '顺序播放', loop: '循环播放', random: '随机播放', loopOne: '单曲循环' }
  return labels[playerStore.playMode] || '顺序播放'
})

const qualityPopupStyle = computed(() => {
  // 依赖 popupPositionTick 以在窗口 resize 时重新计算
  void popupPositionTick.value
  const rect = qualityPopupRef.value?.getBoundingClientRect()
  if (!rect) return { right: '1rem', bottom: '5.75rem' }
  return { left: `${Math.max(16, rect.left - 110)}px`, bottom: '5.75rem' }
})

const moreMenuStyle = computed(() => {
  void popupPositionTick.value
  const rect = moreMenuRef.value?.getBoundingClientRect()
  if (!rect) return { right: '1rem', bottom: '5.75rem' }
  return { left: `${Math.max(16, rect.left - 110)}px`, bottom: '5.75rem' }
})

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (qualityPopupRef.value && !qualityPopupRef.value.contains(target)) showQualityPopup.value = false
  if (moreMenuRef.value && !moreMenuRef.value.contains(target)) showMoreMenu.value = false
}

function selectQuality(quality: any) {
  settingsStore.setMusicQuality(quality)
  showQualityPopup.value = false
}

function toggleMute() {
  playerStore.toggleMute()
}

async function toggleDesktopLyrics() {
  try {
    if (!window.electronAPI?.openLyricsWindow) return
    const isOpen = await window.electronAPI.isLyricsWindowOpen()
    if (isOpen) {
      await window.electronAPI.closeLyricsWindow()
    } else {
      await window.electronAPI.openLyricsWindow()
    }
  } catch (e) {
    console.error('toggleDesktopLyrics failed:', e)
  }
}

async function toggleMiniPlayer() {
  try {
    if (!window.electronAPI?.openMiniWindow) return
    const isOpen = await window.electronAPI.isMiniWindowOpen()
    if (isOpen) {
      await window.electronAPI.closeMiniWindow()
    } else {
      await window.electronAPI.openMiniWindow()
    }
  } catch (e) {
    console.error('toggleMiniPlayer failed:', e)
  }
}

function handleProgressClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const progress = (e.clientX - rect.left) / rect.width
  seekByProgress(Math.max(0, Math.min(1, progress)))
}

function handleProgressHover(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  hoverProgress.value = (e.clientX - rect.left) / rect.width
  hoverTime.value = hoverProgress.value * playerStore.duration
}

function handleWindowResize() {
  popupPositionTick.value++
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style scoped>
.player-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 9999px;
  color: var(--color-neutral-500);
  transition: background-color 0.15s, color 0.15s;
}

.player-btn:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);
}

.dark .player-btn {
  color: #A1A1B5;
}

.dark .player-btn:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: #F0F0F5;
}

.sleep-timer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-neutral-200);
  font-size: 0.75rem;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.sleep-timer-btn:hover {
  border-color: #FF5A5F;
  color: #FF5A5F;
}

.dark .sleep-timer-btn {
  border-color: rgba(255, 255, 255, 0.1);
  color: #E9E9F2;
}

.dark .sleep-timer-btn:hover {
  border-color: #FF5A5F;
  color: #FF5A5F;
}

.volume-slider {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  height: 0.25rem;
  width: 0;
  cursor: pointer;
  appearance: none;
  border-radius: 9999px;
  background-color: var(--color-neutral-200);
  outline: none;
  opacity: 0;
  transition: width 0.25s ease, opacity 0.2s ease, margin-left 0.25s ease;
  margin-left: 0;
}

.volume-group:hover .volume-slider {
  width: 5rem;
  opacity: 1;
  margin-left: 0.5rem;
}

.dark .volume-slider {
  background-color: #252535;
}

.volume-slider::-webkit-slider-thumb {
  height: 0.75rem;
  width: 0.75rem;
  appearance: none;
  border-radius: 9999px;
  background-color: #FF5A5F;
}

/* 喜欢按钮 */
.like-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 9999px;
  color: var(--color-neutral-400);
  transition: all 0.15s ease;
}

.like-btn:hover {
  color: #FF5A5F;
  background-color: rgba(255, 90, 95, 0.1);
}

.like-btn.liked {
  color: #FF5A5F;
}

.like-btn.liked svg {
  animation: like-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes like-pop {
  0% {
    transform: scale(0.6);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

.dark .like-btn {
  color: #A1A1B5;
}

.dark .like-btn:hover {
  color: #FF7F66;
  background-color: rgba(255, 90, 95, 0.15);
}

.dark .like-btn.liked {
  color: #FF7F66;
}

.slide-up-enter-active,
.slide-up-leave-active,
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to,
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}
</style>
