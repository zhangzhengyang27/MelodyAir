<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="8" />

    <!-- 加载失败 / 无效 ID -->
    <div v-else-if="error" class="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <Frown class="h-12 w-12 text-neutral-400" />
      <p class="mt-4 text-base font-medium text-neutral-700 dark:text-[#E9E9F2]">{{ error }}</p>
      <button
        class="mt-4 rounded-xl bg-[#FF5A5F] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
        @click="$router.back()"
      >
        返回上一页
      </button>
    </div>

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
            <CoverImage :src="item.coverImgUrl" :alt="item.name" size="md" />
            <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPlaylistDetail, getPlaylistTrackAll, getPlaylistDetailDynamic } from '@/api/playlist'
import { getSimiPlaylist } from '@/api/simi'
import { Frown } from 'lucide-vue-next'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import SkeletonDetail from '@/components/common/skeleton/SkeletonDetail.vue'
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
const error = ref('')

async function fetchData(id: number) {
  loading.value = true
  songsLoading.value = true
  error.value = ''
  playlist.value = null
  songs.value = []
  simiPlaylists.value = []
  playlistId.value = id
  try {
    const [res, dynamicRes, simiRes] = await Promise.allSettled([
      getPlaylistDetail(id),
      userStore.isAccountLoggedIn ? getPlaylistDetailDynamic(id) : Promise.reject(),
      getSimiPlaylist(id)
    ])
    if (res.status === 'fulfilled') {
      const raw = res.value as any
      // 兼容两种格式：API 返回 { code, playlist }，DB 缓存直接返回歌单对象
      if (raw?.playlist) {
        playlist.value = raw.playlist
      } else if (raw?.name && (raw?.id || raw?.playlistId)) {
        // DB 缓存格式：playlistId → id，补齐字段
        playlist.value = { ...raw, id: raw.id || raw.playlistId }
      }
    }
    if (!playlist.value) {
      error.value = '歌单不存在或加载失败'
      return
    }
    if (dynamicRes.status === 'fulfilled') {
      isSubscribed.value = (dynamicRes.value as any)?.subscribed ?? false
    }
    if (simiRes.status === 'fulfilled') {
      simiPlaylists.value = (simiRes.value as any)?.playlists || []
    }
    // ★ 参照 YPM：用 trackIds 的长度判断是否需要获取全部歌曲
    // /playlist/detail 返回的 trackIds 始终完整，但 tracks 可能不完整
    // DB 缓存可能没有 trackIds，但有 trackCount 字段，用它兜底
    const trackCount = playlist.value?.trackIds?.length || playlist.value?.trackCount || 0
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
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '加载失败，请重试'
  } finally {
    loading.value = false
    songsLoading.value = false
  }
}

function resolveId(raw: string | string[] | undefined): number {
  const str = Array.isArray(raw) ? raw[0] : raw
  if (!str) return NaN
  // 兼容异常格式如 "2420545066:1"，提取前缀数字
  const match = String(str).match(/^(\d+)/)
  return match ? Number(match[1]) : NaN
}

onMounted(() => {
  const id = resolveId(route.params.id as string)
  if (id) {
    fetchData(id)
  } else {
    error.value = '无效的歌单 ID'
  }
})

watch(() => route.params.id, (newId) => {
  const id = resolveId(newId as string)
  if (id) fetchData(id)
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
