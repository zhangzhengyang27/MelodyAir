<template>
  <div class="space-y-6">
    <h1 class="text-title">云盘</h1>

    <div v-if="loading" class="py-8"><LoadingSpinner /></div>

    <div v-else-if="songs.length === 0" class="flex min-h-[30vh] items-center justify-center">
      <div class="text-center">
        <span class="text-5xl">☁️</span>
        <p class="mt-4 text-neutral-500">云盘中暂无歌曲</p>
      </div>
    </div>

    <SongTable v-else :songs="songs" @play="handlePlay" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCloudList } from '@/api/cloud'
import SongTable from '@/components/common/SongTable.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const { playSongList } = usePlayer()

const loading = ref(false)
const songs = ref<Song[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await getCloudList()
    songs.value = (res?.data || []).map((item: any) => {
      const s = item.simpleSong
      return {
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0
      }
    })
  } finally {
    loading.value = false
  }
})

function handlePlay(song: Song) {
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}
</script>
