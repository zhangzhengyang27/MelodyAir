<template>
  <div
    class="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-neutral-900 to-neutral-950 text-white"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4" style="-webkit-app-region: drag;">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        style="-webkit-app-region: no-drag;"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <span class="text-sm text-neutral-400">正在播放</span>
      <div class="w-10" />
    </div>

    <div class="flex flex-1 items-center gap-12 px-16">
      <!-- Left: Cover + Controls -->
      <div class="flex flex-1 flex-col items-center gap-6">
        <!-- Cover with spinning animation -->
        <div class="relative">
          <div
            class="h-80 w-80 overflow-hidden rounded-full shadow-2xl transition-transform duration-1000"
            :class="{ 'animate-spin-slow': playerStore.playing }"
            :style="{ animationDuration: '20s' }"
          >
            <img
              v-if="playerStore.currentSong?.album?.picUrl"
              :src="playerStore.currentSong.album.picUrl + '?param=600y600'"
              alt="cover"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          </div>
          <!-- Center hole -->
          <div class="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 ring-4 ring-neutral-800" />
        </div>

        <!-- Song info -->
        <div class="w-full max-w-sm text-center">
          <h2 class="text-xl font-bold">{{ playerStore.currentSong?.name || '未在播放' }}</h2>
          <p class="mt-1 text-sm text-neutral-400">
            {{ playerStore.currentSong?.artists?.map(a => a.name).join(' / ') || '--' }}
          </p>
          <p v-if="playerStore.currentSong?.album?.name" class="mt-0.5 text-xs text-neutral-500">
            专辑：{{ playerStore.currentSong.album.name }}
          </p>
        </div>

        <!-- Progress -->
        <div class="w-full max-w-sm">
          <div
            class="group relative h-1.5 cursor-pointer rounded-full bg-neutral-700"
            @click="handleProgressClick"
          >
            <div
            class="absolute left-0 top-0 h-full rounded-full bg-[#FF5A5F] transition-[width] duration-100"
            :style="{ width: (playerStore.progress * 100) + '%' }"
          />
          <div
            class="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF5A5F] opacity-0 shadow transition-opacity group-hover:opacity-100"
              :style="{ left: (playerStore.progress * 100) + '%' }"
            />
          </div>
          <div class="mt-2 flex justify-between text-xs text-neutral-500">
            <span>{{ formatTime(playerStore.currentTime) }}</span>
            <span>{{ formatTime(playerStore.duration) }}</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-6">
          <button class="player-btn-lg" @click="playerStore.togglePlayMode" :title="playModeLabel">
            <span class="text-lg">{{ playModeIcon }}</span>
          </button>
          <button class="player-btn-lg" @click="handleLike" :title="isLiked ? '取消喜欢' : '喜欢'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-colors" :class="isLiked ? 'text-[#FF5A5F]' : ''" :fill="isLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button class="player-btn-lg" @click="playerStore.playPrev">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button
            class="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5A5F] text-white transition-transform hover:scale-105"
            @click="playerStore.togglePlaying"
          >
            <svg v-if="!playerStore.playing" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
          <button class="player-btn-lg" @click="playerStore.playNext">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
          <!-- Volume -->
          <div class="flex items-center gap-2">
            <button class="player-btn-lg" @click="toggleMute">
              <svg v-if="playerStore.volume === 0" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      </div>

      <!-- Right: Lyrics -->
      <div class="flex h-full w-96 flex-col">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-medium text-neutral-400">歌词</h3>
        </div>
        <LyricView
          v-if="lyrics.length > 0"
          :lyrics="lyrics"
          :current-index="currentLyricIndex"
          @seek="handleLyricSeek"
        />
        <div v-else class="flex flex-1 items-center justify-center text-neutral-500">
          暂无歌词
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useUserStore } from '@/stores/user'
import { useAudio } from '@/composables/useAudio'
import { useLyric } from '@/composables/useLyric'
import { formatTime } from '@/utils/format'
import LyricView from './LyricView.vue'

defineEmits<{
  close: []
}>()

const playerStore = usePlayerStore()
const userStore = useUserStore()
const { seek, seekByProgress } = useAudio()
const { lyrics, currentIndex: currentLyricIndex } = useLyric()

const prevVolume = ref(0.8)

const isLiked = computed(() =>
  playerStore.currentSong ? userStore.isLiked(playerStore.currentSong.id) : false
)

const playModeIcon = computed(() => {
  const icons: Record<string, string> = { sequence: '🔀', loop: '🔁', random: '🎲' }
  return icons[playerStore.playMode]
})

const playModeLabel = computed(() => {
  const labels: Record<string, string> = { sequence: '顺序播放', loop: '单曲循环', random: '随机播放' }
  return labels[playerStore.playMode]
})

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

function handleProgressClick(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const progress = (event.clientX - rect.left) / rect.width
  seekByProgress(Math.max(0, Math.min(1, progress)))
}

function handleLyricSeek(time: number) {
  seek(time)
}
</script>

<style scoped>
@reference "tailwindcss";
.player-btn-lg {
  @apply flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white;
}

.volume-slider {
  @apply h-1 w-24 cursor-pointer appearance-none rounded-full bg-neutral-700 outline-none;
}

.volume-slider::-webkit-slider-thumb {
  height: 0.75rem;
  width: 0.75rem;
  appearance: none;
  border-radius: 9999px;
  background-color: #FF5A5F;
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spin-slow linear infinite;
}
</style>
