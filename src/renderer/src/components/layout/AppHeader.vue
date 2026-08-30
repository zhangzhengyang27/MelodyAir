<template>
  <header class="app-header-drag flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 dark:border-white/10 dark:bg-[#0F0F14] md:px-6">
    <!-- 移动端：打开侧边栏抽屉 -->
    <button
      class="mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-[#A1A1B5] dark:hover:bg-white/6 md:hidden"
      title="菜单"
      @click="emit('toggle-sidebar')"
    >
      <Menu class="h-5 w-5" />
    </button>

    <!-- Search -->
    <div class="relative flex-1 max-w-lg" ref="searchContainerRef">
      <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索音乐、歌手、专辑..."
        class="h-9 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-9 pr-4 text-sm outline-none transition-colors focus:border-[#FFB0A0] focus:bg-white dark:border-white/10 dark:bg-[#13131C] dark:focus:border-[#FF7F66] dark:focus:bg-[#1A1A28] dark:text-[#F0F0F5]"
        @keydown.enter="handleSearchEnter"
        @keydown.down.prevent="navigateSuggestion(1)"
        @keydown.up.prevent="navigateSuggestion(-1)"
        @keydown.esc="showSuggestions = false"
        @focus="showSuggestions = true"
        @input="onSearchInput"
      />

      <!-- 搜索联想下拉 -->
      <Transition name="dropdown">
        <div
          v-if="showSuggestions && (searchHistory.length > 0 || suggestions.length > 0 || suggestionLoading || searchQuery.trim())"
          class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#171722] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
        >
          <!-- 搜索历史 -->
          <div v-if="searchHistory.length > 0 && !searchQuery.trim()" class="p-2">
            <div class="flex items-center justify-between px-2 py-1.5">
              <span class="text-xs font-medium text-neutral-400">搜索历史</span>
              <button class="text-xs text-neutral-400 hover:text-[#FF5A5F]" @click="clearSearchHistory">清空</button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="(item, idx) in searchHistory.slice(0, 8)"
                :key="item.keyword"
                class="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 transition-colors hover:bg-[#FFF5F3] hover:text-[#FF5A5F] dark:bg-white/5 dark:text-[#A1A1B5] dark:hover:bg-[rgba(255,90,95,0.15)] dark:hover:text-[#FF7F66]"
                @click="selectSuggestion(item.keyword)"
              >
                {{ item.keyword }}
              </button>
            </div>
          </div>

          <!-- 联想结果 -->
          <div v-if="searchQuery.trim()" class="max-h-80 overflow-y-auto">
            <div v-if="suggestionLoading" class="flex items-center justify-center py-6">
              <span class="text-xs text-neutral-400">搜索中...</span>
            </div>
            <template v-else-if="suggestions.length > 0">
              <button
                v-for="(sug, idx) in suggestions"
                :key="sug.type + '-' + sug.id"
                class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
                :class="{ 'bg-[#FFF5F3] dark:bg-[rgba(255,90,95,0.12)]': idx === selectedIndex }"
                @click="selectSuggestion(sug.keyword)"
                @mouseenter="selectedIndex = idx"
              >
                <Search class="h-4 w-4 shrink-0 text-neutral-400" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm" v-html="highlightKeyword(sug.keyword)"></p>
                  <p v-if="sug.subtitle" class="truncate text-xs text-neutral-400">{{ sug.subtitle }}</p>
                </div>
                <span class="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:bg-white/5">{{ sug.typeLabel }}</span>
              </button>
            </template>
            <div v-else class="py-6 text-center text-xs text-neutral-400">无匹配结果，回车搜索「{{ searchQuery }}」</div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 右侧：主题 + 用户 -->
    <div class="flex items-center gap-3">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-[#A1A1B5] dark:hover:bg-white/6"
        :title="isDark ? '切换亮色' : '切换暗色'"
        @click="toggleTheme"
      >
        <Sun v-if="isDark" class="h-[18px] w-[18px]" />
        <Moon v-else class="h-[18px] w-[18px]" />
      </button>
      <RouterLink
        v-if="!userStore.isAccountLoggedIn"
        to="/login"
        class="flex h-8 items-center rounded-full bg-[#FF5A5F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
      >
        登录
      </RouterLink>
      <div v-else class="relative" ref="userMenuRef">
        <button
          class="flex items-center gap-2 rounded-full transition-transform hover:scale-105"
          @click.stop="showUserMenu = !showUserMenu"
        >
          <img
            v-if="userStore.profile?.avatarUrl"
            :src="userStore.profile.avatarUrl"
            alt="avatar"
            class="h-8 w-8 rounded-full object-cover ring-2 ring-[#FFE8E3] dark:ring-[rgba(255,90,95,0.3)]"
          />
          <div
            v-else
            class="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5A5F] text-sm font-bold text-white ring-2 ring-[#FFE8E3] dark:ring-[rgba(255,90,95,0.3)]"
          >
            {{ (userStore.profile?.nickname || 'U').charAt(0).toUpperCase() }}
          </div>
        </button>

        <!-- 用户下拉菜单 -->
        <Teleport to="body">
          <Transition name="dropdown">
            <div
              v-if="showUserMenu"
              class="user-dropdown fixed z-50 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#171722] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
              :style="userMenuStyle"
            >
              <!-- 用户信息 -->
              <div class="border-b border-neutral-100 px-4 py-3 dark:border-white/6">
                <p class="truncate text-sm font-medium">{{ userStore.profile?.nickname }}</p>
                <p class="truncate text-xs text-neutral-400">等级 Lv.{{ userStore.profile?.level || 0 }}</p>
              </div>
              <!-- 菜单项 -->
              <div class="py-1">
                <button class="user-menu-item" @click="navigateTo('/library')">
                  <Library class="h-4 w-4" />
                  <span>我的音乐</span>
                </button>
                <button class="user-menu-item" @click="navigateTo('/cloud')">
                  <Cloud class="h-4 w-4" />
                  <span>我的云盘</span>
                </button>
              </div>
              <div class="border-t border-neutral-100 py-1 dark:border-white/6">
                <button class="user-menu-item text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" @click="handleLogout">
                  <LogOut class="h-4 w-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sun, Moon, Library, Cloud, LogOut, Search, Menu } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useSearchHistory } from '@/composables/useSearchHistory'
import { getSearchSuggest } from '@/api/search'
import { showToast } from '@/composables/useToast'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const searchQuery = ref('')
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// 搜索联想
const { history: searchHistory, addToHistory, clearHistory: clearSearchHistory } = useSearchHistory()
const suggestions = ref<Array<{ id: number | string; keyword: string; subtitle: string; type: string; typeLabel: string }>>([])
const suggestionLoading = ref(false)
const showSuggestions = ref(false)
const selectedIndex = ref(-1)
const searchContainerRef = ref<HTMLElement | null>(null)
let suggestTimer: ReturnType<typeof setTimeout> | null = null
let suggestRequestId = 0 // 搜索请求竞态防护

const isDark = computed(() => {
  if (settingsStore.theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return settingsStore.theme === 'dark'
})

// 用户菜单定位
const userMenuStyle = computed(() => {
  if (!userMenuRef.value) return { top: '0px', right: '0px' }
  const rect = userMenuRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
})

function handleSearchEnter() {
  if (selectedIndex.value >= 0 && suggestions.value[selectedIndex.value]) {
    selectSuggestion(suggestions.value[selectedIndex.value].keyword)
    return
  }
  doSearch(searchQuery.value.trim())
}

function doSearch(keyword: string) {
  if (!keyword) return
  addToHistory(keyword)
  showSuggestions.value = false
  selectedIndex.value = -1
  router.push({ name: 'search', query: { q: keyword } })
}

function selectSuggestion(keyword: string) {
  searchQuery.value = keyword
  doSearch(keyword)
}

function onSearchInput() {
  showSuggestions.value = true
  selectedIndex.value = -1
  const q = searchQuery.value.trim()
  if (!q) {
    suggestions.value = []
    if (suggestTimer) clearTimeout(suggestTimer)
    return
  }
  if (suggestTimer) clearTimeout(suggestTimer)
  suggestTimer = setTimeout(() => fetchSuggestions(q), 300)
}

async function fetchSuggestions(keyword: string) {
  const requestId = ++suggestRequestId
  suggestionLoading.value = true
  try {
    const res: any = await getSearchSuggest(keyword)
    if (requestId !== suggestRequestId) return // 过期响应，丢弃
    const result = res?.result || {}
    const list: typeof suggestions.value = []

    // 歌曲
    if (result.songs?.length) {
      result.songs.slice(0, 5).forEach((s: any) => {
        list.push({
          id: s.id,
          keyword: s.name,
          subtitle: s.artists?.map((a: any) => a.name).join(' / ') + (s.album?.name ? ` · ${s.album.name}` : ''),
          type: 'song',
          typeLabel: '歌曲'
        })
      })
    }
    // 歌手
    if (result.artists?.length) {
      result.artists.slice(0, 3).forEach((a: any) => {
        list.push({
          id: a.id,
          keyword: a.name,
          subtitle: `${a.musicSize || 0} 首歌曲`,
          type: 'artist',
          typeLabel: '歌手'
        })
      })
    }
    // 歌单
    if (result.playlists?.length) {
      result.playlists.slice(0, 3).forEach((p: any) => {
        list.push({
          id: p.id,
          keyword: p.name,
          subtitle: `${p.trackCount || 0} 首`,
          type: 'playlist',
          typeLabel: '歌单'
        })
      })
    }
    // 专辑
    if (result.albums?.length) {
      result.albums.slice(0, 2).forEach((al: any) => {
        list.push({
          id: al.id,
          keyword: al.name,
          subtitle: al.artist?.name || '',
          type: 'album',
          typeLabel: '专辑'
        })
      })
    }

    suggestions.value = list
  } catch {
    if (requestId === suggestRequestId) suggestions.value = []
  } finally {
    if (requestId === suggestRequestId) suggestionLoading.value = false
  }
}

function navigateSuggestion(direction: number) {
  if (suggestions.value.length === 0) return
  showSuggestions.value = true
  selectedIndex.value = (selectedIndex.value + direction + suggestions.value.length) % suggestions.value.length
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightKeyword(text: string): string {
  const q = searchQuery.value.trim()
  const escaped = escapeHtml(text)
  if (!q) return escaped
  // 对转义后的文本按关键词分割，匹配部分加高亮
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = escaped.split(new RegExp(`(${escapedQ})`, 'gi'))
  return parts.map(part =>
    part.toLowerCase() === q.toLowerCase()
      ? `<span class="text-[#FF5A5F] font-medium">${part}</span>`
      : part
  ).join('')
}

function toggleTheme() {
  if (isDark.value) {
    settingsStore.setTheme('light')
    document.documentElement.classList.remove('dark')
  } else {
    settingsStore.setTheme('dark')
    document.documentElement.classList.add('dark')
  }
}

function navigateTo(path: string) {
  showUserMenu.value = false
  router.push(path)
}

async function handleLogout() {
  showUserMenu.value = false
  try {
    await userStore.logout()
    showToast('已退出登录')
    router.push('/')
  } catch {
    showToast('退出失败', { type: 'error' })
  }
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (userMenuRef.value && !userMenuRef.value.contains(target)) showUserMenu.value = false
  if (searchContainerRef.value && !searchContainerRef.value.contains(target)) showSuggestions.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (suggestTimer) clearTimeout(suggestTimer)
})
</script>

<style scoped>
@reference "tailwindcss";

/* 拖拽区：整行可拖动，交互元素排除 */
.app-header-drag {
  -webkit-app-region: drag;
}

.app-header-drag button,
.app-header-drag input,
.app-header-drag a {
  -webkit-app-region: no-drag;
}

/* 用户下拉菜单 */
.user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: var(--color-neutral-700);
  transition: background-color 0.15s ease;
  text-align: left;
}

.user-menu-item:hover {
  background-color: var(--color-neutral-50);
}

.dark .user-menu-item {
  color: #E9E9F2;
}

.dark .user-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

/* 下拉菜单过渡 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.18s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
