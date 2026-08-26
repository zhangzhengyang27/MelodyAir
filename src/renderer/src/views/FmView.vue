<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-title">私人FM</h1>
      <CoralButton @click="fetchFmSongs">换一批</CoralButton>
    </div>

    <SkeletonSongTable v-if="loading" :rows="8" />

    <div v-else-if="songs.length === 0" class="flex min-h-[30vh] items-center justify-center">
      <div class="text-center">
        <span class="text-5xl">📻</span>
        <p class="mt-4 text-neutral-500 dark:text-[#A1A1B5]">点击上方按钮开始收听私人FM</p>
      </div>
    </div>

    <SongTable v-else :songs="songs" @play="handlePlay" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getPersonalFm, fmTrash } from '@/api/fm'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import SkeletonSongTable from '@/components/common/skeleton/SkeletonSongTable.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const { playSongList } = usePlayer()

const loading = ref(false)
const songs = ref<Song[]>([])

async function fetchFmSongs() {
  loading.value = true
  try {
    const res: any = await getPersonalFm()
    songs.value = (res?.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      artists: s.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      album: { id: s.album?.id || 0, name: s.album?.name || '', picUrl: s.album?.picUrl || '' },
      duration: s.duration || 0,
      fee: s.fee || 0
    }))
  } finally {
    loading.value = false
  }
}

function handlePlay(song: Song) {
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}
</script>
