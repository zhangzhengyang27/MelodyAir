<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="8" />

    <template v-else-if="radio">
      <!-- 返回 -->
      <div class="flex items-center gap-4">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-coral-500 dark:text-[#A1A1B5] dark:hover:bg-white/6"
          @click="$router.back()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <!-- Header -->
      <div class="flex gap-6">
        <div class="h-48 w-48 shrink-0 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img :src="radio.picUrl + '?param=400y400'" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="text-display">{{ radio.name }}</h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">
            {{ radio.dj?.brand || radio.dj?.nickname }}
            · {{ formatPlayCount(radio.subCount) }}订阅
            · {{ radio.programCount }}个节目
          </p>
          <p v-if="radio.desc" class="mt-2 line-clamp-3 text-xs text-neutral-400">{{ radio.desc }}</p>
          <div class="mt-4 flex gap-3">
            <CoralButton @click="subscribeRadio" :disabled="subLoading">
              {{ isSubscribed ? '取消订阅' : '订阅' }}
            </CoralButton>
          </div>
        </div>
      </div>

      <!-- 节目列表 -->
      <section>
        <SectionHeader title="节目列表" />
        <div v-if="programsLoading" class="space-y-2">
          <div v-for="i in 6" :key="i" class="flex items-center gap-4 rounded-xl p-3">
            <Skeleton class="h-8 w-8 shrink-0 rounded-full" />
            <div class="min-w-0 flex-1 space-y-1.5">
              <Skeleton class="h-3.5 w-1/2 rounded" />
              <Skeleton class="h-2.5 w-1/4 rounded" />
            </div>
            <Skeleton class="h-3 w-10 shrink-0 rounded" />
          </div>
        </div>
        <div v-else-if="programs.length > 0" class="space-y-2">
          <div
            v-for="prog in programs"
            :key="prog.id"
            class="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-neutral-50 dark:hover:bg-white/4 cursor-pointer"
            @click="playProgram(prog)"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-white/8">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-coral-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium dark:text-[#F0F0F5]">{{ prog.name }}</p>
              <p class="mt-0.5 truncate text-xs text-neutral-400">
                第{{ prog.serialNum }}期 · {{ formatDate(prog.createTime) }}
              </p>
            </div>
            <span class="shrink-0 text-xs text-neutral-400">{{ formatDuration(prog.duration) }}</span>
            <span class="shrink-0 text-xs text-neutral-400">{{ formatPlayCount(prog.listenerCount) }}</span>
          </div>
        </div>
        <div v-else class="py-8 text-center text-neutral-400 dark:text-[#6B6B80]">暂无节目</div>

        <!-- 加载更多 -->
        <div v-if="hasMorePrograms" class="mt-4 text-center">
          <button
            class="text-sm text-coral-500 hover:underline"
            :disabled="programsLoading"
            @click="loadMorePrograms"
          >
            {{ programsLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </section>
    </template>

    <!-- 错误状态 -->
    <div v-else class="py-12 text-center text-neutral-400 dark:text-[#6B6B80]">加载电台失败</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getDjDetail, getDjProgram, subDj } from '@/api/dj'
import SectionHeader from '@/components/common/SectionHeader.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import SkeletonDetail from '@/components/common/skeleton/SkeletonDetail.vue'
import Skeleton from '@/components/common/skeleton/Skeleton.vue'
import { usePlayer } from '@/composables/usePlayer'
import { formatPlayCount, formatDuration, formatDate } from '@/utils/format'
import type { Song } from '@/stores/player'

const route = useRoute()
const { playSongList } = usePlayer()

const loading = ref(false)
const radioId = ref(0)
const radio = ref<any>(null)
const isSubscribed = ref(false)
const subLoading = ref(false)

const programs = ref<any[]>([])
const programsLoading = ref(false)
const programsOffset = ref(0)
const hasMorePrograms = ref(true)

const PAGE_SIZE = 30

async function fetchRadio(rid: number) {
  loading.value = true
  radioId.value = rid
  programs.value = []
  programsOffset.value = 0
  hasMorePrograms.value = true

  try {
    const [detailRes, progRes] = await Promise.allSettled([
      getDjDetail(rid),
      getDjProgram({ rid, limit: PAGE_SIZE, offset: 0 })
    ])

    if (detailRes.status === 'fulfilled') {
      const raw = detailRes.value as any
      // 兼容多种格式：
      // 1. { djRadio: {...} }（旧版接口）
      // 2. { data: { djRadio: {...} } }（嵌套格式）
      // 3. 电台对象本身（新版 /api/djradio/v2/get，transform 提取 data 后直接返回）
      // 4. { cacheValue: 电台对象 }（缓存命中时后端返回原始缓存记录）
      radio.value = raw?.djRadio
        || raw?.data?.djRadio
        || raw?.cacheValue?.djRadio
        || raw?.cacheValue?.data?.djRadio
        || (raw?.name && raw?.id ? raw : null)
        || (raw?.cacheValue?.name && raw?.cacheValue?.id ? raw.cacheValue : null)
    }
    if (progRes.status === 'fulfilled') {
      const data = progRes.value as { programs?: unknown[]; more?: boolean }
      programs.value = data?.programs || []
      programsOffset.value = programs.value.length
      hasMorePrograms.value = programs.value.length >= PAGE_SIZE && !data?.more
        ? false
        : (data?.more !== false)
    }
  } catch (err) {
    if (import.meta.env.DEV) console.error('加载电台详情失败:', err)
  } finally {
    loading.value = false
  }
}

async function loadMorePrograms() {
  if (!radio.value || programsLoading.value) return
  programsLoading.value = true
  try {
    const res = await getDjProgram({
      rid: radio.value.id,
      limit: PAGE_SIZE,
      offset: programsOffset.value
    })
    const newPrograms = res?.programs || []
    programs.value.push(...newPrograms)
    programsOffset.value = programs.value.length
    hasMorePrograms.value = newPrograms.length >= PAGE_SIZE && res?.more !== false
  } catch (err) {
    if (import.meta.env.DEV) console.error('加载更多节目失败:', err)
  } finally {
    programsLoading.value = false
  }
}

async function subscribeRadio() {
  if (!radio.value || subLoading.value) return
  subLoading.value = true
  try {
    const t = isSubscribed.value ? 0 : 1
    await subDj(radio.value.id, t as 1 | 0)
    isSubscribed.value = !isSubscribed.value
  } catch (err) {
    if (import.meta.env.DEV) console.error('订阅操作失败:', err)
  } finally {
    subLoading.value = false
  }
}

function playProgram(prog: { mainSong?: { id?: number; artists?: { id: number; name: string }[] }; id?: number; name: string; radio?: { name?: string; picUrl?: string }; coverUrl?: string; duration?: number }) {
  const song: Song = {
    id: prog.mainSong?.id || prog.id,
    name: prog.name,
    artists: prog.mainSong?.artists?.map((a) => ({ id: a.id, name: a.name })) || [{ id: 0, name: prog.radio?.name || '' }],
    album: {
      id: 0,
      name: prog.radio?.name || '',
      picUrl: prog.coverUrl || prog.radio?.picUrl || ''
    },
    duration: prog.duration || 0,
    fee: 0,
    // 播客节目通常很长（30-90分钟），使用 HTML5 流式播放模式
    _streaming: true
  }
  playSongList([song], 0)
}

onMounted(() => {
  const rid = Number(route.params.rid)
  if (rid) fetchRadio(rid)
})

watch(() => route.params.rid, (newRid) => {
  if (newRid) fetchRadio(Number(newRid))
})
</script>
