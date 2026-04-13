<template>
  <div class="space-y-6">
    <h1 class="text-title">排行榜</h1>

    <div v-if="loading" class="py-8"><LoadingSpinner /></div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="list in toplists"
        :key="list.id"
        class="cursor-pointer rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] dark:bg-neutral-800"
        @click="viewDetail(list.id, list.name)"
      >
        <div class="flex items-center gap-4">
          <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <img :src="list.coverImgUrl + '?param=200y200'" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold">{{ list.name }}</h3>
            <p class="mt-1 text-xs text-neutral-400">{{ list.updateFrequency }}</p>
            <div class="mt-2 space-y-0.5">
              <p v-for="(track, i) in list.tracks?.slice(0, 3)" :key="i" class="truncate text-xs text-neutral-500">
                <span class="font-medium" :class="i < 3 ? 'text-[#FF5A5F]' : ''">{{ i + 1 }}.</span>
                {{ track.first }} - {{ track.second }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail view -->
    <div v-if="detailVisible" class="space-y-4">
      <div class="flex items-center gap-4">
        <button class="text-neutral-400 hover:text-[#FF5A5F]" @click="detailVisible = false">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-subtitle font-semibold">{{ detailName }}</h2>
      </div>
      <SongTable :songs="detailSongs" :loading="detailLoading" @play="handlePlaySong" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getToplist, getToplistDetail } from '@/api/top'
import SongTable from '@/components/common/SongTable.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const { playSongList } = usePlayer()

const loading = ref(false)
const toplists = ref<any[]>([])
const detailVisible = ref(false)
const detailName = ref('')
const detailSongs = ref<Song[]>([])
const detailLoading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await getToplist()
    toplists.value = res?.list || []
  } finally {
    loading.value = false
  }
})

async function viewDetail(id: number, name: string) {
  detailName.value = name
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res: any = await getToplistDetail(id)
    detailSongs.value = (res?.songs || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
      duration: s.dt || 0
    }))
  } finally {
    detailLoading.value = false
  }
}

function handlePlaySong(song: Song) {
  playSongList(detailSongs.value, detailSongs.value.findIndex(s => s.id === song.id))
}
</script>
