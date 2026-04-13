<template>
  <div class="space-y-6">
    <div v-if="!userStore.loggedIn" class="flex min-h-[40vh] items-center justify-center">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <span class="text-4xl">🎵</span>
        </div>
        <h2 class="text-subtitle font-semibold">登录后查看</h2>
        <p class="mt-2 text-sm text-neutral-500">登录后即可查看你的个人音乐库</p>
        <RouterLink
          to="/login"
          class="mt-4 inline-block rounded-xl bg-[#FF5A5F] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
        >
          去登录
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <!-- User info -->
      <div class="flex items-center gap-4">
        <img
          :src="userStore.profile?.avatarUrl + '?param=200y200'"
          alt="avatar"
          class="h-16 w-16 rounded-full object-cover ring-2 ring-[#FFE8E3] dark:ring-[#9E2F33]"
        />
        <div>
          <h1 class="text-title">{{ userStore.profile?.nickname }}</h1>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-neutral-700 dark:text-[#FF7F66]' : 'text-neutral-500'"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Liked songs -->
      <section v-if="activeTab === 'liked'">
        <SongTable :songs="likedSongs" :loading="loading" @play="handlePlayLiked" />
      </section>

      <!-- My playlists -->
      <section v-if="activeTab === 'playlists'">
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div
            v-for="pl in playlists"
            :key="pl.id"
            class="cursor-pointer"
            @click="$router.push(`/playlist/${pl.id}`)"
          >
            <CoverImage :src="pl.coverImgUrl" :alt="pl.name" size="md" playable />
            <p class="mt-2 line-clamp-2 text-sm">{{ pl.name }}</p>
          </div>
        </div>
      </section>

      <!-- Recent plays -->
      <section v-if="activeTab === 'recent'">
        <SongTable :songs="recentSongs" :loading="loading" @play="handlePlayRecent" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getUserPlaylist, getLikeList } from '@/api/user'
import { getSongDetail } from '@/api/song'
import { getRecentSong } from '@/api/record'
import SongTable from '@/components/common/SongTable.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const userStore = useUserStore()
const { playSongList } = usePlayer()

const loading = ref(false)
const activeTab = ref('liked')
const likedSongs = ref<Song[]>([])
const playlists = ref<any[]>([])
const recentSongs = ref<Song[]>([])

const tabs = [
  { label: '我喜欢的', value: 'liked' },
  { label: '我的歌单', value: 'playlists' },
  { label: '最近播放', value: 'recent' }
]

onMounted(async () => {
  if (!userStore.profile) return
  loading.value = true
  const uid = userStore.profile.userId

  try {
    const [playlistRes, likeRes, recentRes] = await Promise.allSettled([
      getUserPlaylist(uid),
      getLikeList(uid),
      getRecentSong()
    ])

    if (playlistRes.status === 'fulfilled') {
      playlists.value = (playlistRes.value as any)?.playlist || []
    }

    if (likeRes.status === 'fulfilled') {
      const ids = (likeRes.value as any)?.ids || []
      if (ids.length > 0) {
        const idsStr = ids.slice(0, 50).join(',')
        const songRes: any = await getSongDetail(idsStr)
        likedSongs.value = (songRes?.songs || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
          album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
          duration: s.dt || 0
        }))
      }
    }

    if (recentRes.status === 'fulfilled') {
      recentSongs.value = ((recentRes.value as any)?.data?.list || []).map((item: any) => {
        const s = item.data
        return {
          id: s.id,
          name: s.name,
          artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
          album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
          duration: s.dt || 0
        }
      })
    }
  } finally {
    loading.value = false
  }
})

function handlePlayLiked(song: Song) {
  playSongList(likedSongs.value, likedSongs.value.findIndex(s => s.id === song.id))
}

function handlePlayRecent(song: Song) {
  playSongList(recentSongs.value, recentSongs.value.findIndex(s => s.id === song.id))
}
</script>
