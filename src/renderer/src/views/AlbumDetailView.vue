<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-8"><LoadingSpinner /></div>

    <template v-else-if="album">
      <!-- Header -->
      <div class="flex gap-6">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img :src="album.picUrl + '?param=400y400'" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="text-display">{{ album.name }}</h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            {{ album.artist?.name }}
            · {{ formatDate(album.publishTime) }}
            · {{ songs.length }}首歌曲
          </p>
          <p v-if="album.description" class="mt-2 line-clamp-2 text-xs text-neutral-400">{{ album.description }}</p>
          <div class="mt-4 flex gap-3">
            <CoralButton @click="playAll">播放全部</CoralButton>
          </div>
        </div>
      </div>

      <!-- Songs -->
      <SongTable :songs="songs" @play="handlePlaySong" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getAlbumDetail } from '@/api/album'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import { formatDate } from '@/utils/format'
import type { Song } from '@/stores/player'

const route = useRoute()
const { playSongList } = usePlayer()

const loading = ref(false)
const album = ref<any>(null)
const songs = ref<Song[]>([])

async function fetchData(id: number) {
  loading.value = true
  try {
    const res: any = await getAlbumDetail(id)
    album.value = res?.album
    songs.value = (res?.songs || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
      duration: s.dt || 0,
      fee: s.fee || 0
    }))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const id = Number(route.params.id)
  if (id) fetchData(id)
})

watch(() => route.params.id, (newId) => {
  if (newId) fetchData(Number(newId))
})

function handlePlaySong(song: Song) {
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}

function playAll() {
  if (songs.value.length > 0) playSongList(songs.value, 0)
}
</script>
