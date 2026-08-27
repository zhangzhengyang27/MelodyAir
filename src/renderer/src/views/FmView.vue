<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-title">私人FM</h1>
      <CoralButton @click="fetchFmSongs">换一批</CoralButton>
    </div>

    <LoginPrompt
      v-if="!userStore.isAccountLoggedIn"
      :icon="Radio"
      title="登录后收听私人FM"
      description="根据你的听歌口味，为你推荐专属电台"
      buttonText="登录收听"
    />

    <template v-else>
      <SkeletonSongTable v-if="loading" :rows="8" />

      <div v-else-if="songs.length === 0" class="flex min-h-[30vh] items-center justify-center">
        <div class="text-center">
          <span class="text-5xl">📻</span>
          <p class="mt-4 text-neutral-500 dark:text-[#A1A1B5]">暂无FM歌曲，点击上方"换一批"试试</p>
        </div>
      </div>

      <SongTable v-else :songs="songs" @play="handlePlay" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPersonalFm } from '@/api/fm'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import LoginPrompt from '@/components/common/LoginPrompt.vue'
import SkeletonSongTable from '@/components/common/skeleton/SkeletonSongTable.vue'
import { usePlayer } from '@/composables/usePlayer'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/composables/useToast'
import { Radio } from 'lucide-vue-next'
import type { Song } from '@/stores/player'

const { playSongList } = usePlayer()
const userStore = useUserStore()

const loading = ref(false)
const songs = ref<Song[]>([])

onMounted(async () => {
  if (userStore.isAccountLoggedIn) {
    await fetchFmSongs()
  }
})

async function fetchFmSongs() {
  loading.value = true
  try {
    const res: any = await getPersonalFm()
    songs.value = (res?.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      artists: s.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      album: { id: s.album?.id || 0, name: s.album?.name || '', picUrl: s.album?.picUrl || '' },
      duration: s.duration || 0,
      fee: s.fee || 0
    }))
  } catch (err: unknown) {
    showToast(err instanceof Error ? err.message : '加载失败，请重试', { type: 'error' })
  } finally {
    loading.value = false
  }
}

function handlePlay(song: Song) {
  playSongList(songs.value, songs.value.findIndex(s => s.id === song.id))
}
</script>
