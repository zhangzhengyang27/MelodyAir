<template>
  <div class="flex h-screen flex-col bg-neutral-50 text-neutral-900 dark:bg-[#09090B] dark:text-[#F0F0F5]">
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar />

      <!-- Main content area -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main ref="mainRef" class="flex-1 overflow-y-auto p-6">
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

    <!-- Full screen player -->
    <Transition name="player-full">
      <PlayerFull
        v-if="showFullPlayer"
        @close="showFullPlayer = false"
      />
    </Transition>

    <!-- Toast notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppPlayer from './AppPlayer.vue'
import PlayerFull from '@/components/player/PlayerFull.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useLyricsSync } from '@/composables/useLyricsSync'
import { useAutoLoadLyrics } from '@/composables/useAutoLoadLyrics'

const showFullPlayer = ref(false)

const route = useRoute()
const mainRef = ref<HTMLElement | null>(null)

// 路由切换后重置主内容区滚动位置
watch(() => route.path, () => {
  mainRef.value?.scrollTo({ top: 0 })
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

/* 动画偏好减弱时关闭页面过渡 */
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
