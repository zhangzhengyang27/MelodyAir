<template>
  <div class="space-y-8">
    <div v-if="!userStore.isAccountLoggedIn" class="flex min-h-[40vh] items-center justify-center">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-[#1F1F2E]">
          <Calendar class="h-8 w-8 text-neutral-400" />
        </div>
        <h2 class="text-subtitle font-semibold">登录后查看</h2>
        <p class="mt-2 text-sm text-neutral-500">每日推荐需要登录后才能使用</p>
        <RouterLink
          to="/login"
          class="mt-4 inline-block rounded-xl bg-[#FF5A5F] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
        >
          去登录
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <!-- 推荐歌单 -->
      <section v-if="playlists.length > 0">
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
          </div>
        </div>
      </section>

      <!-- 推荐歌曲 -->
      <section>
        <SectionHeader title="推荐歌曲" />
        <SkeletonSongTable v-if="loading" :rows="8" />
        <SongTable v-else :songs="songs" @play="handlePlaySong" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getRecommendSongs, getRecommendResource } from '@/api/personalized'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { Calendar } from 'lucide-vue-next'
import CoverImage from '@/components/common/CoverImage.vue'
import SongTable from '@/components/common/SongTable.vue'
import SkeletonSongTable from '@/components/common/skeleton/SkeletonSongTable.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const userStore = useUserStore()
const { playSongList } = usePlayer()

const loading = ref(false)
const playlists = ref<any[]>([])
const songs = ref<Song[]>([])

onMounted(async () => {
  if (!userStore.isAccountLoggedIn) return
  loading.value = true
  try {
    const [songRes, playlistRes] = await Promise.allSettled([
      getRecommendSongs(),
      getRecommendResource()
    ])
    if (songRes.status === 'fulfilled') {
      const raw = (songRes.value as any)?.data?.dailySongs || (songRes.value as any)?.recommend || []
      songs.value = raw.map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0,
        fee: s.fee || 0
      }))
    }
    if (playlistRes.status === 'fulfilled') {
      playlists.value = (playlistRes.value as any)?.recommend || []
    }
  } finally {
    loading.value = false
  }
})

function handlePlaySong(song: Song) {
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}
</script>
