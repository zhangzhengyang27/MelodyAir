<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-8"><LoadingSpinner /></div>

    <template v-else-if="playlist">
      <!-- Header -->
      <div class="flex gap-6">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img :src="playlist.coverImgUrl + '?param=400y400'" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="text-display">{{ playlist.name }}</h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            {{ playlist.creator?.nickname }}
            · {{ formatPlayCount(playlist.playCount) }}次播放
            · {{ songs.length }}首歌曲
          </p>
          <p v-if="playlist.description" class="mt-2 line-clamp-2 text-xs text-neutral-400">{{ playlist.description }}</p>
          <div class="mt-4 flex gap-3">
            <CoralButton @click="playAll">播放全部</CoralButton>
            <button
              class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              :class="isSubscribed ? 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]' : 'border border-[#FF5A5F] text-[#FF5A5F] hover:bg-[#FFF5F3] dark:border-[#FF7F66] dark:text-[#FF7F66] dark:hover:bg-[rgba(255,90,95,0.10)]'"
              :disabled="subLoading"
              @click="handleSubscribe"
            >
              {{ isSubscribed ? '已收藏' : '收藏' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Songs -->
      <SongTable :songs="songs" :loading="songsLoading" @play="handlePlaySong" />

      <!-- Similar playlists -->
      <section v-if="simiPlaylists.length > 0">
        <SectionHeader title="相似歌单" />
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <div
            v-for="item in simiPlaylists"
            :key="item.id"
            class="group cursor-pointer"
            @click="$router.push(`/playlist/${item.id}`)"
          >
            <CoverImage :src="item.coverImgUrl" :alt="item.name" size="md" playable />
            <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
          </div>
        </div>
      </section>

      <!-- Comments -->
      <CommentSection v-if="playlistId" :type="2" :id="playlistId" title="评论" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPlaylistDetail, getPlaylistTrackAll, getPlaylistDetailDynamic } from '@/api/playlist'
import { getSimiPlaylist } from '@/api/simi'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import CommentSection from '@/components/common/CommentSection.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/composables/useToast'
import { formatPlayCount } from '@/utils/format'
import type { Song } from '@/stores/player'

const route = useRoute()
const { playSongList } = usePlayer()
const userStore = useUserStore()

const loading = ref(false)
const songsLoading = ref(false)
const subLoading = ref(false)
const isSubscribed = ref(false)
const playlistId = ref(0)
const playlist = ref<any>(null)
const songs = ref<Song[]>([])
const simiPlaylists = ref<any[]>([])

async function fetchData(id: number) {
  loading.value = true
  songsLoading.value = true
  playlistId.value = id
  try {
    const [res, dynamicRes, simiRes] = await Promise.allSettled([
      getPlaylistDetail(id),
      userStore.isAccountLoggedIn ? getPlaylistDetailDynamic(id) : Promise.reject(),
      getSimiPlaylist(id)
    ])
    if (res.status === 'fulfilled') {
      playlist.value = (res.value as any)?.playlist
    }
    if (dynamicRes.status === 'fulfilled') {
      isSubscribed.value = (dynamicRes.value as any)?.subscribed ?? false
    }
    if (simiRes.status === 'fulfilled') {
      simiPlaylists.value = (simiRes.value as any)?.playlists || []
    }
    // ★ 参照 YPM：用 trackIds 的长度判断是否需要获取全部歌曲
    // /playlist/detail 返回的 trackIds 始终完整，但 tracks 可能不完整
    const trackCount = playlist.value?.trackIds?.length || 0
    if (trackCount > 0) {
      // 分批获取所有歌曲（每次最多 500 首）
      const allSongs: any[] = []
      let offset = 0
      const BATCH_SIZE = 500
      while (offset < trackCount) {
        const batchRes: any = await getPlaylistTrackAll(id, Math.min(BATCH_SIZE, trackCount - offset), offset)
        if (batchRes?.songs) allSongs.push(...batchRes.songs)
        offset += BATCH_SIZE
      }
      songs.value = allSongs.map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0,
        fee: s.fee || 0
      }))
    }
  } finally {
    loading.value = false
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
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}

function playAll() {
  if (songs.value.length > 0) playSongList(songs.value, 0)
}

async function handleSubscribe() {
  if (!userStore.isAccountLoggedIn) {
    showToast('请先登录', { type: 'warning' })
    return
  }
  subLoading.value = true
  try {
    const ok = await userStore.toggleSubscribePlaylist(playlistId.value)
    if (ok) {
      isSubscribed.value = !isSubscribed.value
      showToast(isSubscribed.value ? '已收藏' : '已取消收藏')
    } else {
      showToast('操作失败', { type: 'error' })
    }
  } finally {
    subLoading.value = false
  }
}
</script>
