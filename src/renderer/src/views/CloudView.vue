<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-title">云盘</h1>
      <button
        v-if="userStore.isAccountLoggedIn"
        class="rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
        @click="triggerUpload"
      >
        上传歌曲
      </button>
      <input ref="fileInput" type="file" accept="audio/*" class="hidden" @change="handleFileSelect" />
    </div>

    <div v-if="uploadProgress" class="rounded-xl bg-[#FFF5F3] p-3 dark:bg-[rgba(255,90,95,0.10)]">
      <p class="text-sm">{{ uploadFileName }}</p>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
        <div class="h-full rounded-full bg-[#FF5A5F] transition-all" :style="{ width: uploadProgress + '%' }" />
      </div>
      <p class="mt-1 text-xs text-neutral-500">{{ uploadProgress }}%</p>
    </div>

    <LoginPrompt
      v-if="!userStore.isAccountLoggedIn"
      :icon="Cloud"
      title="登录后查看云盘"
      description="上传和管理你的云端音乐，随时随地收听"
      buttonText="登录查看云盘"
    />

    <template v-else>
      <SkeletonSongTable v-if="loading" :rows="8" />

      <div v-else-if="songs.length === 0" class="flex min-h-[30vh] items-center justify-center">
        <div class="text-center">
          <span class="text-5xl">☁️</span>
          <p class="mt-4 text-neutral-500 dark:text-[#A1A1B5]">云盘中暂无歌曲</p>
        </div>
      </div>

      <SongTable v-else :songs="songs" @play="handlePlay" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCloudList, uploadToCloud } from '@/api/cloud'
import SongTable from '@/components/common/SongTable.vue'
import LoginPrompt from '@/components/common/LoginPrompt.vue'
import SkeletonSongTable from '@/components/common/skeleton/SkeletonSongTable.vue'
import { usePlayer } from '@/composables/usePlayer'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/composables/useToast'
import { Cloud } from 'lucide-vue-next'
import type { Song } from '@/stores/player'
import { logger } from '@/utils/logger'

const { playSongList } = usePlayer()
const userStore = useUserStore()

const loading = ref(false)
const songs = ref<Song[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const uploadProgress = ref(0)
const uploadFileName = ref('')

onMounted(async () => {
  if (userStore.isAccountLoggedIn) {
    await fetchCloudList()
  }
})

async function fetchCloudList() {
  loading.value = true
  try {
    const res: any = await getCloudList()
    songs.value = (res?.data || []).map((item: any) => {
      const s = item.simpleSong
      return {
        id: s.id,
        name: s.name,
        artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
        duration: s.dt || 0,
        fee: s.fee || 0
      }
    })
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : '加载失败，请重试', { type: 'error' })
  } finally {
    loading.value = false
  }
}

function handlePlay(song: Song) {
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadFileName.value = file.name
  uploadProgress.value = 1
  try {
    const result: any = await uploadToCloud(file, (progress) => {
      uploadProgress.value = progress
    })
    if (result?.body?.code === 200 || result?.code === 200) {
      showToast(`上传成功：${file.name}`, { type: 'success' })
      // 刷新列表
      await fetchCloudList()
    } else {
      showToast(result?.body?.msg || result?.msg || '上传失败', { type: 'error' })
    }
  } catch (err: unknown) {
    logger.error('cloud', 'Upload failed:', err)
    showToast(err instanceof Error ? err.message : '上传失败', { type: 'error' })
  } finally {
    uploadProgress.value = 0
  }
  // 清空 input 以允许再次选择同一文件
  if (fileInput.value) fileInput.value.value = ''
}


</script>
