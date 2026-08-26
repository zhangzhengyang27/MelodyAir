<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="8" />

    <template v-else-if="album">
      <!-- Header -->
      <div class="flex gap-6">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img :src="album.picUrl + '?param=400y400'" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="text-display">{{ album.name }}</h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            {{ album.artist?.name }}
            · {{ formatDate(album.publishTime) }}
            · {{ songs.length }}首歌曲
          </p>
          <p v-if="album.description" class="mt-2 line-clamp-2 text-xs text-neutral-400">{{ album.description }}</p>
          <div class="mt-4 flex gap-3">
            <CoralButton @click="playAll">播放全部</CoralButton>
            <button
              class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              :class="isSubbed ? 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]' : 'border border-[#FF5A5F] text-[#FF5A5F] hover:bg-[#FFF5F3] dark:border-[#FF7F66] dark:text-[#FF7F66] dark:hover:bg-[rgba(255,90,95,0.10)]'"
              :disabled="subLoading"
              @click="handleSubAlbum"
            >
              {{ isSubbed ? '已收藏' : '收藏' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Songs -->
      <SongTable :songs="songs" @play="handlePlaySong" />

      <!-- Comments -->
      <CommentSection v-if="albumId" :type="3" :id="albumId" title="评论" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getAlbumDetail, getAlbumDetailDynamic } from '@/api/album'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import CommentSection from '@/components/common/CommentSection.vue'
import SkeletonDetail from '@/components/common/skeleton/SkeletonDetail.vue'
import { usePlayer } from '@/composables/usePlayer'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import type { Song } from '@/stores/player'

const route = useRoute()
const { playSongList } = usePlayer()
const userStore = useUserStore()

const loading = ref(false)
const subLoading = ref(false)
const isSubbed = ref(false)
const albumId = ref(0)
const album = ref<any>(null)
const songs = ref<Song[]>([])

async function fetchData(id: number) {
  loading.value = true
  albumId.value = id
  try {
    const [res, dynamicRes] = await Promise.allSettled([
      getAlbumDetail(id),
      userStore.isAccountLoggedIn ? getAlbumDetailDynamic(id) : Promise.reject()
    ])
    if (res.status === 'fulfilled') {
      album.value = (res.value as any)?.album
      songs.value = ((res.value as any)?.songs || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0,
        fee: s.fee || 0
      }))
    }
    if (dynamicRes.status === 'fulfilled') {
      isSubbed.value = (dynamicRes.value as any)?.isSub ?? false
    }
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

function handlePlaySong(song: Song) {
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}

function playAll() {
  if (songs.value.length > 0) playSongList(songs.value, 0)
}

async function handleSubAlbum() {
  if (!userStore.isAccountLoggedIn) {
    showToast('请先登录', { type: 'warning' })
    return
  }
  subLoading.value = true
  try {
    const ok = await userStore.toggleSubAlbum(albumId.value)
    if (ok) {
      isSubbed.value = !isSubbed.value
      showToast(isSubbed.value ? '已收藏' : '已取消收藏')
    } else {
      showToast('操作失败', { type: 'error' })
    }
  } finally {
    subLoading.value = false
  }
}
</script>
