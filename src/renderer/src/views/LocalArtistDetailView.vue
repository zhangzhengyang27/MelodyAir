<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-8"><LoadingSpinner /></div>
    <template v-else-if="artist">
      <!-- Header -->
      <div class="flex items-center gap-6">
        <div class="h-32 w-32 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1F1F2E]">
          <img v-if="artist.avatarPath" :src="getCoverUrl(artist.avatarPath)" alt="" class="h-full w-full object-cover" />
          <div v-else class="flex h-full w-full items-center justify-center text-4xl">🎤</div>
        </div>
        <div>
          <h1 class="text-display">{{ artist.name }}</h1>
          <p v-if="artist.biography" class="mt-2 line-clamp-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">{{ artist.biography }}</p>
          <div v-if="artist.neteaseArtistId" class="mt-1 text-xs text-[#FF5A5F]">已关联网易云歌手</div>
          <div class="mt-3 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            {{ artist.albums?.length || 0 }} 张专辑 · {{ artist.songs?.length || 0 }} 首歌曲
          </div>
        </div>
      </div>

      <!-- Albums -->
      <section v-if="artist.albums && artist.albums.length > 0">
        <SectionHeader title="专辑" />
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div
            v-for="album in artist.albums"
            :key="album.id"
            class="cursor-pointer"
            @click="$router.push(`/local/album/${album.id}`)"
          >
            <div class="aspect-square overflow-hidden rounded-2xl bg-neutral-100 dark:bg-[#1F1F2E]">
              <img v-if="album.coverPath" :src="getCoverUrl(album.coverPath)" :alt="album.name" class="h-full w-full object-cover" />
              <div v-else class="flex h-full w-full items-center justify-center text-3xl">💿</div>
            </div>
            <p class="mt-2 text-sm font-medium line-clamp-1">{{ album.name }}</p>
          </div>
        </div>
      </section>

      <!-- Songs -->
      <section v-if="songList.length > 0">
        <SectionHeader title="歌曲" />
        <div class="mb-3">
          <CoralButton @click="playAll">播放全部</CoralButton>
        </div>
        <SongTable :songs="songList" @play="handlePlaySong" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStore } from '@/stores/local'
import { useSettingsStore } from '@/stores/settings'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'
import type { LocalArtist } from '@/types/local'

const route = useRoute()
const localStore = useLocalStore()
const settingsStore = useSettingsStore()
const { playSongList } = usePlayer()

const loading = ref(false)
const artist = ref<LocalArtist | null>(null)

const songList = computed<Song[]>(() =>
  (artist.value?.songs || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    artists: artist.value ? [{ id: artist.value.id, name: artist.value.name }] : [],
    album: { id: 0, name: '', picUrl: '' },
    duration: 0,
    _localTrackId: s.tracks?.[0]?.id,
  }))
)

function getCoverUrl(coverPath: string): string {
  if (coverPath.startsWith('http')) return coverPath
  const base = settingsStore.apiBase
  return `${base}/cover?type=artist&id=0&path=${encodeURIComponent(coverPath)}`
}

async function fetchData(id: number) {
  loading.value = true
  try {
    artist.value = await localStore.fetchArtist(id)
  } finally {
    loading.value = false
  }
}

onMounted(() => { const id = Number(route.params.id); if (id) fetchData(id) })
watch(() => route.params.id, (v) => { if (v) fetchData(Number(v)) })

function handlePlaySong(song: Song) {
  const idx = songList.value.findIndex(s => s.id === song.id)
  playLocalSongs(songList.value, idx)
}

function playAll() {
  if (songList.value.length > 0) playLocalSongs(songList.value, 0)
}

function playLocalSongs(songs: Song[], index: number) {
  const mapped = songs.map(s => ({
    ...s,
    url: `${settingsStore.apiBase}/stream/${(s as any)._localTrackId}`,
  }))
  playSongList(mapped, index)
}
</script>
