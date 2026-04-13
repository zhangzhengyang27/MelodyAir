<template>
  <div class="space-y-6">
    <h1 class="text-title">排行榜</h1>

    <!-- 列表视图 -->
    <div v-if="!detailVisible">
      <div v-if="loading" class="py-8"><LoadingSpinner /></div>

      <div v-else-if="toplists.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="list in toplists"
          :key="list.id"
          class="cursor-pointer rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] dark:bg-[#171722] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35),0_0_1px_rgba(255,255,255,0.05)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_1px_rgba(255,255,255,0.07)]"
          @click="viewDetail(list.id, list.name)"
        >
          <div class="flex items-center gap-4">
            <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
              <img :src="list.coverImgUrl + '?param=200y200'" alt="" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold">{{ list.name }}</h3>
              <p class="mt-1 text-xs text-neutral-400 dark:text-[#6B6B80]">{{ list.updateFrequency }}</p>
              <div class="mt-2 space-y-0.5">
                <p v-for="(track, i) in list.tracks?.slice(0, 3)" :key="i" class="truncate text-xs text-neutral-500 dark:text-[#6B6B80]">
                  <span class="font-medium" :class="i < 3 ? 'text-coral-500' : ''">{{ i + 1 }}.</span>
                  {{ track.first }} - {{ track.second }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="py-12 text-center text-neutral-400 dark:text-[#6B6B80]">暂无排行榜数据</div>
    </div>

    <!-- 详情视图 -->
    <div v-if="detailVisible" class="space-y-4">
      <div class="flex items-center gap-4">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-coral-500 dark:text-[#A1A1B5] dark:hover:bg-white/6"
          @click="detailVisible = false"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-subtitle font-semibold">{{ detailName }}</h2>
      </div>

      <!-- 错误提示 -->
      <div v-if="detailError" class="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
        加载失败：{{ detailError }}
        <button class="ml-2 underline" @click="viewDetail(detailId!, detailName)">重试</button>
      </div>

      <SongTable v-else :songs="detailSongs" :loading="detailLoading" @play="handlePlaySong" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getToplist, getToplistDetail } from '@/api/top'
import SongTable from '@/components/common/SongTable.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const { playSongList } = usePlayer()

const loading = ref(false)
const toplists = ref<any[]>([])
const detailVisible = ref(false)
const detailId = ref<number | null>(null)
const detailName = ref('')
const detailSongs = ref<Song[]>([])
const detailLoading = ref(false)
const detailError = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await getToplist()
    toplists.value = res?.list || []
  } catch (err) {
    console.error('加载排行榜失败:', err)
  } finally {
    loading.value = false
  }
})

async function viewDetail(id: number, name: string) {
  detailId.value = id
  detailName.value = name
  detailVisible.value = true
  detailError.value = ''
  detailLoading.value = true

  try {
    const res: any = await getToplistDetail(id)
    // /toplist/detail 返回格式与标准歌单不同，兼容多种字段名
    const rawSongs = res?.songs || res?.list || []
    if (rawSongs.length > 0) {
      console.log('[Toplist] 首条数据样本:', JSON.stringify(rawSongs[0]).slice(0, 500))
    }
    detailSongs.value = (rawSongs).map((s: any) => ({
      id: s.id,
      name: s.name || '',
      // 兼容两种歌手字段：ar（标准）/ artists（toplist）
      artists: (s.ar || s.artists || [])?.map((a: any) => ({ id: a.id || 0, name: a.name || '' })) || [],
      // 兼容两种专辑字段：al（标准）/ album（toplist）
      album: (() => {
        const al = s.al || s.album || {}
        return { id: al.id || 0, name: al.name || '', picUrl: al.picUrl || al.coverImgUrl || '' }
      })(),
      // 兼容两种时长字段：dt（标准）/ duration（toplist）
      duration: s.dt || s.duration || 0
    }))
  } catch (err: any) {
    console.error('加载榜单详情失败:', err)
    detailError.value = err?.message || '接口请求异常'
    detailSongs.value = []
  } finally {
    detailLoading.value = false
  }
}

function handlePlaySong(song: Song) {
  playSongList(detailSongs.value, detailSongs.value.findIndex(s => s.id === song.id))
}
</script>
