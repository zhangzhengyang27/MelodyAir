<template>
  <div class="space-y-8">
    <!-- Banner -->
    <section v-if="banners.length > 0">
      <div class="banner-container group relative h-56 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
        <div
          v-for="(banner, i) in banners"
          :key="i"
          v-show="i === currentBanner"
          class="absolute inset-0 transition-opacity duration-500"
        >
          <img
            v-if="shownBanners.has(i)"
            :src="sizedBannerUrl(banner.imageUrl)"
            :alt="banner.typeTitle"
            class="h-full w-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <!-- 左右切换箭头 -->
        <button
          class="banner-arrow absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/50 group-hover:opacity-100 pointer-coarse:opacity-100"
          aria-label="上一张Banner"
          @click="prevBanner"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <button
          class="banner-arrow absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/50 group-hover:opacity-100 pointer-coarse:opacity-100"
          aria-label="下一张Banner"
          @click="nextBanner"
        >
          <ChevronRight class="h-5 w-5" />
        </button>

        <!-- Dots -->
        <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          <button
            v-for="(_, i) in banners"
            :key="i"
            class="h-1.5 rounded-full transition-all"
            :class="i === currentBanner ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'"
            :aria-label="`跳到第 ${i + 1} 张Banner`"
            :aria-current="i === currentBanner"
            @click="currentBanner = i"
          />
        </div>
      </div>
    </section>
    <SkeletonBanner v-else-if="loading" />

    <!-- 每日推荐强卡片（未登录时隐藏） -->
    <section v-if="userStore.isAccountLoggedIn">
      <div
        class="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF5A5F] to-[#FF7F66] p-6 text-white shadow-[0_4px_20px_rgba(255,90,95,0.30)] transition-transform hover:scale-[1.01]"
        @click="$router.push('/daily')"
      >
        <div class="absolute right-0 top-0 h-full w-1/3 opacity-10">
          <Music class="h-full w-full" />
        </div>
        <div class="relative z-10">
          <div class="flex items-center gap-2">
            <CalendarDays class="h-5 w-5" />
            <span class="text-sm font-medium opacity-90">{{ todayLabel }}</span>
          </div>
          <h2 class="mt-2 text-2xl font-bold tracking-tight">每日推荐</h2>
          <p class="mt-1 text-sm opacity-80">根据你的口味，为你精选 20 首好歌</p>
        </div>
        <div class="relative z-10 flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition-colors group-hover:bg-white/30">
          <Play class="h-4 w-4 fill-current" />
          立即试听
        </div>
      </div>
    </section>

    <!-- Recommended playlists -->
    <section>
      <SectionHeader title="推荐歌单" />
      <div v-if="loading && playlists.length === 0">
        <SkeletonCardGrid :count="12" />
      </div>
      <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <div
          v-for="(item, idx) in playlists"
          :key="item.id"
          class="group cursor-pointer animate-fade-in-up"
          :style="{ '--stagger-delay': `${(idx % 12) * 45}ms` }"
          @click="$router.push(`/playlist/${item.id}`)"
        >
          <CoverImage :src="item.picUrl" :alt="item.name" size="md" playable @play="$router.push(`/playlist/${item.id}`)" />
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
          v-for="(item, idx) in mvs"
          :key="item.id"
          class="group cursor-pointer animate-fade-in-up"
          :style="{ '--stagger-delay': `${(idx % 8) * 45}ms` }"
          @click="$router.push(`/mv/${item.id}`)"
        >
          <div class="relative overflow-hidden rounded-lg">
            <img :src="item.picUrl + '?param=400y400'" :alt="item.name" loading="lazy" class="h-36 w-full object-cover transition-transform group-hover:scale-105" />
          </div>
          <p class="mt-2 line-clamp-1 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
          <p class="text-xs text-neutral-400">{{ item.artistName }}</p>
        </div>
      </div>
    </section>
    <section v-else-if="loading && mvs.length === 0">
      <SectionHeader title="推荐MV" />
      <SkeletonCardGrid :count="8" grid-class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" />
    </section>

    <!-- Recommended DJ -->
    <section v-if="djPrograms.length > 0">
      <SectionHeader title="推荐电台" />
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <div
          v-for="(item, idx) in djPrograms"
          :key="item.id"
          class="group cursor-pointer animate-fade-in-up"
          :style="{ '--stagger-delay': `${(idx % 12) * 45}ms` }"
          @click="$router.push(`/dj/${item.id}`)"
        >
          <CoverImage :src="item.picUrl" :alt="item.name" size="md" playable />
          <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
        </div>
      </div>
    </section>
    <section v-else-if="loading && djPrograms.length === 0">
      <SectionHeader title="推荐电台" />
      <SkeletonCardGrid :count="6" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { ChevronLeft, ChevronRight, Play, CalendarDays, Music } from 'lucide-vue-next'
import { getBanner, getPersonalized, getPersonalizedNewSong, getPersonalizedMv, getPersonalizedDjprogram } from '@/api/personalized'
import CoverImage from '@/components/common/CoverImage.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import SongTable from '@/components/common/SongTable.vue'
import SkeletonBanner from '@/components/common/skeleton/SkeletonBanner.vue'
import SkeletonCardGrid from '@/components/common/skeleton/SkeletonCardGrid.vue'
import { usePlayer } from '@/composables/usePlayer'
import { formatPlayCount } from '@/utils/format'
import type { Song } from '@/stores/player'

const { playSongList } = usePlayer()
const userStore = useUserStore()

const loading = ref(false)
const banners = ref<any[]>([])
const playlists = ref<any[]>([])
const newSongs = ref<Song[]>([])
const mvs = ref<any[]>([])
const djPrograms = ref<any[]>([])
const currentBanner = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null

/**
 * 已展示过的 banner 下标集合：只有展示过的才插入 <img>。
 * 不能用 v-show + loading=lazy——Chrome 会立即加载 display:none 容器里的懒加载图（实测），
 * 6 张 banner 全量直出首屏要多拉数百 KB 到数 MB；v-if 按需渲染后首屏只请求当前 1 张。
 */
const shownBanners = ref<Set<number>>(new Set([0]))
watch(currentBanner, (i) => {
  shownBanners.value.add(i)
})

/**
 * Banner 图追加 CDN 裁剪参数兜底（部分运营图可能超 1080px 宽）。
 * 注意实测：现有 banner 源图多已约 1080px 宽，obj/ 新式 URL 甚至会忽略该参数，
 * 裁剪本身收益有限——banner 的主要优化是非当前帧懒加载（见模板 loading）。
 * 仅对网易云 CDN（*.music.126.net）追加，其他来源不确定支持，原样返回避免 404。
 */
function sizedBannerUrl(url: string): string {
  if (!url) return url
  try {
    const host = new URL(url).hostname
    if (!host.endsWith('.music.126.net')) return url
    return url + (url.includes('?') ? '&' : '?') + 'param=1080y480'
  } catch {
    return url
  }
}

/** 今日日期标签，如「8月26日 周三」 */
const todayLabel = computed(() => {
  const now = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
})

onMounted(async () => {
  loading.value = true
  try {
    const [bannerRes, playlistRes, songRes, mvRes, djRes] = await Promise.allSettled([
      getBanner(),
      getPersonalized(12),
      getPersonalizedNewSong(12),
      getPersonalizedMv(),
      getPersonalizedDjprogram()
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
    if (djRes.status === 'fulfilled') {
      djPrograms.value = (djRes.value as any)?.result || []
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

function prevBanner() {
  if (banners.value.length === 0) return
  currentBanner.value = (currentBanner.value - 1 + banners.value.length) % banners.value.length
}

function nextBanner() {
  if (banners.value.length === 0) return
  currentBanner.value = (currentBanner.value + 1) % banners.value.length
}
</script>
