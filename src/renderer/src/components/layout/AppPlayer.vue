<template>
  <footer class="flex h-20 shrink-0 items-center border-t border-neutral-200 bg-white px-4 dark:border-white/10 dark:bg-[#0F0F14]" style="-webkit-app-region: no-drag;">
    <!-- Song info -->
    <div class="flex w-72 items-center gap-3">
      <div
        v-if="playerStore.currentSong"
        class="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-neutral-200 dark:bg-[#1F1F2E]"
        @click="showFullPlayer = true"
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
      <div v-if="playerStore.currentSong" class="min-w-0">
        <p class="truncate text-sm font-medium">{{ playerStore.currentSong.name }}</p>
        <p class="truncate text-xs text-neutral-500">{{ playerStore.currentSong.artists?.map(a => a.name).join(' / ') }}</p>
      </div>
      <p v-else class="text-sm text-neutral-400">未在播放</p>
    </div>

    <!-- Controls -->
    <div class="flex flex-1 flex-col items-center gap-1">
      <div class="flex items-center gap-4">
        <button class="player-btn" @click="playerStore.togglePlayMode" :title="playModeLabel">
          <span class="text-base">{{ playModeIcon }}</span>
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

        <div class="flex items-center gap-2">
          <button class="player-btn" @click="toggleMute" :title="playerStore.volume === 0 ? '取消静音' : '静音'">
            <svg v-if="playerStore.volume === 0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 6l-4 4H4v4h4l4 4V6z" />
            </svg>
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
      <button class="player-btn" title="全屏播放" @click="showFullPlayer = true">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  </footer>

  <Teleport to="body">
    <Transition name="slide-up">
      <div
        v-if="showPlaylist"
        class="fixed bottom-20 right-4 z-50 max-h-96 w-80 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171722] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_1px_rgba(255,255,255,0.09)]"
      >
        <div class="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-white/6">
          <span class="text-sm font-medium">播放列表 ({{ playerStore.playlist.length }})</span>
          <button class="text-xs text-neutral-400 hover:text-[#FF5A5F]" @click="playerStore.clearPlaylist?.()">清空</button>
        </div>
        <div class="max-h-72 overflow-y-auto">
          <div
            v-for="(song, idx) in playerStore.playlist"
            :key="song.id"
            class="flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-[rgba(255,255,255,0.05)]"
            :class="{ 'bg-[#FFF5F3] dark:bg-[rgba(196,58,63,0.2)]': idx === playerStore.currentIndex }"
            @click="handlePlayFromQueue(idx, song)"
          >
            <span class="w-5 text-xs text-neutral-400">{{ idx === playerStore.currentIndex ? '▶' : idx + 1 }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm" :class="{ 'text-[#FF5A5F]': idx === playerStore.currentIndex }">{{ song.name }}</p>
            </div>
            <span class="text-xs text-neutral-400">{{ formatDuration(song.duration) }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useSettingsStore } from '@/stores/settings'
import { useAudio } from '@/composables/useAudio'
import SleepTimerButton from '@/components/player/SleepTimerButton.vue'
import { formatTime, formatDuration } from '@/utils/format'

const playerStore = usePlayerStore()
const settingsStore = useSettingsStore()
const { seekByProgress } = useAudio()

const showPlaylist = ref(false)
const showFullPlayer = defineModel<boolean>('showFullPlayer', { default: false })
const hoverTime = ref<number | null>(null)
const hoverProgress = ref(0)
const prevVolume = ref(0.8)
const showQualityPopup = ref(false)
const qualityPopupRef = ref<HTMLElement | null>(null)

const qualityShortLabel = computed(() => {
  const map: Record<string, string> = {
    standard: '标准', higher: '较高', exhigh: '高品质',
    lossless: '无损', hires: 'HiRes', jyeffect: '环绕',
    sky: '沉浸', dolby: '杜比', jymaster: '母带'
  }
  return map[settingsStore.musicQuality] || '品质'
})

const playModeIcon = computed(() => {
  const icons: Record<string, string> = { sequence: '🔀', loop: '🔁', random: '🎲', loopOne: '🔂' }
  return icons[playerStore.playMode] || '🔀'
})

const playModeLabel = computed(() => {
  const labels: Record<string, string> = { sequence: '顺序播放', loop: '循环播放', random: '随机播放', loopOne: '单曲循环' }
  return labels[playerStore.playMode] || '顺序播放'
})

const qualityPopupStyle = computed(() => {
  const rect = qualityPopupRef.value?.getBoundingClientRect()
  if (!rect) return { right: '1rem', bottom: '5.75rem' }
  return { left: `${Math.max(16, rect.left - 110)}px`, bottom: '5.75rem' }
})

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (qualityPopupRef.value && !qualityPopupRef.value.contains(target)) showQualityPopup.value = false
}

function selectQuality(quality: any) {
  settingsStore.setMusicQuality(quality)
  showQualityPopup.value = false
}

function toggleMute() {
  if (playerStore.volume > 0) {
    prevVolume.value = playerStore.volume
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(prevVolume.value)
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

function handlePlayFromQueue(idx: number, song: any) {
  playerStore.currentIndex = idx
  playerStore.playSong(song)
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
  height: 0.25rem;
  width: 5rem;
  cursor: pointer;
  appearance: none;
  border-radius: 9999px;
  background-color: var(--color-neutral-200);
  outline: none;
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
