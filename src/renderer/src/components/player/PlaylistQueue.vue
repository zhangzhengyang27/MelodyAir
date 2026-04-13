<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/6">
      <h3 class="text-sm font-medium">播放队列 ({{ playerStore.playlist.length }})</h3>
      <button
        class="text-xs text-neutral-400 hover:text-[#FF5A5F]"
        @click="playerStore.playlist = []"
      >
        清空
      </button>
    </div>
    <div class="flex-1 overflow-y-auto">
      <SongRow
        v-for="(song, index) in playerStore.playlist"
        :key="song.id"
        :song="song"
        :index="index"
        @play="handlePlay"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import SongRow from '../common/SongRow.vue'
import type { Song } from '@/stores/player'

const playerStore = usePlayerStore()

const emit = defineEmits<{
  play: [song: Song]
}>()

function handlePlay(song: Song) {
  const idx = playerStore.playlist.findIndex(s => s.id === song.id)
  if (idx >= 0) {
    playerStore.currentIndex = idx
    playerStore.playSong(song)
  }
  emit('play', song)
}
</script>
