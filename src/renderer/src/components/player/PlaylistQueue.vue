<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/6">
      <h3 class="text-sm font-medium">播放队列 ({{ playerStore.playlist.length }})</h3>
      <button
        class="text-xs text-neutral-400 hover:text-coral-500"
        @click="handleClearAll"
      >
        清空
      </button>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="(song, index) in playerStore.playlist"
        :key="`${song.id}-${index}`"
        class="group relative flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-white/5"
        :class="{ 'bg-coral-50 dark:bg-[rgba(255,90,95,0.1)]': index === playerStore.currentIndex }"
        @click="handlePlay(song, index)"
        @contextmenu.prevent="handleContextMenu($event, song, index)"
      >
        <div class="flex w-8 items-center justify-center text-xs text-neutral-400">
          <span v-if="index === playerStore.currentIndex" class="text-coral-500">▶</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <img
          :src="song.album.picUrl + '?param=50y50'"
          :alt="song.name"
          class="h-10 w-10 rounded object-cover"
        />
        <div class="flex-1 overflow-hidden">
          <p
            class="truncate text-sm"
            :class="index === playerStore.currentIndex ? 'font-medium text-coral-500' : ''"
          >
            {{ song.name }}
          </p>
          <p class="truncate text-xs text-neutral-400">
            {{ song.artists.map(a => a.name).join(', ') }}
          </p>
        </div>
        <button
          class="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-coral-500 transition-opacity"
          @click.stop="handleRemove(index)"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import type { Song } from '@/stores/player'
import { showToast } from '@/composables/useToast'

const playerStore = usePlayerStore()

const emit = defineEmits<{
  play: [song: Song]
}>()

function handlePlay(song: Song, index: number) {
  if (index !== playerStore.currentIndex) {
    playerStore.currentIndex = index
    playerStore.playSong(song)
  }
  emit('play', song)
}

function handleRemove(index: number) {
  const song = playerStore.playlist[index]
  playerStore.removeQueueItem(index)
  showToast(`已从队列移除：${song.name}`)
}

function handleClearAll() {
  if (playerStore.playlist.length === 0) return
  playerStore.clearPlaylist()
  showToast('已清空播放队列')
}

function handleContextMenu(event: MouseEvent, song: Song, index: number) {
  // TODO: 实现右键菜单
  console.log('Context menu for:', song.name, 'at index:', index)
}
</script>
