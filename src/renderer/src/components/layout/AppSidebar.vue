<template>
  <aside class="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
    <!-- Logo -->
    <div class="flex items-center gap-2 px-5 py-4">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF5A5F] text-white font-bold text-sm">
        M
      </div>
      <span class="text-lg font-semibold tracking-tight">Melody Air</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 px-3 py-2">
      <div class="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-neutral-400">发现</div>
      <RouterLink
        v-for="item in discoverItems"
        :key="item.to"
        :to="item.to"
        :active-match-options="{ strict: item.to === '/' }"
        class="sidebar-link"
        active-class="sidebar-link-active"
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>

      <div class="mb-2 mt-4 px-2 text-xs font-medium uppercase tracking-wider text-neutral-400">我的</div>
      <RouterLink
        v-for="item in myItems"
        :key="item.to"
        :to="item.to"
        class="sidebar-link"
        active-class="sidebar-link-active"
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Settings -->
    <div class="border-t border-neutral-200 p-3 dark:border-neutral-700">
      <RouterLink to="/settings" class="sidebar-link" active-class="sidebar-link-active">
        <span class="text-lg">⚙️</span>
        <span>设置</span>
      </RouterLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

const discoverItems = [
  { to: '/', icon: '🏠', label: '发现' },
  { to: '/search', icon: '🔍', label: '搜索' },
  { to: '/toplist', icon: '🏆', label: '排行榜' }
]

const myItems = [
  { to: '/library', icon: '📚', label: '我的音乐' },
  { to: '/fm', icon: '📻', label: '私人FM' },
  { to: '/cloud', icon: '☁️', label: '云盘' }
]
</script>

<style scoped>
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 12px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  transition: background-color 0.15s;
}

.sidebar-link:hover {
  background-color: var(--color-neutral-100);
}

.dark .sidebar-link {
  color: var(--color-neutral-300);
}

.dark .sidebar-link:hover {
  background-color: var(--color-neutral-700);
}

.sidebar-link-active {
  background-color: #FFF5F3;
  font-weight: 500;
  color: #E0484D;
}

.dark .sidebar-link-active {
  background-color: rgba(196, 58, 63, 0.2);
  color: #FF7F66;
}
</style>
