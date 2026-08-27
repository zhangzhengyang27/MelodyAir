<template>
  <div class="space-y-6">
    <!-- Tabs: 全部歌单 / 精品歌单 -->
    <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C]">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="activeTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
        @click="activeTab = tab.value; resetAndFetch()"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 分类标签 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="cat in categories"
        :key="cat.name"
        class="rounded-full px-3 py-1 text-xs transition-colors"
        :class="selectedCat === cat.name
          ? 'bg-[#FF5A5F] text-white'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5] dark:hover:bg-[rgba(255,255,255,0.08)]'"
        @click="selectedCat = cat.name; resetAndFetch()"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- 歌单网格 -->
    <SkeletonCardGrid v-if="loading && playlists.length === 0" :count="12" />
    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <div
        v-for="item in playlists"
        :key="item.id"
        class="group cursor-pointer"
        @click="$router.push(`/playlist/${item.id}`)"
      >
        <CoverImage :src="item.coverImgUrl" :alt="item.name" size="md" />
        <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
        <p class="mt-0.5 text-xs text-neutral-400">{{ formatPlayCount(item.playCount) }}</p>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="flex justify-center py-4">
      <button
        class="rounded-full bg-neutral-100 px-6 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5] dark:hover:bg-[rgba(255,255,255,0.08)]"
        :disabled="loading"
        @click="fetchMore"
      >
        {{ loading ? '加载中...' : '加载更多' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTopPlaylist, getPlaylistCatlist, getPlaylistHot, getTopPlaylistHighquality } from '@/api/playlist'
import CoverImage from '@/components/common/CoverImage.vue'
import SkeletonCardGrid from '@/components/common/skeleton/SkeletonCardGrid.vue'
import { formatPlayCount } from '@/utils/format'

const tabs = [
  { label: '全部歌单', value: 'all' },
  { label: '精品歌单', value: 'highquality' }
]

const activeTab = ref<'all' | 'highquality'>('all')
const selectedCat = ref('全部')
const categories = ref<{ name: string }[]>([{ name: '全部' }])
const playlists = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
let offset = 0
const LIMIT = 30

onMounted(async () => {
  const [catRes, hotRes] = await Promise.allSettled([
    getPlaylistCatlist(),
    getPlaylistHot()
  ])
  if (catRes.status === 'fulfilled') {
    const sub = (catRes.value as any)?.sub || []
    categories.value = [{ name: '全部' }, ...sub.map((c: any) => ({ name: c.name }))]
  } else if (hotRes.status === 'fulfilled') {
    categories.value = [{ name: '全部' }, ...(hotRes.value as any)?.tags?.map((t: any) => ({ name: t.name })) || []]
  }
  resetAndFetch()
})

function resetAndFetch() {
  offset = 0
  playlists.value = []
  hasMore.value = true
  fetchMore()
}

async function fetchMore() {
  if (loading.value) return
  loading.value = true
  try {
    if (activeTab.value === 'all') {
      const cat = selectedCat.value === '全部' ? undefined : selectedCat.value
      const res: any = await getTopPlaylist({ cat, limit: LIMIT, offset })
      const items = res?.playlists || []
      playlists.value.push(...items)
      hasMore.value = res?.more ?? items.length >= LIMIT
      offset += LIMIT
    } else {
      const cat = selectedCat.value === '全部' ? undefined : selectedCat.value
      const res: any = await getTopPlaylistHighquality({ cat, limit: LIMIT, before: playlists.value.length > 0 ? playlists.value[playlists.value.length - 1]?.updateTime : undefined })
      const items = res?.playlists || []
      playlists.value.push(...items)
      hasMore.value = res?.more ?? items.length >= LIMIT
    }
  } finally {
    loading.value = false
  }
}
</script>
