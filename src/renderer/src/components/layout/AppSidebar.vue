<template>
  <aside class="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-white/10 dark:bg-[#0F0F14]">
    <!-- Logo（顶部留出空间给 macOS 原生红绿灯） -->
    <div class="flex items-center gap-2 px-5 pt-8 pb-4">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF5A5F] text-white shadow-[0_2px_8px_rgba(255,90,95,0.3)]">
        <Music class="h-4 w-4" />
      </div>
      <span class="text-lg font-semibold tracking-tight">Melody Air</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 sidebar-scroll">
      <!-- 发现组 -->
      <div class="mb-1.5 px-2 text-xs font-medium uppercase tracking-wider text-neutral-400">发现</div>
      <RouterLink
        v-for="item in discoverItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        exact-active-class="nav-item-active"
      >
        <span class="nav-indicator" />
        <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </RouterLink>

      <!-- 我喜欢的音乐（一等公民，置顶） -->
      <div class="mb-1.5 mt-4 px-2 text-xs font-medium uppercase tracking-wider text-neutral-400">我的</div>
      <RouterLink
        to="/library"
        class="nav-item"
        exact-active-class="nav-item-active"
      >
        <span class="nav-indicator" />
        <Heart class="h-[18px] w-[18px] shrink-0 text-[#FF5A5F]" :fill="'currentColor'" />
        <span class="truncate font-medium">我喜欢的音乐</span>
      </RouterLink>

      <!-- 我的音乐（可展开分组） -->
      <div class="mt-0.5">
        <button
          class="nav-item w-full"
          @click="myMusicExpanded = !myMusicExpanded"
        >
          <span class="nav-indicator" />
          <Library class="h-[18px] w-[18px] shrink-0" />
          <span class="flex-1 truncate text-left">我的音乐</span>
          <ChevronDown v-if="myMusicExpanded" class="h-3.5 w-3.5 text-neutral-400" />
          <ChevronRight v-else class="h-3.5 w-3.5 text-neutral-400" />
        </button>

        <Transition name="expand">
          <div v-if="myMusicExpanded" class="ml-4 space-y-0.5 border-l border-neutral-100 pl-2 dark:border-white/5">
            <RouterLink
              v-for="item in myMusicItems"
              :key="item.label"
              :to="item.to"
              class="nav-item nav-item-compact"
              exact-active-class="nav-item-active"
            >
              <component :is="item.icon" class="h-4 w-4 shrink-0" />
              <span class="truncate text-[13px]">{{ item.label }}</span>
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- 用户歌单列表（可展开） -->
      <template v-if="userStore.isAccountLoggedIn && userPlaylists.length > 0">
        <div class="mb-1.5 mt-4 flex items-center justify-between px-2">
          <button class="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:text-neutral-600 dark:hover:text-[#E9E9F2]" @click="playlistsExpanded = !playlistsExpanded">
            <span>我的歌单</span>
            <ChevronDown v-if="playlistsExpanded" class="h-3 w-3" />
            <ChevronRight v-else class="h-3 w-3" />
          </button>
          <button class="text-neutral-400 transition-colors hover:text-[#FF5A5F]" title="新建歌单" @click="showCreateDialog = true">
            <Plus class="h-3.5 w-3.5" />
          </button>
        </div>
        <div v-if="playlistsExpanded" class="space-y-0.5">
          <RouterLink
            v-for="playlist in visiblePlaylists"
            :key="playlist.id"
            :to="`/playlist/${playlist.id}`"
            class="nav-item nav-item-compact"
            active-class="nav-item-active"
          >
            <div class="h-5 w-5 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-[#1F1F2E]">
              <img v-if="playlist.coverImgUrl" :src="playlist.coverImgUrl + '?param=50y50'" alt="" class="h-full w-full object-cover" />
            </div>
            <span class="truncate text-[13px]">{{ playlist.name }}</span>
          </RouterLink>
          <button
            v-if="userPlaylists.length > PLAYLIST_PREVIEW_COUNT"
            class="nav-item nav-item-compact w-full text-[13px] text-neutral-400 hover:text-[#FF5A5F]"
            @click="showAllPlaylists = !showAllPlaylists"
          >
            {{ showAllPlaylists ? '收起' : `展开全部 (${userPlaylists.length})` }}
          </button>
        </div>
      </template>
    </nav>

    <!-- 新建歌单对话框 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreateDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateDialog = false">
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#171722]">
            <h3 class="mb-4 text-base font-semibold">新建歌单</h3>
            <input
              v-model="newPlaylistName"
              type="text"
              placeholder="请输入歌单名称"
              class="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#FF5A5F] focus:bg-white dark:border-white/10 dark:bg-[#13131C] dark:text-[#F0F0F5]"
              @keyup.enter="handleCreatePlaylist"
            />
            <div class="mt-5 flex justify-end gap-2">
              <button class="rounded-xl px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5" @click="showCreateDialog = false">取消</button>
              <button class="rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D] disabled:opacity-50" :disabled="!newPlaylistName.trim() || creating" @click="handleCreatePlaylist">
                {{ creating ? '创建中...' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Home, Trophy, ListMusic, Mic, Film, Disc3, Radio,
  Library, HardDrive, Cloud, Plus, Heart, Music,
  ChevronDown, ChevronRight, Headphones, Clock
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { usePlatform } from '@/composables/usePlatform'
import { showToast } from '@/composables/useToast'

const userStore = useUserStore()
const { hasLocalScan } = usePlatform()

/** 歌单列表默认预览数量 */
const PLAYLIST_PREVIEW_COUNT = 10

// 展开状态
const myMusicExpanded = ref(true)
const playlistsExpanded = ref(true)
const showAllPlaylists = ref(false)

// 发现组（7 项，已移除每日推荐）
const discoverItems = [
  { to: '/', icon: Home, label: '发现' },
  { to: '/toplist', icon: Trophy, label: '排行榜' },
  { to: '/playlists', icon: ListMusic, label: '歌单' },
  { to: '/artists', icon: Mic, label: '歌手' },
  { to: '/mv-browse', icon: Film, label: 'MV' },
  { to: '/albums', icon: Disc3, label: '新碟' },
  { to: '/dj', icon: Radio, label: '播客' }
]

// 我的音乐分组（本地音乐按平台隐藏，私人FM/云盘按登录状态隐藏）
const myMusicItems = computed(() => {
  const items: Array<{ to: any; icon: any; label: string }> = [
    { to: { path: '/library', query: { tab: 'recent' } }, icon: Clock, label: '最近播放' }
  ]
  if (hasLocalScan) {
    items.push({ to: '/local', icon: HardDrive, label: '本地音乐' })
  }
  if (userStore.isAccountLoggedIn) {
    items.push({ to: '/fm', icon: Headphones, label: '私人FM' })
    items.push({ to: '/cloud', icon: Cloud, label: '云盘' })
  }
  return items
})

const showCreateDialog = ref(false)
const newPlaylistName = ref('')
const creating = ref(false)

// 用户歌单列表（排除我喜欢的音乐）
const userPlaylists = computed(() => {
  return userStore.playlists.filter((p: any) => p.id !== userStore.likedSongPlaylistId)
})

// 可见歌单（预览 or 全部）
const visiblePlaylists = computed(() => {
  if (showAllPlaylists.value) return userPlaylists.value
  return userPlaylists.value.slice(0, PLAYLIST_PREVIEW_COUNT)
})

onMounted(async () => {
  if (userStore.isAccountLoggedIn && userStore.playlists.length === 0) {
    await userStore.fetchLikedPlaylist()
  }
})

async function handleCreatePlaylist() {
  if (!newPlaylistName.value.trim() || creating.value) return
  creating.value = true
  try {
    const id = await userStore.createNewPlaylist(newPlaylistName.value.trim())
    if (id) {
      showToast('歌单创建成功')
      showCreateDialog.value = false
      newPlaylistName.value = ''
      await userStore.fetchLikedPlaylist()
    } else {
      showToast('创建失败，请重试', { type: 'error' })
    }
  } catch {
    showToast('创建失败，请重试', { type: 'error' })
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-item-compact {
  padding: 0.375rem 0.625rem;
  gap: 0.625rem;
}

.nav-item:hover {
  background-color: var(--color-neutral-100);
}

.dark .nav-item {
  color: #A1A1B5;
}

.dark .nav-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: #F0F0F5;
}

/* 激活指示器：左侧竖条 */
.nav-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 16px;
  border-radius: 0 2px 2px 0;
  background: #FF5A5F;
  transition: transform 0.2s ease;
}

.nav-item-active {
  background-color: #FFF5F3;
  font-weight: 500;
  color: #E0484D;
}

.nav-item-active .nav-indicator {
  transform: translateY(-50%) scaleY(1);
}

.dark .nav-item-active {
  background-color: rgba(255, 90, 95, 0.18);
  color: #FF7F66;
}

.dark .nav-item-active .nav-indicator {
  background: #FF7F66;
}

/* 自定义滚动条 */
.sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}

.dark .sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.2s ease, max-height 0.25s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}

/* 对话框过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
