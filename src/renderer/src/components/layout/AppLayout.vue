<template>
  <div class="flex h-screen flex-col bg-neutral-50 text-neutral-900 dark:bg-[#09090B] dark:text-[#F0F0F5]">
    <!-- Title bar (drag region) with window controls -->
    <div class="app-header-drag flex h-9 shrink-0 items-center justify-between px-4">
      <div class="flex items-center gap-1.5">
        <button
          class="traffic-light bg-[#ff5f57] hover:brightness-90"
          @click="handleClose"
          title="关闭"
        />
        <button
          class="traffic-light bg-[#febc2e] hover:brightness-90"
          @click="handleMinimize"
          title="最小化"
        />
        <button
          class="traffic-light bg-[#28c840] hover:brightness-90"
          @click="handleMaximize"
          title="最大化"
        />
      </div>
      <span class="text-xs text-neutral-400 select-none">Melody Air</span>
      <div class="w-14" />
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar />

      <!-- Main content area -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main class="flex-1 overflow-y-auto p-6">
          <router-view />
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
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppPlayer from './AppPlayer.vue'
import PlayerFull from '@/components/player/PlayerFull.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useLyricsSync } from '@/composables/useLyricsSync'
import { useAutoLoadLyrics } from '@/composables/useAutoLoadLyrics'

const showFullPlayer = ref(false)

// Initialize global lyrics sync for Touch Bar
useLyricsSync()
// 全局自动加载歌词（确保所有页面都能加载歌词，桌面歌词/Touch Bar 才能同步）
useAutoLoadLyrics()

function handleClose() {
  window.electronAPI?.windowClose?.()
}

function handleMinimize() {
  window.electronAPI?.windowMinimize?.()
}

function handleMaximize() {
  window.electronAPI?.windowMaximize?.()
}
</script>

<style scoped>
@reference "tailwindcss";
.app-header-drag {
  -webkit-app-region: drag;
}

.app-header-drag button {
  -webkit-app-region: no-drag;
}

.traffic-light {
  @apply h-3 w-3 rounded-full border border-transparent transition-all;
}

.traffic-light:hover {
  @apply border-neutral-400/30;
}

.player-full-enter-active,
.player-full-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-full-enter-from,
.player-full-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
