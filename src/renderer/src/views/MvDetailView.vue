<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="8" />

    <template v-else-if="mv">
      <!-- 返回按钮 -->
      <button
        class="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-[#FF5A5F] dark:text-[#A1A1B5] dark:hover:bg-white/6"
        @click="$router.back()"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>

      <!-- Header -->
      <div class="flex gap-6">
        <div class="h-48 w-80 shrink-0 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
          <img :src="mv.cover" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="text-display">{{ mv.name }}</h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">{{ mv.artistName }}</p>
          <p class="mt-1 text-xs text-neutral-400">{{ formatPlayCount(mv.playCount) }}次播放</p>
          <p v-if="mv.desc" class="mt-2 line-clamp-3 text-xs text-neutral-400">{{ mv.desc }}</p>
          <div class="mt-4 flex gap-3">
            <button
              class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              :class="isSubbed ? 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]' : 'border border-[#FF5A5F] text-[#FF5A5F] hover:bg-[#FFF5F3] dark:border-[#FF7F66] dark:text-[#FF7F66] dark:hover:bg-[rgba(255,90,95,0.10)]'"
              :disabled="subLoading"
              @click="handleSubMv"
            >
              {{ isSubbed ? '已收藏' : '收藏' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Video player -->
      <div class="overflow-hidden rounded-2xl bg-black">
        <video
          v-if="mvUrl"
          :src="mvUrl"
          controls
          class="h-auto w-full"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { getMvDetail, getMvUrl } from '@/api/mv'
import SkeletonDetail from '@/components/common/skeleton/SkeletonDetail.vue'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/composables/useToast'
import { formatPlayCount } from '@/utils/format'

const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const subLoading = ref(false)
const isSubbed = ref(false)
const mvId = ref(0)
const mv = ref<any>(null)
const mvUrl = ref('')

async function fetchData(id: number) {
  loading.value = true
  mvId.value = id
  isSubbed.value = false
  try {
    const [detailRes, urlRes] = await Promise.allSettled([
      getMvDetail(id),
      getMvUrl(id)
    ])

    if (detailRes.status === 'fulfilled') {
      const raw = detailRes.value as any
      // 兼容两种格式：API 返回 { code, data }，DB 缓存直接返回 MV 对象
      mv.value = raw?.data || (raw?.name ? raw : null)
    }
    if (urlRes.status === 'fulfilled') {
      mvUrl.value = (urlRes.value as any)?.data?.url || ''
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

async function handleSubMv() {
  if (!userStore.isAccountLoggedIn) {
    showToast('请先登录', { type: 'warning' })
    return
  }
  subLoading.value = true
  try {
    const ok = await userStore.toggleSubMv(mvId.value)
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
