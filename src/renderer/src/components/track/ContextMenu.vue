<script setup lang="ts">
import { ref, onMounted, onUnmounted, type Component } from 'vue'
import type { Song } from '../../stores/player'

export interface ContextMenuItem {
  label: string
  icon?: string | Component
  action: () => void
  divider?: boolean
  disabled?: boolean
}

interface Props {
  visible: boolean
  x: number
  y: number
  song: Song | null
  items?: ContextMenuItem[]
}

const props = withDefaults(defineProps<Props>(), {
  items: () => []
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'play'): void
  (e: 'addToNext', song: Song): void
  (e: 'addToPlaylist', song: Song): void
  (e: 'like', song: Song): void
  (e: 'copyLink', song: Song): void
}>()

const menuRef = ref<HTMLElement>()

// 关闭菜单
function closeMenu(): void {
  emit('close')
}

// 处理菜单项点击
function handleItemClick(item: ContextMenuItem): void {
  if (!item.disabled) {
    item.action()
    closeMenu()
  }
}

// 点击外部关闭菜单
function handleClickOutside(event: MouseEvent): void {
  if (
    menuRef.value &&
    !menuRef.value.contains(event.target as Node)
  ) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
    >
      <div class="context-menu-header" v-if="song">
        <img
          :src="song.album.picUrl"
          :alt="song.album.name"
          class="album-cover"
        />
        <div class="song-info">
          <div class="song-name">{{ song.name }}</div>
          <div class="song-artist">{{ song.artists.map(a => a.name).join(', ') }}</div>
        </div>
      </div>

      <div class="context-menu-items">
        <template v-for="(item, index) in props.items" :key="index">
          <div
            v-if="item.divider"
            class="menu-divider"
          ></div>
          <button
            v-else
            class="menu-item"
            :class="{ disabled: item.disabled }"
            @click="handleItemClick(item)"
          >
            <span class="menu-icon" v-if="item.icon && typeof item.icon === 'string'">{{ item.icon }}</span>
            <component v-else-if="item.icon" :is="item.icon" class="h-4 w-4 flex-shrink-0" />
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 200px;
  max-width: 300px;
  background: var(--bg-secondary, #1a1a2e);
  border-radius: 8px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  animation: menuFadeIn 0.15s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.album-cover {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-name {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-menu-items {
  padding: 4px;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 8px;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  text-align: left;
}

.menu-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
</style>
