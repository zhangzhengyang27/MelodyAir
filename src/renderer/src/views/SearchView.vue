<template>
  <div class="space-y-6">
    <!-- Search input -->
    <div class="relative">
      <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="搜索音乐、歌手、专辑、歌单..."
        class="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-12 pr-4 text-base outline-none transition-colors focus:border-[#FFB0A0] dark:border-white/10 dark:bg-[#13131C] dark:focus:border-[#E0484D] dark:text-[#F0F0F5]"
        @keydown.enter="doSearch"
      />
    </div>

    <!-- Search history (when no query and has history) -->
    <section v-if="!query && !hasSearched && searchHistory.length > 0">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-subtitle font-semibold">搜索历史</h2>
        <button
          class="rounded-lg px-3 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-red-500 dark:hover:bg-white/5"
          @click="clearHistory"
        >
          清空
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="item in searchHistory.slice(0, 15)"
          :key="item.keyword"
          class="group flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 transition-colors hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:hover:bg-[rgba(255,255,255,0.1)]"
        >
          <span
            class="cursor-pointer text-sm"
            @click="query = item.keyword; doSearch()"
          >
            {{ item.keyword }}
          </span>
          <button
            class="text-neutral-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            @click.stop="removeFromHistory(item.keyword)"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>
    </section>

    <!-- Hot searches (when no query) -->
    <section v-if="!hasSearched">
      <h2 class="mb-4 text-subtitle font-semibold">热搜榜</h2>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
        <div
          v-for="(item, i) in hotSearches"
          :key="i"
          class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.05)]"
          @click="query = item.searchWord; doSearch()"
        >
          <span class="w-6 text-center text-sm font-bold" :class="i < 3 ? 'text-[#FF5A5F]' : 'text-neutral-400'">{{ i + 1 }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm">{{ item.searchWord }}</p>
            <p class="truncate text-xs text-neutral-400">{{ item.content }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Search suggestions -->
    <section v-if="suggestions.length > 0 && !hasSearched">
      <div class="space-y-1">
        <div
          v-for="item in suggestions"
          :key="item.name"
          class="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.05)]"
          @click="query = item.name; doSearch()"
        >
          <span>{{ item.name }}</span>
          <span v-if="item.source === 'history'" class="text-xs text-neutral-400">历史</span>
        </div>
      </div>
    </section>

    <!-- Search results -->
    <section v-if="hasSearched">
      <!-- Tabs -->
      <div class="mb-4 flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C] dark:border dark:border-white/6">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 hover:text-neutral-700 dark:text-[#A1A1B5] dark:hover:text-[#F0F0F5]'"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Songs tab -->
      <SongTable v-if="activeTab === 'songs'" :songs="results.songs" :loading="searchLoading" @play="handlePlaySong" />

      <!-- Artists tab -->
      <div v-if="activeTab === 'artists'" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="artist in results.artists"
          :key="artist.id"
          class="group cursor-pointer text-center"
          @click="$router.push(`/artist/${artist.id}`)"
        >
          <div class="mx-auto h-28 w-28 overflow-hidden rounded-full">
            <img v-if="artist.picUrl" :src="artist.picUrl + '?param=200y200'" alt="" class="h-full w-full object-cover" />
          </div>
          <p class="mt-2 text-sm">{{ artist.name }}</p>
        </div>
      </div>

      <!-- Albums tab -->
      <div v-if="activeTab === 'albums'" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="album in results.albums"
          :key="album.id"
          class="group cursor-pointer"
          @click="$router.push(`/album/${album.id}`)"
        >
          <CoverImage :src="album.picUrl" :alt="album.name" size="md" />
          <p class="mt-2 line-clamp-1 text-sm">{{ album.name }}</p>
          <p class="text-xs text-neutral-400">{{ album.artist?.name }}</p>
        </div>
      </div>

      <!-- Playlists tab -->
      <div v-if="activeTab === 'playlists'" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="pl in results.playlists"
          :key="pl.id"
          class="group cursor-pointer"
          @click="$router.push(`/playlist/${pl.id}`)"
        >
          <CoverImage :src="pl.coverImgUrl" :alt="pl.name" size="md" playable />
          <p class="mt-2 line-clamp-2 text-sm">{{ pl.name }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { cloudSearch, getSearchHotDetail, getSearchSuggest } from '@/api/search'
import CoverImage from '@/components/common/CoverImage.vue'
import SongTable from '@/components/common/SongTable.vue'
import { usePlayerStore } from '@/stores/player'
import { usePlayer } from '@/composables/usePlayer'
import { useSearchHistory } from '@/composables/useSearchHistory'
import type { Song } from '@/stores/player'

const route = useRoute()
const playerStore = usePlayerStore()
const { playSongList } = usePlayer()
const { history: searchHistory, addToHistory, removeFromHistory, clearHistory } = useSearchHistory()

const query = ref('')
const hasSearched = ref(false)
const searchLoading = ref(false)
const hotSearches = ref<any[]>([])
const suggestions = ref<any[]>([])
const activeTab = ref('songs')

const tabs = [
  { label: '歌曲', value: 'songs' },
  { label: '歌手', value: 'artists' },
  { label: '专辑', value: 'albums' },
  { label: '歌单', value: 'playlists' }
]

const results = ref<{
  songs: Song[]
  artists: any[]
  albums: any[]
  playlists: any[]
}>({ songs: [], artists: [], albums: [], playlists: [] })


onMounted(async () => {
  try {
    const res: any = await getSearchHotDetail()
    hotSearches.value = res?.data || []
  } catch {}

  // Check if query from route
  if (route.query.q) {
    query.value = route.query.q as string
    doSearch()
  }
})

// Search suggestions with debounce (300ms)
let suggestTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (val) => {
  if (suggestTimer) clearTimeout(suggestTimer)
  if (!val.trim() || hasSearched.value) {
    suggestions.value = []
    return
  }
  suggestTimer = setTimeout(async () => {
    try {
      const res: any = await getSearchSuggest(val.trim())
      const apiSuggestions = res?.result?.allMatch || []

      // Merge with local history
      const historySuggestions = searchHistory.value
        .filter(item => item.keyword.toLowerCase().includes(val.trim().toLowerCase()))
        .map(item => ({ name: item.keyword, source: 'history' }))

      // Combine and deduplicate
      const merged = [...historySuggestions]
      for (const suggestion of apiSuggestions) {
        if (!merged.some(s => s.name.toLowerCase() === suggestion.name.toLowerCase())) {
          merged.push({ ...suggestion, source: 'api' })
        }
      }

      suggestions.value = merged.slice(0, 10)
    } catch {
      suggestions.value = []
    }
  }, 300)
})

onUnmounted(() => {
  if (suggestTimer) clearTimeout(suggestTimer)
})

async function doSearch() {
  const keyword = query.value.trim()
  if (!keyword) return

  hasSearched.value = true
  searchLoading.value = true
  suggestions.value = []

  try {
    // Search songs (type=1), artists (type=100), albums (type=10), playlists (type=1000)
    const [songsRes, artistsRes, albumsRes, playlistsRes] = await Promise.allSettled([
      cloudSearch(keyword, 1, 30),
      cloudSearch(keyword, 100, 20),
      cloudSearch(keyword, 10, 20),
      cloudSearch(keyword, 1000, 20)
    ])

    if (songsRes.status === 'fulfilled') {
      results.value.songs = ((songsRes.value as any)?.result?.songs || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0,
        fee: s.fee || 0
      }))
    }
    if (artistsRes.status === 'fulfilled') results.value.artists = (artistsRes.value as any)?.result?.artists || []
    if (albumsRes.status === 'fulfilled') results.value.albums = (albumsRes.value as any)?.result?.albums || []
    if (playlistsRes.status === 'fulfilled') results.value.playlists = (playlistsRes.value as any)?.result?.playlists || []

    // Add to search history with result count
    const totalResults = results.value.songs.length + results.value.artists.length + results.value.albums.length + results.value.playlists.length
    addToHistory(keyword, totalResults)
  } finally {
    searchLoading.value = false
  }
}

function handlePlaySong(song: Song) {
  playSongList(results.value.songs, results.value.songs.findIndex(s => s.id === song.id))
}
</script>
