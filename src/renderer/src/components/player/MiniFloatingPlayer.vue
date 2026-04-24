<template>
  <div class="mini-player fixed right-6 bottom-6 z-50 w-80 rounded-2xl border border-white/10 bg-[#11111a]/95 p-4 shadow-2xl backdrop-blur-xl">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-widest text-white/40">Mini Player</p>
        <p class="truncate text-sm font-medium text-white">{{ currentSong?.name || '未在播放' }}</p>
      </div>
      <button class="secondary-button !px-2 !py-1 text-xs" @click="emit('close')">关闭</button>
    </div>

    <div class="flex items-center gap-3">
      <img
        v-if="currentSong?.album?.picUrl"
        :src="currentSong.album.picUrl + '?param=120y120'"
        class="h-16 w-16 rounded-xl object-cover"
      />
      <div v-else class="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-white/30">♪</div>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm text-white/90">{{ currentSong?.artists?.map(a => a.name).join(' / ') || '--' }}</p>
        <div class="mt-2 flex items-center gap-2">
          <button class="ctrl-btn ctrl-btn-sm" @click="emit('prev')">⏮</button>
          <button class="play-btn-main !h-10 !w-10" @click="emit('toggle')">{{ playing ? '⏸' : '▶' }}</button>
          <button class="ctrl-btn ctrl-btn-sm" @click="emit('next')">⏭</button>
        </div>
      </div>
    </div>

    <div class="mt-3">
      <div class="h-1.5 overflow-hidden rounded-full bg-white/10" @click="onSeekTrack">
        <div class="h-full rounded-full bg-[#FF5A5F]" :style="{ width: progress * 100 + '%' }" />
      </div>
      <div class="mt-2 min-h-[2.25rem] rounded-xl bg-white/5 px-3 py-2 text-xs text-white/75">
        <p class="truncate">{{ currentLyric || '暂无歌词' }}</p>
      </div>
      <div class="mt-1 flex justify-between text-[11px] text-white/35">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'
import { formatTime } from '@/utils/format'

const emit = defineEmits<{ close: []; toggle: []; prev: []; next: [] }>()
const player = usePlayerStore()
const lyricsStore = useLyricsStore()
const currentSong = computed(() => player.currentSong)
const playing = computed(() => player.playing)
const currentTime = computed(() => player.currentTime)
const duration = computed(() => player.duration)
const progress = computed(() => player.progress)
const currentLyric = computed(() => lyricsStore.currentLine?.text || '')

function onSeekTrack(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const p = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  player.seek(p * duration.value)
}
</script>
