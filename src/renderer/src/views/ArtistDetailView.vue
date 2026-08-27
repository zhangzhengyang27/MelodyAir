<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="8" />

    <template v-else-if="artist">
      <!-- Header -->
      <div class="flex gap-6">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img v-if="artist.avatar" :src="artist.avatar + '?param=400y400'" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="text-display">{{ artist.name }}</h1>
          <p v-if="artist.identifyTag" class="mt-1 text-sm text-[#FF5A5F]">{{ artist.identifyTag }}</p>
          <p class="mt-2 line-clamp-3 text-sm text-neutral-500 dark:text-[#A1A1B5]">{{ artist.briefDesc }}</p>
          <div class="mt-4 flex gap-3">
            <button
              class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              :class="isSubbed ? 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]' : 'border border-[#FF5A5F] text-[#FF5A5F] hover:bg-[#FFF5F3] dark:border-[#FF7F66] dark:text-[#FF7F66] dark:hover:bg-[rgba(255,90,95,0.10)]'"
              :disabled="subLoading"
              @click="handleSubArtist"
            >
              {{ isSubbed ? '已关注' : '关注' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C]">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Hot songs -->
      <SongTable v-if="activeTab === 'songs'" :songs="hotSongs" :loading="songsLoading" @play="handlePlaySong" />

      <!-- Albums -->
      <div v-if="activeTab === 'albums'" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="album in albums"
          :key="album.id"
          class="cursor-pointer"
          @click="$router.push(`/album/${album.id}`)"
        >
          <CoverImage :src="album.picUrl" :alt="album.name" size="md" />
          <p class="mt-2 line-clamp-1 text-sm">{{ album.name }}</p>
          <p class="text-xs text-neutral-400">{{ formatDate(album.publishTime) }}</p>
        </div>
      </div>

      <!-- MVs -->
      <div v-if="activeTab === 'mvs'" class="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div
          v-for="mv in mvs"
          :key="mv.id"
          class="cursor-pointer"
          @click="$router.push(`/mv/${mv.id}`)"
        >
          <div class="overflow-hidden rounded-lg">
            <img :src="mv.imgurl" alt="" class="h-36 w-full object-cover" />
          </div>
          <p class="mt-2 line-clamp-1 text-sm">{{ mv.name }}</p>
        </div>
      </div>

      <!-- Description -->
      <div v-if="activeTab === 'desc'" class="space-y-4">
        <p v-if="desc" class="text-sm leading-relaxed text-neutral-700 dark:text-[#A1A1B5]">{{ desc }}</p>
        <p v-else class="text-sm text-neutral-400">暂无简介</p>
      </div>

      <!-- Similar artists -->
      <section v-if="simiArtists.length > 0">
        <SectionHeader title="相似歌手" />
        <div class="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          <div
            v-for="item in simiArtists"
            :key="item.id"
            class="cursor-pointer text-center"
            @click="$router.push(`/artist/${item.id}`)"
          >
            <div class="mx-auto h-24 w-24 overflow-hidden rounded-full shadow-md">
              <img :src="item.picUrl || item.img1v1Url" :alt="item.name" class="h-full w-full object-cover" />
            </div>
            <p class="mt-2 line-clamp-1 text-sm">{{ item.name }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getArtistDetail, getArtistDetailDynamic, getArtistSongs, getArtistAlbum, getArtistMv, getArtistDesc } from '@/api/artist'
import { getSimiArtist } from '@/api/simi'
import SongTable from '@/components/common/SongTable.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
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
const songsLoading = ref(false)
const subLoading = ref(false)
const isSubbed = ref(false)
const artistId = ref(0)
const artist = ref<any>(null)
const artistDynamic = ref<any>(null)
const hotSongs = ref<Song[]>([])
const albums = ref<any[]>([])
const mvs = ref<any[]>([])
const desc = ref('')
const simiArtists = ref<any[]>([])
const activeTab = ref('songs')

const tabs = [
  { label: '热门歌曲', value: 'songs' },
  { label: '专辑', value: 'albums' },
  { label: 'MV', value: 'mvs' },
  { label: '简介', value: 'desc' }
]

let fetchVersion = 0

async function fetchData(id: number) {
  const currentVersion = ++fetchVersion
  loading.value = true
  artistId.value = id
  isSubbed.value = false
  try {
    const [detailRes, dynamicRes, descRes, simiRes] = await Promise.allSettled([
      getArtistDetail(id),
      userStore.isAccountLoggedIn ? getArtistDetailDynamic(id) : Promise.reject(),
      getArtistDesc(id),
      getSimiArtist(id)
    ])
    // 竞态守卫：如果已有更新的请求发起，丢弃本次过期响应
    if (currentVersion !== fetchVersion) return
    if (detailRes.status === 'fulfilled') {
      const data = (detailRes.value as any)?.data?.artist || (detailRes.value as any)?.artist
      if (data) {
        artist.value = {
          name: data.name,
          avatar: data.picUrl || data.img1v1Url || '',
          briefDesc: data.briefDesc || '',
          identifyTag: data.identify?.imageDesc || ''
        }
      }
    }
    if (dynamicRes.status === 'fulfilled') {
      artistDynamic.value = (dynamicRes.value as any)?.data || {}
      isSubbed.value = (dynamicRes.value as any)?.data?.isSub ?? (dynamicRes.value as any)?.isSub ?? false
    }
    if (descRes.status === 'fulfilled') {
      const descData = (descRes.value as any)
      desc.value = descData?.briefDesc || ''
    }
    if (simiRes.status === 'fulfilled') {
      simiArtists.value = (simiRes.value as any)?.artists || []
    }
  } finally {
    loading.value = false
  }

  songsLoading.value = true
  try {
    // 竞态守卫
    if (currentVersion !== fetchVersion) return
    const [songsRes, albumRes, mvRes] = await Promise.allSettled([
      getArtistSongs(id),
      getArtistAlbum(id),
      getArtistMv(id)
    ])
    if (songsRes.status === 'fulfilled') {
      const resData = songsRes.value as any
      // 从 /artists 响应中提取歌手信息（与 hotSongs 数据一致，覆盖 detail 接口可能的错误）
      const songArtist = resData?.artist
      if (songArtist) {
        artist.value = {
          name: songArtist.name,
          avatar: songArtist.picUrl || songArtist.img1v1Url || '',
          briefDesc: songArtist.briefDesc || artist.value?.briefDesc || '',
          identifyTag: artist.value?.identifyTag || ''
        }
      }
      hotSongs.value = ((resData)?.hotSongs || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0,
        fee: s.fee || 0
      }))
    }
    if (albumRes.status === 'fulfilled') albums.value = (albumRes.value as any)?.hotAlbums || []
    if (mvRes.status === 'fulfilled') mvs.value = (mvRes.value as any)?.mvs || []
  } finally {
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
  playSongList(hotSongs.value, hotSongs.value.findIndex(s => s.id === song.id))
}

async function handleSubArtist() {
  if (!userStore.isAccountLoggedIn) {
    showToast('请先登录', { type: 'warning' })
    return
  }
  subLoading.value = true
  try {
    const ok = await userStore.toggleSubArtist(artistId.value)
    if (ok) {
      isSubbed.value = !isSubbed.value
      showToast(isSubbed.value ? '已关注' : '已取消关注')
    } else {
      showToast('操作失败', { type: 'error' })
    }
  } finally {
    subLoading.value = false
  }
}
</script>
