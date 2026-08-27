<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAppShortcuts } from '@/composables/useAppShortcuts'

// 启用应用内键盘快捷键（空格播放/暂停、方向键切歌/调音量、M 静音）
useAppShortcuts()
</script>
