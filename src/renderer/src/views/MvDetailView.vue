<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-8"><LoadingSpinner /></div>

    <template v-else-if="mv">
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

      <!-- Similar MVs -->
      <section v-if="simiMvs.length > 0">
        <SectionHeader title="相似MV" />
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div
            v-for="item in simiMvs"
            :key="item.id"
            class="cursor-pointer"
            @click="$router.push(`/mv/${item.id}`)"
          >
            <div class="overflow-hidden rounded-lg">
              <img :src="item.cover" alt="" class="h-32 w-full object-cover" />
            </div>
            <p class="mt-2 line-clamp-1 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
            <p class="text-xs text-neutral-400">{{ item.artistName }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getMvDetail, getMvUrl } from '@/api/mv'
import { getSimiSong } from '@/api/simi'
import SectionHeader from '@/components/common/SectionHeader.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { formatPlayCount } from '@/utils/format'

const route = useRoute()

const loading = ref(false)
const mv = ref<any>(null)
const mvUrl = ref('')
const simiMvs = ref<any[]>([])

async function fetchData(id: number) {
  loading.value = true
  try {
    const [detailRes, urlRes] = await Promise.allSettled([
      getMvDetail(id),
      getMvUrl(id)
    ])

    if (detailRes.status === 'fulfilled') {
      mv.value = (detailRes.value as any)?.data
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
</script>
