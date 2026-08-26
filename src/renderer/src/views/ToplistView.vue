<template>
  <div class="space-y-6">
    <h1 class="text-title">排行榜</h1>

    <!-- Tab switch -->
    <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C]">
      <button
        v-for="tab in topTabs"
        :key="tab.value"
        class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="activeTopTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
        @click="activeTopTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 歌曲榜单 -->
    <div v-if="activeTopTab === 'songs'">
      <SkeletonCardGrid
        v-if="loading"
        :count="9"
        grid-class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      />

      <div v-else-if="toplists.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="list in toplists"
          :key="list.id"
          class="cursor-pointer rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] dark:bg-[#171722] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35),0_0_1px_rgba(255,255,255,0.05)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_1px_rgba(255,255,255,0.07)]"
          @click="viewDetail(list.id, list.name)"
        >
          <div class="flex items-center gap-4">
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
              <img :src="list.coverImgUrl + '?param=200y200'" alt="" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold">{{ list.name }}</h3>
              <p class="mt-1 text-xs text-neutral-400 dark:text-[#6B6B80]">{{ list.updateFrequency }}</p>
              <div class="mt-2 space-y-0.5">
                <p v-for="(track, i) in list.tracks?.slice(0, 3)" :key="i" class="truncate text-xs text-neutral-500 dark:text-[#6B6B80]">
                  <span class="font-medium" :class="i < 3 ? 'text-coral-500' : ''">{{ i + 1 }}.</span>
                  {{ track.first }} - {{ track.second }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="py-12 text-center text-neutral-400 dark:text-[#6B6B80]">暂无排行榜数据</div>
    </div>

    <!-- 歌手榜 -->
    <div v-if="activeTopTab === 'artists'">
      <SkeletonArtistGrid v-if="artistLoading" :count="16" />
      <div v-else-if="artistList.length > 0" class="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        <div
          v-for="(item, idx) in artistList"
          :key="item.id"
          class="cursor-pointer text-center"
          @click="$router.push(`/artist/${item.id}`)"
        >
          <div class="mx-auto h-24 w-24 overflow-hidden rounded-full shadow-md">
            <img :src="item.picUrl || item.img1v1Url" :alt="item.name" class="h-full w-full object-cover" />
          </div>
          <p class="mt-2 line-clamp-1 text-sm">
            <span class="font-bold" :class="idx < 3 ? 'text-[#FF5A5F]' : ''">{{ idx + 1 }}.</span>
            {{ item.name }}
          </p>
        </div>
      </div>
      <div v-else class="py-12 text-center text-neutral-400 dark:text-[#6B6B80]">暂无歌手榜数据</div>
    </div>

    <!-- 新歌速递 -->
    <div v-if="activeTopTab === 'new'">
      <SkeletonSongTable v-if="newSongLoading" :rows="8" />
      <SongTable v-else :songs="newSongs" @play="handlePlayNewSong" />
    </div>

    <!-- 详情视图 -->
    <div v-if="detailVisible" class="space-y-4">
      <div class="flex items-center gap-4">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-coral-500 dark:text-[#A1A1B5] dark:hover:bg-white/6"
          @click="detailVisible = false"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-subtitle font-semibold">{{ detailName }}</h2>
      </div>

      <!-- 错误提示 -->
      <div v-if="detailError" class="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
        加载失败：{{ detailError }}
        <button class="ml-2 underline" @click="viewDetail(detailId!, detailName)">重试</button>
      </div>

      <SongTable v-else :songs="detailSongs" :loading="detailLoading" @play="handlePlaySong" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getToplist, getToplistArtist, getTopSong } from '@/api/top'
import { getPlaylistDetail } from '@/api/playlist'
import SongTable from '@/components/common/SongTable.vue'
import SkeletonCardGrid from '@/components/common/skeleton/SkeletonCardGrid.vue'
import SkeletonArtistGrid from '@/components/common/skeleton/SkeletonArtistGrid.vue'
import SkeletonSongTable from '@/components/common/skeleton/SkeletonSongTable.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const { playSongList } = usePlayer()

const topTabs = [
  { label: '歌曲榜', value: 'songs' },
  { label: '歌手榜', value: 'artists' },
  { label: '新歌速递', value: 'new' }
]
const activeTopTab = ref('songs')
const loading = ref(false)
const toplists = ref<any[]>([])
const detailVisible = ref(false)
const detailId = ref<number | null>(null)
const detailName = ref('')
const detailSongs = ref<Song[]>([])
const detailLoading = ref(false)
const detailError = ref('')

const artistLoading = ref(false)
const artistList = ref<any[]>([])
const newSongLoading = ref(false)
const newSongs = ref<Song[]>([])

const NEW_SONG_TYPES = [
  { label: '全部', value: 0 },
  { label: '华语', value: 7 },
  { label: '欧美', value: 96 },
  { label: '日本', value: 8 },
  { label: '韩国', value: 16 }
]
const newSongType = ref(0)

onMounted(async () => {
  loading.value = true
  try {
    const res = await getToplist()
    toplists.value = (res as { list?: unknown[] })?.list || []
  } catch (err: unknown) {
    if (import.meta.env.DEV) console.error('加载排行榜失败:', err)
  } finally {
    loading.value = false
  }
})

watch(activeTopTab, async (tab) => {
  if (tab === 'artists' && artistList.value.length === 0) await fetchArtistList()
  if (tab === 'new') await fetchNewSongs()
})

async function fetchArtistList() {
  artistLoading.value = true
  try {
    const res = await getToplistArtist()
    artistList.value = (res as { list?: { artists?: unknown[] }; artists?: unknown[] })?.list?.artists || (res as { artists?: unknown[] })?.artists || []
  } finally {
    artistLoading.value = false
  }
}

async function fetchNewSongs() {
  newSongLoading.value = true
  try {
    const res = await getTopSong(newSongType.value)
    newSongs.value = ((res as { data?: Song[] })?.data || []).map((s: Song) => ({
      id: s.id,
      name: s.name,
      artists: s.ar?.map((a: { id: number; name: string }) => ({ id: a.id, name: a.name })) || [],
      album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
      duration: s.dt || 0,
      fee: s.fee || 0
    }))
  } finally {
    newSongLoading.value = false
  }
}

function handlePlayNewSong(song: Song) {
  playSongList(newSongs.value, newSongs.value.findIndex(s => s.id === song.id))
}

async function viewDetail(id: number, name: string) {
  detailId.value = id
  detailName.value = name
  detailVisible.value = true
  detailError.value = ''
  detailLoading.value = true

  try {
    const res = await getPlaylistDetail(id)
    const rawSongs = res?.playlist?.tracks || []
    detailSongs.value = (rawSongs as Song[]).map((s: Song) => ({
      id: s.id,
      name: s.name || '',
      artists: s.ar?.map((a: { id?: number; name?: string }) => ({ id: a.id || 0, name: a.name || '' })) || [],
      album: (() => {
        const al = s.al || {}
        return { id: al.id || 0, name: al.name || '', picUrl: al.picUrl || '' }
      })(),
      duration: s.dt || 0,
      fee: s.fee || 0
    }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '接口请求异常'
    if (import.meta.env.DEV) console.error('加载榜单详情失败:', err)
    detailError.value = msg
    detailSongs.value = []
  } finally {
    detailLoading.value = false
  }
}

function handlePlaySong(song: Song) {
  playSongList(detailSongs.value, detailSongs.value.findIndex(s => s.id === song.id))
}
</script>
