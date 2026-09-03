<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="4" />

    <template v-else-if="song">
      <!-- 返回按钮 -->
      <button
        class="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-[#FF5A5F] dark:text-[#A1A1B5] dark:hover:bg-white/6"
        aria-label="返回"
        @click="$router.back()"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>

      <!-- Header -->
      <div class="flex flex-col gap-6 sm:flex-row">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img
            v-if="song.album.picUrl"
            :src="song.album.picUrl + '?param=400y400'"
            :alt="song.album.name"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="flex min-w-0 flex-col justify-center">
          <div class="flex items-center gap-2">
            <h1 class="text-display">{{ song.name }}</h1>
            <span
              v-if="song.fee === 1"
              class="inline-flex shrink-0 items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >VIP</span>
          </div>
          <p class="mt-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            <template v-for="(artist, idx) in song.artists" :key="artist.id">
              <router-link
                :to="`/artist/${artist.id}`"
                class="transition-colors hover:text-coral-500 dark:hover:text-coral-400"
              >{{ artist.name }}</router-link>
              <span v-if="idx < song.artists.length - 1"> / </span>
            </template>
          </p>
          <p class="mt-1 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            专辑：
            <router-link
              v-if="song.album.id"
              :to="`/album/${song.album.id}`"
              class="transition-colors hover:text-coral-500 dark:hover:text-coral-400"
            >{{ song.album.name }}</router-link>
            <template v-else>{{ song.album.name }}</template>
            · 时长 {{ formatDuration(song.duration) }}
          </p>
          <div class="mt-4 flex gap-3">
            <CoralButton @click="play">
              <Play class="mr-1 h-4 w-4 fill-current" />
              播放
            </CoralButton>
          </div>
        </div>
      </div>
    </template>

    <!-- 未找到 -->
    <div v-else class="py-20 text-center">
      <p class="text-neutral-400">未找到该歌曲，链接可能已失效</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Play } from 'lucide-vue-next'
import { getSongDetail } from '@/api/song'
import CoralButton from '@/components/common/CoralButton.vue'
import SkeletonDetail from '@/components/common/skeleton/SkeletonDetail.vue'
import { usePlayer } from '@/composables/usePlayer'
import { formatDuration } from '@/utils/format'
import type { Song } from '@/stores/player'

const route = useRoute()
const { playSongList } = usePlayer()

const loading = ref(false)
const song = ref<Song | null>(null)

async function fetchData(id: number) {
  loading.value = true
  song.value = null
  try {
    const res = await getSongDetail(id)
    const item = (res as any)?.songs?.[0]
    if (!item) return
    song.value = {
      id: item.id,
      name: item.name,
      artists: item.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      album: { id: item.al?.id || 0, name: item.al?.name || '', picUrl: item.al?.picUrl || '' },
      duration: item.dt || 0,
      fee: item.fee || 0
    }
    document.title = `${song.value.name} - MelodyAir`
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

function play() {
  if (song.value) playSongList([song.value], 0)
}
</script>
