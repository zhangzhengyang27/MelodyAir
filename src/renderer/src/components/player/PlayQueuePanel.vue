<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div v-if="visible" class="fixed inset-0 z-50 bg-black/30" @click.self="emitClose" />
    </Transition>
    <Transition name="panel-slide">
      <aside
        v-if="visible"
        class="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0F0F14]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-white/5">
          <div class="flex items-center gap-2">
            <ListMusic class="h-5 w-5 text-[#FF5A5F]" />
            <span class="text-base font-semibold">{{ tabLabel }}</span>
            <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-white/5 dark:text-[#A1A1B5]">
              {{ tabCount }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="activeTab === 'queue' && playerStore.playlist.length > 0"
              class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#FF5A5F] dark:hover:bg-white/5"
              title="保存为歌单"
              @click="handleSaveAsPlaylist"
            >
              <Plus class="h-3.5 w-3.5" />
              存为歌单
            </button>
            <button
              v-if="activeTab === 'queue' && playerStore.playlist.length > 0"
              class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-red-500 dark:hover:bg-white/5"
              title="清空队列"
              @click="handleClearQueue"
            >
              <Trash2 class="h-3.5 w-3.5" />
              清空
            </button>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-[#F0F0F5]"
              @click="emitClose"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-neutral-100 px-2 dark:border-white/5">
          <button
            class="relative flex-1 py-2.5 text-sm font-medium transition-colors"
            :class="activeTab === 'queue' ? 'text-[#FF5A5F]' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-[#E9E9F2]'"
            @click="activeTab = 'queue'"
          >
            正在播放
            <span v-if="activeTab === 'queue'" class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#FF5A5F]" />
          </button>
          <button
            class="relative flex-1 py-2.5 text-sm font-medium transition-colors"
            :class="activeTab === 'next' ? 'text-[#FF5A5F]' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-[#E9E9F2]'"
            @click="activeTab = 'next'"
          >
            下一首播放
            <span v-if="activeTab === 'next'" class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#FF5A5F]" />
          </button>
          <button
            class="relative flex-1 py-2.5 text-sm font-medium transition-colors"
            :class="activeTab === 'similar' ? 'text-[#FF5A5F]' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-[#E9E9F2]'"
            @click="activeTab = 'similar'; fetchSimilarSongs()"
          >
            相似歌曲
            <span v-if="activeTab === 'similar'" class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#FF5A5F]" />
          </button>
        </div>

        <!-- Queue list -->
        <div class="flex-1 overflow-y-auto">
          <!-- 正在播放 -->
          <template v-if="activeTab === 'queue'">
            <div v-if="playerStore.playlist.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
              <ListMusic class="mb-3 h-10 w-10 text-neutral-200 dark:text-white/10" />
              <p class="text-sm text-neutral-400">播放队列为空</p>
              <p class="mt-1 text-xs text-neutral-300 dark:text-white/20">选择歌曲后会自动加入队列</p>
            </div>
            <div v-else>
              <div
                v-for="(song, idx) in playerStore.playlist"
                :key="song.id"
                class="group flex cursor-pointer items-center gap-3 border-b border-neutral-50 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-white/[0.03] dark:hover:bg-white/[0.03]"
                :class="{ 'bg-[#FFF5F3] dark:bg-[rgba(255,90,95,0.10)]': idx === playerStore.currentIndex }"
                draggable="true"
                @dragstart="handleDragStart($event, idx)"
                @dragover.prevent="handleDragOver(idx)"
                @dragleave="dragOverIndex = -1"
                @drop="handleDrop(idx)"
                @dragend="handleDragEnd"
                @click="handlePlayFromQueue(idx, song)"
              >
                <!-- 拖拽手柄 / 序号 / 播放图标 -->
                <div class="flex w-6 shrink-0 items-center justify-center">
                  <GripVertical
                    v-if="idx !== playerStore.currentIndex"
                    class="h-4 w-4 cursor-grab text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-white/20"
                  />
                  <Play v-else class="h-3.5 w-3.5 text-[#FF5A5F]" />
                  <span v-if="idx !== playerStore.currentIndex" class="text-xs text-neutral-400">{{ idx + 1 }}</span>
                </div>

                <!-- 封面 -->
                <div class="h-9 w-9 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-[#1F1F2E]">
                  <img v-if="song.album?.picUrl" :src="song.album.picUrl + '?param=80y80'" alt="" class="h-full w-full object-cover" />
                </div>

                <!-- 歌曲信息 -->
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm" :class="idx === playerStore.currentIndex ? 'font-medium text-[#FF5A5F]' : ''">{{ song.name }}</p>
                  <p class="truncate text-xs text-neutral-400">{{ song.artists?.map(a => a.name).join(' / ') }}</p>
                </div>

                <!-- 时长 -->
                <span class="shrink-0 text-xs text-neutral-400">{{ formatDuration(song.duration) }}</span>

                <!-- 移除按钮 -->
                <button
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-300 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-red-500 group-hover:opacity-100 dark:text-white/20 dark:hover:bg-white/5"
                  title="从队列移除"
                  @click.stop="handleRemoveFromQueue(idx)"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </template>

          <!-- 下一首播放 -->
          <template v-else-if="activeTab === 'next'">
            <div v-if="playerStore.playNextList.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
              <SkipForward class="mb-3 h-10 w-10 text-neutral-200 dark:text-white/10" />
              <p class="text-sm text-neutral-400">暂无下一首播放</p>
              <p class="mt-1 text-xs text-neutral-300 dark:text-white/20">在歌曲菜单中选择「下一首播放」</p>
            </div>
            <div v-else>
              <div
                v-for="(song, idx) in playerStore.playNextList"
                :key="song.id"
                class="group flex cursor-pointer items-center gap-3 border-b border-neutral-50 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-white/[0.03] dark:hover:bg-white/[0.03]"
                @click="handlePlayFromNext(idx, song)"
              >
                <div class="flex w-6 shrink-0 items-center justify-center">
                  <span class="text-xs text-neutral-400">{{ idx + 1 }}</span>
                </div>
                <div class="h-9 w-9 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-[#1F1F2E]">
                  <img v-if="song.album?.picUrl" :src="song.album.picUrl + '?param=80y80'" alt="" class="h-full w-full object-cover" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm">{{ song.name }}</p>
                  <p class="truncate text-xs text-neutral-400">{{ song.artists?.map(a => a.name).join(' / ') }}</p>
                </div>
                <span class="shrink-0 text-xs text-neutral-400">{{ formatDuration(song.duration) }}</span>
                <button
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-300 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-red-500 group-hover:opacity-100 dark:text-white/20 dark:hover:bg-white/5"
                  title="移除"
                  @click.stop="handleRemoveFromNext(idx)"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </template>

          <!-- 相似歌曲 -->
          <template v-else>
            <div v-if="similarLoading" class="flex flex-col items-center justify-center py-16">
              <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5A5F] border-t-transparent" />
              <p class="mt-3 text-sm text-neutral-400">加载中...</p>
            </div>
            <div v-else-if="!playerStore.currentSong" class="flex flex-col items-center justify-center py-16 text-center">
              <Music class="mb-3 h-10 w-10 text-neutral-200 dark:text-white/10" />
              <p class="text-sm text-neutral-400">暂无播放歌曲</p>
            </div>
            <div v-else-if="similarSongs.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
              <Music class="mb-3 h-10 w-10 text-neutral-200 dark:text-white/10" />
              <p class="text-sm text-neutral-400">暂无相似歌曲</p>
            </div>
            <div v-else>
              <div
                v-for="(song, idx) in similarSongs"
                :key="song.id"
                class="group flex cursor-pointer items-center gap-3 border-b border-neutral-50 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:border-white/[0.03] dark:hover:bg-white/[0.03]"
                @click="handlePlaySimilar(song)"
              >
                <div class="flex w-6 shrink-0 items-center justify-center">
                  <span class="text-xs text-neutral-400">{{ idx + 1 }}</span>
                </div>
                <div class="h-9 w-9 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-[#1F1F2E]">
                  <img v-if="song.album?.picUrl" :src="song.album.picUrl + '?param=80y80'" alt="" class="h-full w-full object-cover" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm">{{ song.name }}</p>
                  <p class="truncate text-xs text-neutral-400">{{ song.artists?.map(a => a.name).join(' / ') }}</p>
                </div>
                <button
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-300 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-[#FF5A5F] group-hover:opacity-100 dark:text-white/20 dark:hover:bg-white/5"
                  title="下一首播放"
                  @click.stop="handleAddToNext(song)"
                >
                  <SkipForward class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  ListMusic, Plus, Trash2, X, Play, GripVertical, SkipForward, Music
} from 'lucide-vue-next'
import { usePlayerStore } from '@/stores/player'
import { useUserStore } from '@/stores/user'
import { formatDuration } from '@/utils/format'
import { showToast } from '@/composables/useToast'
import { getSimiSong } from '@/api/simi'
import type { Song } from '@/stores/player'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>()

const playerStore = usePlayerStore()
const userStore = useUserStore()

const activeTab = ref<'queue' | 'next' | 'similar'>('queue')
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

// 相似歌曲
const similarSongs = ref<Song[]>([])
const similarLoading = ref(false)
let similarFetchToken = 0

const tabLabel = computed(() => {
  if (activeTab.value === 'queue') return '播放队列'
  if (activeTab.value === 'next') return '下一首播放'
  return '相似歌曲'
})

const tabCount = computed(() => {
  if (activeTab.value === 'queue') return playerStore.playlist.length
  if (activeTab.value === 'next') return playerStore.playNextList.length
  return similarSongs.value.length
})

// 切歌时自动刷新相似歌曲（当在相似 tab 时）
watch(() => playerStore.currentSong?.id, (newId) => {
  if (activeTab.value === 'similar' && newId) {
    fetchSimilarSongs()
  }
})

async function fetchSimilarSongs() {
  const songId = playerStore.currentSong?.id
  if (!songId) return
  const token = ++similarFetchToken
  similarLoading.value = true
  try {
    const res: any = await getSimiSong(songId)
    if (token !== similarFetchToken) return // 已被新请求覆盖
    similarSongs.value = (res?.songs || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      artists: (s.artists || s.ar || []).map((a: any) => ({ id: a.id, name: a.name })),
      album: { id: s.album?.id || s.al?.id || 0, name: s.album?.name || s.al?.name || '', picUrl: s.album?.picUrl || s.al?.picUrl || '' },
      duration: s.duration || s.dt || 0,
      fee: s.fee || 0,
    }))
  } catch {
    similarSongs.value = []
  } finally {
    if (token === similarFetchToken) similarLoading.value = false
  }
}

function handlePlaySimilar(song: Song) {
  playerStore.addToPlaylist(song)
}

function handleAddToNext(song: Song) {
  playerStore.addToPlayNext(song)
  showToast('已添加到下一首播放', { type: 'success' })
}

function emitClose() {
  emit('update:visible', false)
}

function handlePlayFromQueue(idx: number, song: Song) {
  playerStore.currentIndex = idx
  playerStore.playSong(song)
}

function handlePlayFromNext(idx: number, song: Song) {
  // 从下一首列表移除，插入到当前播放之后并立即播放
  playerStore.playNextList.splice(idx, 1)
  playerStore.insertNext(song)
  // insertNext 已将歌曲放到 currentIndex+1，直接定位并播放
  playerStore.currentIndex = playerStore.currentIndex + 1
  playerStore.playSong(song)
}

function handleRemoveFromQueue(idx: number) {
  playerStore.removeFromPlaylist(idx)
}

function handleRemoveFromNext(idx: number) {
  playerStore.playNextList.splice(idx, 1)
}

function handleClearQueue() {
  if (!confirm('确定要清空播放队列吗？')) return
  playerStore.clearPlaylist()
  showToast('已清空播放队列')
}

async function handleSaveAsPlaylist() {
  if (!userStore.isAccountLoggedIn) {
    showToast('请先登录后再保存歌单', { type: 'warning' })
    return
  }
  const trackIds = playerStore.playlist.map(s => s.id)
  if (trackIds.length === 0) {
    showToast('队列为空，无法保存', { type: 'warning' })
    return
  }
  const name = prompt('请输入歌单名称：', `播放队列 ${new Date().toLocaleDateString()}`)
  if (!name?.trim()) return
  try {
    const playlistId = await userStore.createNewPlaylist(name.trim())
    if (playlistId) {
      // 批量添加队列歌曲到新歌单
      const ok = await userStore.addTrackToPlaylist(playlistId, trackIds)
      if (ok) {
        showToast(`已保存为歌单（${trackIds.length} 首）`)
      } else {
        showToast('歌单已创建，但添加歌曲失败', { type: 'warning' })
      }
      emitClose()
    } else {
      showToast('创建歌单失败', { type: 'error' })
    }
  } catch {
    showToast('创建歌单失败', { type: 'error' })
  }
}

// ==================== 拖拽排序 ====================
function handleDragStart(e: DragEvent, idx: number) {
  dragIndex.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
}

function handleDragOver(idx: number) {
  dragOverIndex.value = idx
}

function handleDrop(idx: number) {
  if (dragIndex.value >= 0 && dragIndex.value !== idx) {
    playerStore.reorderPlaylist(dragIndex.value, idx)
  }
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function handleDragEnd() {
  dragIndex.value = -1
  dragOverIndex.value = -1
}
</script>

<style scoped>
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.25s ease;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}
</style>
