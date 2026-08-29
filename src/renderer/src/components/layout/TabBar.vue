<template>
  <nav
    class="flex h-14 shrink-0 items-stretch border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-white/10 dark:bg-[#0F0F14] md:hidden"
    style="-webkit-app-region: no-drag;"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tab-item"
      :class="{ 'tab-item-active': isActive(tab) }"
    >
      <component :is="tab.icon" class="h-[22px] w-[22px]" />
      <span class="text-[10px] leading-none">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { Home, ListMusic, Trophy, Library } from 'lucide-vue-next'

const route = useRoute()

interface TabItem {
  to: string
  icon: any
  label: string
  /** 是否匹配子路由（如 /playlist/:id 归属「歌单」） */
  matchChildren?: boolean
}

// 移动端底部 tab：高频入口（其余低频入口仍走侧边栏抽屉）
const tabs: TabItem[] = [
  { to: '/', icon: Home, label: '发现' },
  { to: '/playlists', icon: ListMusic, label: '歌单', matchChildren: true },
  { to: '/toplist', icon: Trophy, label: '排行榜' },
  { to: '/library', icon: Library, label: '我的' }
]

function isActive(tab: TabItem): boolean {
  if (tab.matchChildren) {
    return route.path === tab.to || route.path.startsWith(`${tab.to}/`) || route.path.startsWith('/playlist/')
  }
  return route.path === tab.to
}
</script>

<style scoped>
.tab-item {
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  color: var(--color-neutral-400);
  transition: color 0.15s ease;
}

.tab-item-active {
  color: #FF5A5F;
}

.dark .tab-item {
  color: #6B6B80;
}

.dark .tab-item-active {
  color: #FF7F66;
}
</style>
