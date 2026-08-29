<template>
  <div class="flex h-screen flex-col bg-neutral-50 text-neutral-900 supports-[height:100dvh]:h-dvh dark:bg-[#09090B] dark:text-[#F0F0F5]">
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar（桌面端常驻，移动端隐藏改用抽屉） -->
      <AppSidebar class="max-md:hidden" />

      <!-- Mobile sidebar drawer -->
      <Transition name="drawer">
        <div
          v-if="mobileSidebarOpen"
          class="fixed inset-0 z-50 md:hidden"
        >
          <div class="absolute inset-0 bg-black/50" @click="mobileSidebarOpen = false" />
          <div class="absolute inset-y-0 left-0 flex shadow-2xl">
            <AppSidebar />
          </div>
        </div>
      </Transition>

      <!-- Main content area -->
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader @toggle-sidebar="mobileSidebarOpen = true" />
        <main ref="mainRef" class="flex-1 overflow-y-auto p-4 md:p-6">
          <router-view v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="$route.path" />
            </Transition>
          </router-view>
        </main>
      </div>
    </div>

    <!-- Bottom player bar -->
    <AppPlayer v-model:showFullPlayer="showFullPlayer" />

    <!-- Mobile bottom tab bar（移动端专属，桌面端隐藏） -->
    <TabBar />

    <!-- Full screen player -->
    <Transition name="player-full">
      <PlayerFull
        v-if="showFullPlayer"
        @close="showFullPlayer = false"
      />
    </Transition>

    <!-- Toast notifications -->
    <ToastContainer />
    <!-- 应用更新提示（Windows 自动更新 / macOS 手动下载引导） -->
    <UpdateNotice />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppPlayer from './AppPlayer.vue'
import TabBar from './TabBar.vue'
import PlayerFull from '@/components/player/PlayerFull.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import UpdateNotice from '@/components/common/UpdateNotice.vue'
import { useLyricsSync } from '@/composables/useLyricsSync'
import { useAutoLoadLyrics } from '@/composables/useAutoLoadLyrics'

const showFullPlayer = ref(false)
const mobileSidebarOpen = ref(false)

const route = useRoute()
const mainRef = ref<HTMLElement | null>(null)

// 路由切换后重置主内容区滚动位置，并收起移动端抽屉
watch(() => route.path, () => {
  mainRef.value?.scrollTo({ top: 0 })
  mobileSidebarOpen.value = false
})

// Initialize global lyrics sync for Touch Bar
useLyricsSync()
// 全局自动加载歌词（确保所有页面都能加载歌词，桌面歌词/Touch Bar 才能同步）
useAutoLoadLyrics()
</script>

<style scoped>
@reference "tailwindcss";

.player-full-enter-active,
.player-full-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-full-enter-from,
.player-full-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* 页面切换过渡 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
}

/* 移动端侧边栏抽屉过渡 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(-100%);
}

/* 动画偏好减弱时关闭页面过渡 */
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
