<template>
  <div class="space-y-6">
    <!-- 筛选栏 -->
    <div class="space-y-3">
      <!-- 语种 -->
      <div class="flex flex-wrap gap-2">
        <span class="mr-2 text-xs text-neutral-400 leading-7">语种</span>
        <button
          v-for="item in areaList"
          :key="item.value"
          class="rounded-full px-3 py-0.5 text-xs transition-colors"
          :class="area === item.value
            ? 'bg-[#FF5A5F] text-white'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]'"
          @click="area = item.value; resetAndFetch()"
        >
          {{ item.label }}
        </button>
      </div>
      <!-- 类型 -->
      <div class="flex flex-wrap gap-2">
        <span class="mr-2 text-xs text-neutral-400 leading-7">类型</span>
        <button
          v-for="item in typeList"
          :key="item.value"
          class="rounded-full px-3 py-0.5 text-xs transition-colors"
          :class="type === item.value
            ? 'bg-[#FF5A5F] text-white'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]'"
          @click="type = item.value; resetAndFetch()"
        >
          {{ item.label }}
        </button>
      </div>
      <!-- 首字母 -->
      <div class="flex flex-wrap gap-1">
        <span class="mr-2 text-xs text-neutral-400 leading-7">首字母</span>
        <button
          v-for="letter in initials"
          :key="letter"
          class="h-7 min-w-[1.75rem] rounded px-1 text-xs transition-colors"
          :class="initial === letter
            ? 'bg-[#FF5A5F] text-white'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]'"
          @click="initial = letter; resetAndFetch()"
        >
          {{ letter }}
        </button>
      </div>
    </div>

    <!-- 歌手网格 -->
    <div v-if="loading && artists.length === 0" class="py-8"><LoadingSpinner /></div>
    <div v-else class="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      <div
        v-for="item in artists"
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

    <!-- 加载更多 -->
    <div v-if="hasMore" class="flex justify-center py-4">
      <button
        class="rounded-full bg-neutral-100 px-6 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]"
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
import { getArtistList } from '@/api/artist'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const areaList = [
  { label: '全部', value: -1 },
  { label: '华语', value: 7 },
  { label: '欧美', value: 96 },
  { label: '日本', value: 8 },
  { label: '韩国', value: 16 },
  { label: '其他', value: 0 }
]

const typeList = [
  { label: '全部', value: -1 },
  { label: '男歌手', value: 1 },
  { label: '女歌手', value: 2 },
  { label: '乐队', value: 3 }
]

const initials = ['热门', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

const area = ref(-1)
const type = ref(-1)
const initial = ref('热门')
const artists = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
let offset = 0
const LIMIT = 30

onMounted(() => { resetAndFetch() })

function resetAndFetch() {
  offset = 0
  artists.value = []
  hasMore.value = true
  fetchMore()
}

async function fetchMore() {
  if (loading.value) return
  loading.value = true
  try {
    const initParam = initial.value === '热门' ? undefined : initial.value
    const res: any = await getArtistList({ type: type.value, area: area.value, initial: initParam, limit: LIMIT, offset })
    const items = res?.artists || []
    artists.value.push(...items)
    hasMore.value = items.length >= LIMIT
    offset += LIMIT
  } finally {
    loading.value = false
  }
}
</script>
