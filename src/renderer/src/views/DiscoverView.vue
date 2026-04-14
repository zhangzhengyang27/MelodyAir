<template>
  <div class="space-y-8">
    <!-- Banner -->
    <section v-if="banners.length > 0">
      <div class="relative h-56 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
        <div
          v-for="(banner, i) in banners"
          :key="i"
          v-show="i === currentBanner"
          class="absolute inset-0 transition-opacity duration-500"
        >
          <img
            :src="banner.imageUrl"
            :alt="banner.typeTitle"
            class="h-full w-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <!-- Dots -->
        <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          <button
            v-for="(_, i) in banners"
            :key="i"
            class="h-1.5 rounded-full transition-all"
            :class="i === currentBanner ? 'w-4 bg-white' : 'w-1.5 bg-white/50'"
            @click="currentBanner = i"
          />
        </div>
      </div>
    </section>

    <!-- Recommended playlists -->
    <section>
      <SectionHeader title="推荐歌单" />
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <div
          v-for="item in playlists"
          :key="item.id"
          class="group cursor-pointer"
          @click="$router.push(`/playlist/${item.id}`)"
        >
          <CoverImage :src="item.picUrl" :alt="item.name" size="md" playable />
          <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
          <p class="mt-0.5 text-xs text-neutral-400">{{ formatPlayCount(item.playCount) }}</p>
        </div>
      </div>
    </section>

    <!-- Recommended new songs -->
    <section>
      <SectionHeader title="推荐新歌" />
      <SongTable :songs="newSongs" :loading="loading" @play="handlePlaySong" />
    </section>

    <!-- Recommended MVs -->
    <section v-if="mvs.length > 0">
      <SectionHeader title="推荐MV" />
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="item in mvs"
          :key="item.id"
          class="group cursor-pointer"
          @click="$router.push(`/mv/${item.id}`)"
        >
          <div class="relative overflow-hidden rounded-lg">
            <img :src="item.picUrl" :alt="item.name" class="h-36 w-full object-cover transition-transform group-hover:scale-105" />
          </div>
          <p class="mt-2 line-clamp-1 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
          <p class="text-xs text-neutral-400">{{ item.artistName }}</p>
        </div>
      </div>
    </section>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getBanner, getPersonalized, getPersonalizedNewSong, getPersonalizedMv } from '@/api/personalized'
import CoverImage from '@/components/common/CoverImage.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import SongTable from '@/components/common/SongTable.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayerStore } from '@/stores/player'
import { usePlayer } from '@/composables/usePlayer'
import { formatPlayCount } from '@/utils/format'
import type { Song } from '@/stores/player'

const playerStore = usePlayerStore()
const { playSongList } = usePlayer()

const loading = ref(false)
const banners = ref<any[]>([])
const playlists = ref<any[]>([])
const newSongs = ref<Song[]>([])
const mvs = ref<any[]>([])
const currentBanner = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  loading.value = true
  try {
    const [bannerRes, playlistRes, songRes, mvRes] = await Promise.allSettled([
      getBanner(),
      getPersonalized(12),
      getPersonalizedNewSong(12),
      getPersonalizedMv()
    ])

    if (bannerRes.status === 'fulfilled') {
      banners.value = (bannerRes.value as any)?.banners || []
    }
    if (playlistRes.status === 'fulfilled') {
      playlists.value = (playlistRes.value as any)?.result || []
    }
    if (songRes.status === 'fulfilled') {
      const rawResult = (songRes.value as any)?.result || []
      newSongs.value = rawResult.map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.song?.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.song?.album?.id || 0, name: s.song?.album?.name || '', picUrl: s.song?.album?.picUrl || s.picUrl || '' },
        duration: s.song?.duration || 0,
        fee: s.song?.fee || 0
      }))
    }
    if (mvRes.status === 'fulfilled') {
      mvs.value = (mvRes.value as any)?.result || []
    }
  } finally {
    loading.value = false
  }

  // Auto-rotate banner
  bannerTimer = setInterval(() => {
    if (banners.value.length > 0) {
      currentBanner.value = (currentBanner.value + 1) % banners.value.length
    }
  }, 5000)
})

onUnmounted(() => {
  if (bannerTimer) clearInterval(bannerTimer)
})

function handlePlaySong(song: Song) {
  playSongList(newSongs.value, newSongs.value.findIndex(s => s.id === song.id))
}
</script>
