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
        {{ isDark ? '☀️' : '🌙' }}
      </button>
      <RouterLink
        v-if="!userStore.loggedIn"
        to="/login"
        class="flex h-8 items-center rounded-full bg-[#FF5A5F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
      >
        登录
      </RouterLink>
      <RouterLink v-else to="/library" class="flex items-center gap-2">
        <img
          :src="userStore.profile?.avatarUrl"
          alt="avatar"
          class="h-8 w-8 rounded-full object-cover ring-2 ring-[#FFE8E3] dark:ring-[rgba(255,90,95,0.3)]"
        />
      </RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')

const isDark = computed(() => {
  if (settingsStore.theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return settingsStore.theme === 'dark'
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
</script>
