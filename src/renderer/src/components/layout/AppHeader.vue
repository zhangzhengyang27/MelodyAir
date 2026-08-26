<template>
  <header class="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6 dark:border-white/10 dark:bg-[#0F0F14]">
    <!-- Navigation buttons -->
    <div class="flex items-center gap-2">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-[#A1A1B5] dark:hover:bg-white/6"
        @click="$router.back()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-[#A1A1B5] dark:hover:bg-white/6"
        @click="$router.forward()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div class="relative mx-4 flex-1 max-w-md">
      <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索音乐、歌手、专辑..."
        class="h-9 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-9 pr-4 text-sm outline-none transition-colors focus:border-[#FFB0A0] focus:bg-white dark:border-white/10 dark:bg-[#13131C] dark:focus:border-[#FF7F66] dark:focus:bg-[#1A1A28] dark:text-[#F0F0F5]"
        @keydown.enter="handleSearch"
      />
    </div>

    <!-- User area -->
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
                <button class="user-menu-item" @click="navigateTo('/settings')">
                  <Settings class="h-4 w-4" />
                  <span>设置</span>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Sun, Moon, Library, Cloud, Settings, LogOut } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { showToast } from '@/composables/useToast'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

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

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ name: 'search', query: { q: searchQuery.value.trim() } })
  }
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
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
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
