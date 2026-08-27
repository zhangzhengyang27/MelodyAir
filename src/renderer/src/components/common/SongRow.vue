<template>
  <div
    class="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.05)]"
    :class="{ 'bg-coral-50 dark:bg-[rgba(255,90,95,0.15)]': isActive }"
    @dblclick="handlePlay"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Index / Playing indicator -->
    <div class="w-8 shrink-0 text-center text-sm text-neutral-400">
      <span v-if="isActive && playerStore.playing" class="eq mx-auto text-[#FF5A5F]">
        <span class="eq-bar" /><span class="eq-bar" /><span class="eq-bar" />
      </span>
      <span v-else>{{ index + 1 }}</span>
    </div>

    <!-- Cover -->
    <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
      <img
        v-if="song.album?.picUrl"
        :src="song.album.picUrl + '?param=80y80'"
        alt=""
        class="h-full w-full object-cover"
        loading="lazy"
      />
    </div>

    <!-- Song info -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="truncate text-sm font-medium" :class="{ 'text-coral-500': isActive }">{{ song.name }}</p>
        <span
          v-if="song.fee === 1"
          class="inline-flex shrink-0 items-center rounded px-1 py-px text-[10px] leading-none font-medium"
          :class="isActive ? 'bg-coral-500/15 text-coral-500' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'"
        >VIP</span>
      </div>
      <p class="truncate text-xs text-neutral-500">
        <template v-if="song.artists?.length">
          <template v-for="(artist, idx) in song.artists" :key="artist.id">
            <router-link
              :to="`/artist/${artist.id}`"
              class="hover:text-coral-500 dark:hover:text-coral-400 transition-colors"
              @click.stop
            >{{ artist.name }}</router-link>
            <span v-if="idx < song.artists.length - 1"> / </span>
          </template>
        </template>
      </p>
    </div>

    <!-- Album -->
    <div class="hidden min-w-0 w-40 shrink-0 lg:block">
      <router-link
        v-if="song.album?.id"
        :to="`/album/${song.album.id}`"
        class="truncate text-xs text-neutral-500 hover:text-coral-500 dark:hover:text-coral-400 transition-colors block"
        @click.stop
      >{{ song.album.name }}</router-link>
      <p v-else class="truncate text-xs text-neutral-500">{{ song.album?.name ?? '' }}</p>
    </div>

    <!-- Duration -->
    <div class="w-12 shrink-0 text-right text-xs text-neutral-400">
      {{ formatDuration(song.duration) }}
    </div>

    <!-- Hover actions -->
    <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-coral-50 hover:text-coral-500 dark:hover:bg-[rgba(255,90,95,0.18)] dark:text-[#6B6B80] dark:group-hover:text-[#A1A1B5]"
        @click="handlePlay"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
    </div>
  </div>

  <ContextMenu
    :visible="contextMenuVisible"
    :x="contextMenuX"
    :y="contextMenuY"
    :song="song"
    :items="contextMenuItems"
    @close="contextMenuVisible = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import type { Song } from '@/stores/player'
import { formatDuration } from '@/utils/format'
import { showToast } from '@/composables/useToast'
import ContextMenu from '../track/ContextMenu.vue'
import type { ContextMenuItem } from '../track/ContextMenu.vue'
import { Play, SkipForward, Plus } from 'lucide-vue-next'

const props = defineProps<{
  song: Song
  index: number
}>()

const emit = defineEmits<{
  play: [song: Song]
}>()

const playerStore = usePlayerStore()
const isActive = computed(() => playerStore.currentSong?.id === props.song.id)

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const contextMenuItems = computed<ContextMenuItem[]>(() => [
  {
    label: '播放',
    icon: Play,
    action: () => handlePlay()
  },
  {
    label: '插入下一首',
    icon: SkipForward,
    action: () => handleInsertNext()
  },
  {
    label: '添加到播放列表',
    icon: Plus,
    action: () => handleAddToPlaylist()
  }
])

function handlePlay() {
  emit('play', props.song)
}

function handleInsertNext() {
  playerStore.insertNext(props.song)
  showToast(`已插入下一首：${props.song.name}`)
}

function handleAddToPlaylist() {
  playerStore.addToPlaylist(props.song)
  showToast(`已添加到播放列表：${props.song.name}`)
}

function handleContextMenu(event: MouseEvent) {
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}
</script>
