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

      <!-- Header（纯文字排版） -->
      <div class="flex min-w-0 flex-col gap-1.5 border-l-2 border-[#FF5A5F] pl-4">
        <h1 class="text-display font-semibold leading-snug">{{ mv.name }}</h1>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-[#A1A1B5]">
          <span class="rounded-md bg-[#FF5A5F]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#FF5A5F] dark:text-[#FF7F66]">MV</span>
          <span>{{ mv.artistName }}</span>
        </div>
        <p class="text-xs text-neutral-400">{{ formatPlayCount(mv.playCount) }}次播放</p>
        <p v-if="mv.desc" class="mt-1 line-clamp-3 text-xs leading-relaxed text-neutral-400">{{ mv.desc }}</p>
        <div class="mt-3 flex gap-3">
          <button
            class="rounded-full px-5 py-1.5 text-sm font-medium transition-colors"
            :class="isSubbed ? 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]' : 'border border-[#FF5A5F] text-[#FF5A5F] hover:bg-[#FFF5F3] dark:border-[#FF7F66] dark:text-[#FF7F66] dark:hover:bg-[rgba(255,90,95,0.10)]'"
            :disabled="subLoading"
            @click="handleSubMv"
          >
            {{ isSubbed ? '已收藏' : '收藏' }}
          </button>
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
      // 同步真实收藏状态（详情接口的 subed 字段），避免已收藏的 MV 按钮仍显示"收藏"
      isSubbed.value = mv.value?.subed === true
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
