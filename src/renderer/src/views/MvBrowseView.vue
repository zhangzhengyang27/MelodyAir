<template>
  <div class="space-y-6">
    <!-- Tabs -->
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

    <!-- 筛选（仅全部MV tab） -->
    <div v-if="activeTab === 'all'" class="flex flex-wrap gap-2">
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs text-neutral-400">地区</span>
        <button
          v-for="item in areaOptions"
          :key="item.value"
          class="rounded-full px-3 py-0.5 text-xs transition-colors"
          :class="area === item.value ? 'bg-[#FF5A5F] text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]'"
          @click="area = item.value; resetAndFetch()"
        >{{ item.label }}</button>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs text-neutral-400">类型</span>
        <button
          v-for="item in typeOptions"
          :key="item.value"
          class="rounded-full px-3 py-0.5 text-xs transition-colors"
          :class="mvType === item.value ? 'bg-[#FF5A5F] text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]'"
          @click="mvType = item.value; resetAndFetch()"
        >{{ item.label }}</button>
      </div>
    </div>

    <!-- MV 网格 -->
    <SkeletonCardGrid
      v-if="loading && mvs.length === 0"
      :count="8"
      grid-class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
    />
    <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="item in mvs"
        :key="item.id"
        class="group cursor-pointer"
        @click="$router.push(`/mv/${item.id}`)"
      >
        <div class="relative overflow-hidden rounded-lg">
          <img :src="(item.cover || item.picUrl) + '?param=400y400'" :alt="item.name" loading="lazy" class="h-36 w-full object-cover transition-transform group-hover:scale-105" />
        </div>
        <p class="mt-2 line-clamp-1 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
        <p class="text-xs text-neutral-400">{{ item.artistName }}</p>
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
import { getMvAll, getMvFirst, getMvExclusiveRcmd, getTopMv } from '@/api/mv'
import SkeletonCardGrid from '@/components/common/skeleton/SkeletonCardGrid.vue'

const tabs = [
  { label: '全部MV', value: 'all' },
  { label: '最新MV', value: 'first' },
  { label: '网易出品', value: 'exclusive' },
  { label: 'MV排行', value: 'top' }
]

const areaOptions = [
  { label: '全部', value: '' },
  { label: '内地', value: '内地' },
  { label: '港台', value: '港台' },
  { label: '欧美', value: '欧美' },
  { label: '日本', value: '日本' },
  { label: '韩国', value: '韩国' }
]

const typeOptions = [
  { label: '全部', value: '' },
  { label: '官方版', value: '官方版' },
  { label: '原生', value: '原生' },
  { label: '现场版', value: '现场版' },
  { label: '网易出品', value: '网易出品' }
]

const activeTab = ref('all')
const area = ref('')
const mvType = ref('')
const mvs = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
let offset = 0
const LIMIT = 30

onMounted(() => { resetAndFetch() })

function resetAndFetch() {
  offset = 0
  mvs.value = []
  hasMore.value = true
  fetchMore()
}

async function fetchMore() {
  if (loading.value) return
  loading.value = true
  try {
    let res: any
    switch (activeTab.value) {
      case 'first':
        res = await getMvFirst({ area: area.value || undefined, limit: LIMIT })
        break
      case 'exclusive':
        res = await getMvExclusiveRcmd(LIMIT, offset)
        break
      case 'top':
        res = await getTopMv({ area: area.value || undefined, limit: LIMIT, offset })
        break
      default:
        res = await getMvAll({ area: area.value || undefined, type: mvType.value || undefined, order: '最热', limit: LIMIT, offset })
    }
    const items = res?.data || res?.mvs || []
    mvs.value.push(...items)
    hasMore.value = items.length >= LIMIT
    offset += LIMIT
  } finally {
    loading.value = false
  }
}
</script>
