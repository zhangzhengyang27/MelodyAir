<template>
  <div class="space-y-0.5">
    <!-- Header -->
    <div class="flex items-center gap-4 rounded-lg px-3 py-2 text-xs font-medium text-neutral-400 dark:text-[#6B6B80] dark:bg-[#13131C]">
      <div class="w-8 text-center">#</div>
      <div class="h-10 w-10" />
      <div class="flex-1">标题</div>
      <div class="hidden w-40 lg:block">专辑</div>
      <div class="w-12 text-right">时长</div>
      <div class="w-7" />
    </div>

    <!-- Song rows -->
    <SongRow
      v-for="(song, index) in songs"
      :key="song.id"
      :song="song"
      :index="index"
      @play="handlePlay"
    />

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import SongRow from './SongRow.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import type { Song } from '@/stores/player'

defineProps<{
  songs: Song[]
  loading?: boolean
}>()

const emit = defineEmits<{
  play: [song: Song]
}>()

function handlePlay(song: Song) {
  emit('play', song)
}
</script>
