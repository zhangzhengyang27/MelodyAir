<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-8"><LoadingSpinner /></div>

    <template v-else-if="artist">
      <!-- Header -->
      <div class="flex gap-6">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img v-if="artist.avatar" :src="artist.avatar + '?param=400y400'" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="text-display">{{ artist.name }}</h1>
          <p v-if="artist.identifyTag" class="mt-1 text-sm text-[#FF5A5F]">{{ artist.identifyTag }}</p>
          <p class="mt-2 line-clamp-3 text-sm text-neutral-500 dark:text-[#A1A1B5]">{{ artist.briefDesc }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C]">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Hot songs -->
      <SongTable v-if="activeTab === 'songs'" :songs="hotSongs" :loading="songsLoading" @play="handlePlaySong" />

      <!-- Albums -->
      <div v-if="activeTab === 'albums'" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="album in albums"
          :key="album.id"
          class="cursor-pointer"
          @click="$router.push(`/album/${album.id}`)"
        >
          <CoverImage :src="album.picUrl" :alt="album.name" size="md" />
          <p class="mt-2 line-clamp-1 text-sm">{{ album.name }}</p>
          <p class="text-xs text-neutral-400">{{ formatDate(album.publishTime) }}</p>
        </div>
      </div>

      <!-- MVs -->
      <div v-if="activeTab === 'mvs'" class="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div
          v-for="mv in mvs"
          :key="mv.id"
          class="cursor-pointer"
          @click="$router.push(`/mv/${mv.id}`)"
        >
          <div class="overflow-hidden rounded-lg">
            <img :src="mv.imgurl" alt="" class="h-36 w-full object-cover" />
          </div>
          <p class="mt-2 line-clamp-1 text-sm">{{ mv.name }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getArtistDetail, getArtistSongs, getArtistAlbum, getArtistMv } from '@/api/artist'
import SongTable from '@/components/common/SongTable.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import { formatDate } from '@/utils/format'
import type { Song } from '@/stores/player'

const route = useRoute()
const { playSongList } = usePlayer()

const loading = ref(false)
const songsLoading = ref(false)
const artist = ref<any>(null)
const hotSongs = ref<Song[]>([])
const albums = ref<any[]>([])
const mvs = ref<any[]>([])
const activeTab = ref('songs')

const tabs = [
  { label: '热门歌曲', value: 'songs' },
  { label: '专辑', value: 'albums' },
  { label: 'MV', value: 'mvs' }
]

async function fetchData(id: number) {
  loading.value = true
  try {
    const res: any = await getArtistDetail(id)
    const data = res?.data?.artist || res?.artist
    if (data) {
      artist.value = {
        name: data.name,
        avatar: data.picUrl || data.cover,
        briefDesc: data.briefDesc || '',
        identifyTag: data.identify?.imageDesc || ''
      }
    }
  } finally {
    loading.value = false
  }

  songsLoading.value = true
  try {
    const [songsRes, albumRes, mvRes] = await Promise.allSettled([
      getArtistSongs(id),
      getArtistAlbum(id),
      getArtistMv(id)
    ])
    if (songsRes.status === 'fulfilled') {
      hotSongs.value = ((songsRes.value as any)?.songs || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0
      }))
    }
    if (albumRes.status === 'fulfilled') albums.value = (albumRes.value as any)?.hotAlbums || []
    if (mvRes.status === 'fulfilled') mvs.value = (mvRes.value as any)?.mvs || []
  } finally {
    songsLoading.value = false
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
  playSongList(hotSongs.value, hotSongs.value.findIndex(s => s.id === song.id))
}
</script>
