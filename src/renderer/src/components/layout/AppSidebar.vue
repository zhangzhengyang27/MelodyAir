<template>
  <aside class="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-white/10 dark:bg-[#0F0F14]">
    <!-- Logo -->
    <div class="flex items-center gap-2 px-5 py-4">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF5A5F] text-white shadow-[0_2px_8px_rgba(255,90,95,0.3)]">
        <Music class="h-4 w-4" />
      </div>
      <span class="text-lg font-semibold tracking-tight">Melody Air</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto sidebar-scroll">
      <div class="mb-1.5 px-2 text-xs font-medium uppercase tracking-wider text-neutral-400">发现</div>
      <RouterLink
        v-for="item in discoverItems"
        :key="item.to"
        :to="item.to"
        :active-match-options="{ strict: item.to === '/' }"
        class="nav-item"
        active-class="nav-item-active"
      >
        <span class="nav-indicator" />
        <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </RouterLink>

      <div class="mb-1.5 mt-4 px-2 text-xs font-medium uppercase tracking-wider text-neutral-400">我的</div>
      <RouterLink
        v-for="item in myItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        active-class="nav-item-active"
      >
        <span class="nav-indicator" />
        <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
        <span class="truncate">{{ item.label }}</span>
      </RouterLink>

      <!-- 用户歌单列表 -->
      <template v-if="userStore.isAccountLoggedIn && userPlaylists.length > 0">
        <div class="mb-1.5 mt-4 flex items-center justify-between px-2">
          <span class="text-xs font-medium uppercase tracking-wider text-neutral-400">我的歌单</span>
          <button class="text-neutral-400 hover:text-[#FF5A5F] transition-colors" title="新建歌单" @click="showCreateDialog = true">
            <Plus class="h-3.5 w-3.5" />
          </button>
        </div>
        <div class="space-y-0.5">
          <RouterLink
            v-for="playlist in userPlaylists"
            :key="playlist.id"
            :to="`/playlist/${playlist.id}`"
            class="nav-item nav-item-compact"
            active-class="nav-item-active"
          >
            <span class="nav-indicator" />
            <div class="h-5 w-5 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-[#1F1F2E]">
              <img v-if="playlist.coverImgUrl" :src="playlist.coverImgUrl + '?param=50y50'" alt="" class="h-full w-full object-cover" />
            </div>
            <span class="truncate text-[13px]">{{ playlist.name }}</span>
          </RouterLink>
        </div>
      </template>
    </nav>

    <!-- Settings -->
    <div class="border-t border-neutral-200 p-3 dark:border-neutral-700">
      <RouterLink to="/settings" class="nav-item" active-class="nav-item-active">
        <span class="nav-indicator" />
        <Settings class="h-[18px] w-[18px] shrink-0" />
        <span>设置</span>
      </RouterLink>
    </div>

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
  Home, Trophy, ListMusic, Mic, Film, Disc3, Radio, CalendarDays,
  Library, HardDrive, Cloud, Settings, Plus
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { showToast } from '@/composables/useToast'

const userStore = useUserStore()

const discoverItems = [
  { to: '/', icon: Home, label: '发现' },
  { to: '/toplist', icon: Trophy, label: '排行榜' },
  { to: '/playlists', icon: ListMusic, label: '歌单' },
  { to: '/artists', icon: Mic, label: '歌手' },
  { to: '/mv-browse', icon: Film, label: 'MV' },
  { to: '/albums', icon: Disc3, label: '新碟' },
  { to: '/dj', icon: Radio, label: '播客' },
  { to: '/daily', icon: CalendarDays, label: '每日推荐' }
]

const myItems = [
  { to: '/library', icon: Library, label: '我的音乐' },
  { to: '/local', icon: HardDrive, label: '本地音乐' },
  { to: '/fm', icon: Radio, label: '私人FM' },
  { to: '/cloud', icon: Cloud, label: '云盘' }
]

const showCreateDialog = ref(false)
const newPlaylistName = ref('')
const creating = ref(false)

// 用户歌单列表（排除我喜欢的音乐，只显示用户创建和收藏的）
const userPlaylists = computed(() => {
  return userStore.playlists.filter((p: any) => p.id !== userStore.likedSongPlaylistId).slice(0, 20)
})

onMounted(async () => {
  // 如果已登录但歌单为空，尝试获取
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
