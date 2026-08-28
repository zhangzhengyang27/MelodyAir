<template>
  <div class="space-y-2">
    <div v-if="historyList.length === 0" class="py-12 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-[#1F1F2E]">
        <Music class="h-7 w-7 text-neutral-400" />
      </div>
      <p class="text-sm text-neutral-500">暂无播放历史</p>
    </div>

    <div
      v-for="(item, index) in historyList"
      :key="`${item.song.id}-${item.playedAt}`"
      class="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.05)]"
      @dblclick="handlePlay(item.song)"
      @contextmenu.prevent="handleContextMenu($event, item)"
    >
      <!-- Cover -->
      <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
        <img
          :src="item.song.album.picUrl + '?param=80y80'"
          :alt="item.song.name"
          class="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <!-- Song info -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{{ item.song.name }}</p>
        <p class="truncate text-xs text-neutral-500">
          {{ item.song.artists.map(a => a.name).join(', ') }}
        </p>
        <p class="mt-0.5 text-xs text-neutral-400">
          {{ formatPlayedAt(item.playedAt) }} · 播放 {{ item.playCount }} 次
        </p>
      </div>

      <!-- Actions -->
      <div class="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-coral-50 hover:text-coral-500 dark:hover:bg-[rgba(255,90,95,0.18)]"
          @click="handlePlay(item.song)"
          title="播放"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          @click="handleRemove(item.song.id)"
          title="删除"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :song="contextMenuSong"
      :items="contextMenuItems"
      @close="contextMenuVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore, type Song } from '@/stores/player'
import { showToast } from '@/composables/useToast'
import ContextMenu from '../track/ContextMenu.vue'
import type { ContextMenuItem } from '../track/ContextMenu.vue'
import { Play, SkipForward, Plus, Trash2, Music } from 'lucide-vue-next'

const playerStore = usePlayerStore()
const historyList = computed(() => playerStore.playHistory)

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuSong = ref<Song | null>(null)

const contextMenuItems = computed<ContextMenuItem[]>(() => [
  {
    label: '播放',
    icon: Play,
    action: () => contextMenuSong.value && handlePlay(contextMenuSong.value)
  },
  {
    label: '插入下一首',
    icon: SkipForward,
    action: () => contextMenuSong.value && handleInsertNext(contextMenuSong.value)
  },
  {
    label: '添加到播放列表',
    icon: Plus,
    action: () => contextMenuSong.value && handleAddToPlaylist(contextMenuSong.value)
  },
  {
    label: '从历史中删除',
    icon: Trash2,
    action: () => contextMenuSong.value && handleRemove(contextMenuSong.value.id)
  }
])

function handlePlay(song: Song) {
  playerStore.playSong(song)
}

function handleInsertNext(song: Song) {
  playerStore.insertNext(song)
  showToast(`已插入下一首：${song.name}`)
}

function handleAddToPlaylist(song: Song) {
  playerStore.addToPlaylist(song)
  // addToPlaylist 会立即开始播放，文案需如实告知
  showToast(`已加入播放列表并播放：${song.name}`)
}

function handleRemove(songId: number) {
  playerStore.removeHistoryBySongId(songId)
  showToast('已从历史中删除')
}

function handleContextMenu(event: MouseEvent, item: { song: Song; playedAt: number; playCount: number }) {
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuSong.value = item.song
  contextMenuVisible.value = true
}

function formatPlayedAt(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
</script>
