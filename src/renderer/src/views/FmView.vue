<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-title">私人FM</h1>
        <span v-if="playerStore.isPersonalFM" class="rounded-full bg-[#FF5A5F]/10 px-3 py-1 text-xs font-medium text-[#FF5A5F]">
          正在播放
        </span>
      </div>
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
          <Radio class="mx-auto h-12 w-12 text-neutral-400" />
          <p class="mt-4 text-neutral-500 dark:text-[#A1A1B5]">暂无FM歌曲，点击上方"换一批"试试</p>
        </div>
      </div>

      <div v-else class="space-y-1">
        <div
          v-for="(song, index) in songs"
          :key="song.id"
          class="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
          :class="{ 'bg-[#FF5A5F]/5': playerStore.currentSong?.id === song.id && playerStore.isPersonalFM }"
        >
          <span class="w-6 text-center text-sm text-neutral-400">{{ index + 1 }}</span>
          <img
            :src="song.album.picUrl + '?param=80y80'"
            :alt="song.name"
            class="h-10 w-10 rounded-md object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :class="{ 'text-[#FF5A5F]': playerStore.currentSong?.id === song.id && playerStore.isPersonalFM }">
              {{ song.name }}
            </p>
            <p class="truncate text-xs text-neutral-400">{{ song.artists.map(a => a.name).join(' / ') }}</p>
          </div>
          <button
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 opacity-0 transition-all hover:bg-[#FF5A5F]/10 hover:text-[#FF5A5F] group-hover:opacity-100 pointer-coarse:opacity-100"
            title="不感兴趣"
            @click="handleTrash(song, index)"
          >
            <Trash2 class="h-4 w-4" />
            不感兴趣
          </button>
          <button
            class="rounded-full bg-[#FF5A5F] px-4 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-[#E0484D] group-hover:opacity-100 pointer-coarse:opacity-100"
            @click="handlePlay(index)"
          >
            播放
          </button>
        </div>
      </div>

      <!-- FM 播放中提示 -->
      <div v-if="playerStore.isPersonalFM && playerStore.currentSong" class="flex items-center justify-center gap-2 rounded-xl bg-neutral-50 py-3 text-sm text-neutral-500 dark:bg-white/5 dark:text-[#A1A1B5]">
        <Radio class="h-4 w-4 animate-pulse text-[#FF5A5F]" />
        <span>FM 正在播放：{{ playerStore.currentSong.name }}，队列剩余 {{ playerStore.personalFMQueue.length }} 首</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getPersonalFm, fmTrash } from '@/api/fm'
import CoralButton from '@/components/common/CoralButton.vue'
import { Radio, Trash2 } from 'lucide-vue-next'
import LoginPrompt from '@/components/common/LoginPrompt.vue'
import SkeletonSongTable from '@/components/common/skeleton/SkeletonSongTable.vue'
import { usePlayerStore } from '@/stores/player'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/composables/useToast'
import type { Song } from '@/stores/player'

const playerStore = usePlayerStore()
const userStore = useUserStore()

const loading = ref(false)
const songs = ref<Song[]>([])

onMounted(async () => {
  if (userStore.isAccountLoggedIn) {
    await fetchFmSongs()
  }
})

watch(() => userStore.isAccountLoggedIn, (loggedIn) => {
  if (loggedIn && songs.value.length === 0) {
    fetchFmSongs()
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

function handlePlay(index: number) {
  playerStore.startPersonalFM(songs.value, index)
}

async function handleTrash(song: Song, index: number) {
  try {
    // 如果正在播放这首歌，trashCurrentFMTrack 会同时调用 API 并切歌
    if (playerStore.isPersonalFM && playerStore.currentSong?.id === song.id) {
      await playerStore.trashCurrentFMTrack()
    } else {
      // 非当前播放歌曲，单独调用垃圾桶 API
      await fmTrash(song.id)
    }
    // 从列表中移除
    songs.value.splice(index, 1)
    showToast('已减少类似推荐', { type: 'success' })
  } catch {
    showToast('操作失败', { type: 'error' })
  }
}
</script>
