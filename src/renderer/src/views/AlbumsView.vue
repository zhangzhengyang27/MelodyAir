<template>
  <div class="space-y-6">
    <!-- 地区筛选 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="item in areaOptions"
        :key="item.value"
        class="rounded-full px-3 py-1 text-xs transition-colors"
        :class="area === item.value
          ? 'bg-[#FF5A5F] text-white'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]'"
        @click="area = item.value; resetAndFetch()"
      >
        {{ item.label }}
      </button>
    </div>

    <!-- 专辑网格 -->
    <SkeletonCardGrid v-if="loading && albums.length === 0" :count="12" />
    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <div
        v-for="item in albums"
        :key="item.id"
        class="cursor-pointer"
        @click="$router.push(`/album/${item.id}`)"
      >
        <CoverImage :src="item.picUrl" :alt="item.name" size="md" />
        <p class="mt-2 line-clamp-1 text-sm">{{ item.name }}</p>
        <p class="text-xs text-neutral-400">{{ item.artist?.name }}</p>
        <p v-if="item.publishTime" class="text-xs text-neutral-400">{{ formatDate(item.publishTime) }}</p>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="flex justify-center py-4">
      <button
        class="rounded-full bg-neutral-100 px-6 py-2 text-sm text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]"
        :disabled="loading"
        @click="fetchMore"
      >{{ loading ? '加载中...' : '加载更多' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTopAlbum } from '@/api/album'
import CoverImage from '@/components/common/CoverImage.vue'
import SkeletonCardGrid from '@/components/common/skeleton/SkeletonCardGrid.vue'
import { formatDate } from '@/utils/format'

const areaOptions = [
  { label: '全部', value: 'ALL' },
  { label: '华语', value: 'ZH' },
  { label: '欧美', value: 'EA' },
  { label: '日本', value: 'JP' },
  { label: '韩国', value: 'KR' }
]

const area = ref('ALL')
const albums = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
let offset = 0
const LIMIT = 30

onMounted(() => { resetAndFetch() })

function resetAndFetch() {
  offset = 0
  albums.value = []
  hasMore.value = true
  fetchMore()
}

async function fetchMore() {
  if (loading.value) return
  loading.value = true
  try {
    const res: any = await getTopAlbum({ area: area.value, limit: LIMIT, offset })
    const items = res?.albums || res?.monthData || []
    albums.value.push(...items)
    hasMore.value = items.length >= LIMIT
    offset += LIMIT
  } finally {
    loading.value = false
  }
}
</script>
