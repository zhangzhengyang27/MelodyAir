<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="8" />
    <template v-else-if="album">
      <div class="flex gap-6">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:bg-[#1F1F2E] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40)]">
          <img v-if="album.coverPath" :src="getCoverUrl(album.coverPath)" alt="" class="h-full w-full object-cover" />
          <div v-else class="flex h-full w-full items-center justify-center"><Disc3 class="h-12 w-12 text-neutral-300" /></div>
        </div>
        <div class="flex flex-col justify-center">
          <span class="text-xs uppercase text-neutral-500 dark:text-[#A1A1B5]">{{ album.albumType }}</span>
          <h1 class="text-display">{{ album.name }}</h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            <span v-if="album.artist" class="cursor-pointer hover:underline" @click="$router.push(`/local/artist/${album.artist.id}`)">{{ album.artist.name }}</span>
            <span v-if="album.releaseDate"> · {{ album.releaseDate?.slice(0, 10) }}</span>
            · {{ album.tracks?.length || 0 }} 首歌曲
          </p>
          <div v-if="album.neteaseAlbumId" class="mt-1 text-xs text-[#FF5A5F]">已关联网易云专辑</div>
          <div class="mt-4 flex gap-3">
            <CoralButton @click="playAll">播放全部</CoralButton>
          </div>
        </div>
      </div>
      <SongTable :songs="trackList" @play="handlePlaySong" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStore } from '@/stores/local'
import { useSettingsStore } from '@/stores/settings'
import { Disc3 } from 'lucide-vue-next'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import SkeletonDetail from '@/components/common/skeleton/SkeletonDetail.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'
import type { LocalAlbum } from '@/types/local'

const route = useRoute()
const localStore = useLocalStore()
const settingsStore = useSettingsStore()
const { playSongList } = usePlayer()

const loading = ref(false)
const album = ref<LocalAlbum | null>(null)

const trackList = computed<Song[]>(() =>
  (album.value?.tracks || []).map((t: any) => ({
    id: t.songId || t.id,
    name: t.name,
    artists: t.song?.artist ? [{ id: t.song.artist.id, name: t.song.artist.name }] : [],
    album: album.value
      ? { id: album.value.id, name: album.value.name, picUrl: album.value.coverPath ? getCoverUrl(album.value.coverPath) : '' }
      : { id: 0, name: '', picUrl: '' },
    duration: 0,
    _localTrackId: t.id,
  }))
)

function getCoverUrl(coverPath: string): string {
  if (coverPath.startsWith('http')) return coverPath
  const base = settingsStore.apiBase
  return `${base}/cover?type=album&id=0&path=${encodeURIComponent(coverPath)}`
}

async function fetchData(id: number) {
  loading.value = true
  try {
    album.value = await localStore.fetchAlbum(id)
  } finally {
    loading.value = false
  }
}

onMounted(() => { const id = Number(route.params.id); if (id) fetchData(id) })
watch(() => route.params.id, (v) => { if (v) fetchData(Number(v)) })

function handlePlaySong(song: Song) {
  const idx = trackList.value.findIndex(s => s.id === song.id)
  playLocalSongs(trackList.value, idx)
}

function playAll() {
  if (trackList.value.length > 0) playLocalSongs(trackList.value, 0)
}

function playLocalSongs(songs: Song[], index: number) {
  const mapped = songs.map(s => ({
    ...s,
    url: `${settingsStore.apiBase}/stream/${(s as any)._localTrackId}`,
  }))
  playSongList(mapped, index)
}
</script>
