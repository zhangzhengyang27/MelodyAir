<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Song } from '../../stores/player'
import ContextMenu from './ContextMenu.vue'
import { Play, Pause, SkipForward, Plus, Link2 } from 'lucide-vue-next'

interface Props {
  song: Song
  index: number
  isPlaying?: boolean
  isActive?: boolean
  showAlbum?: boolean
  showArtist?: boolean
  showDuration?: boolean
  showIndex?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  isActive: false,
  showAlbum: true,
  showArtist: true,
  showDuration: true,
  showIndex: true
})

const emit = defineEmits<{
  (e: 'play', song: Song): void
  (e: 'addToNext', song: Song): void
  (e: 'doubleClick', song: Song): void
}>()

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0
})

// 悬停状态
const isHovered = ref(false)

/**
 * 处理右键点击
 */
function handleContextMenu(event: MouseEvent): void {
  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY
  }
}

/**
 * 处理双击播放
 */
function handleDoubleClick(): void {
  emit('doubleClick', props.song)
  emit('play', props.song)
}

/**
 * 格式化时长显示
 */
function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/**
 * 构建右键菜单项
 */
const menuItems = computed(() => [
  { label: '立即播放', icon: Play, action: () => emit('play', props.song) },
  { label: '添加到下一首播放', icon: SkipForward, action: () => emit('addToNext', props.song) },
  { divider: true, action: () => {} },
  { label: '收藏到歌单', icon: Plus, action: () => {}, disabled: true },
  { label: '复制链接', icon: Link2, action: () => {}, disabled: true }
])
</script>

<template>
  <div
    class="track-item"
    :class="{
      active: isActive,
      playing: isPlaying && isActive,
      hovered: isHovered
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- 序号/播放按钮 -->
    <div class="track-index">
      <span v-if="!isHovered || !isActive" class="index-number">
        {{ showIndex ? index + 1 : '' }}
      </span>
      <button
        v-else
        class="play-button"
        :class="{ active: isPlaying && isActive }"
        @click.stop="handleDoubleClick"
      >
        <Pause v-if="isPlaying && isActive" class="h-3.5 w-3.5" />
        <Play v-else class="h-3.5 w-3.5 translate-x-0.5" />
      </button>
    </div>

    <!-- 歌曲信息 -->
    <div class="track-info">
      <div class="track-name" :title="song.name">{{ song.name }}</div>
      <div v-if="showArtist" class="track-artist" :title="song.artists.map(a => a.name).join(', ')">
        {{ song.artists.map(a => a.name).join(', ') }}
      </div>
    </div>

    <!-- 专辑名称 -->
    <div v-if="showAlbum" class="track-album" :title="song.album.name">
      {{ song.album.name }}
    </div>

    <!-- 时长 -->
    <div v-if="showDuration" class="track-duration">
      {{ formatDuration(song.duration) }}
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :song="song"
      :items="menuItems"
      @close="contextMenu.visible = false"
      @play="(s: Song) => emit('play', s)"
      @add-to-next="(s: Song) => emit('addToNext', s)"
    />
  </div>
</template>

<style scoped>
.track-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.track-item:hover {
  background: var(--color-neutral-100, #F7F7F7);
}

.dark .track-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.track-item.active {
  background: rgba(255, 90, 95, 0.08);
}

.dark .track-item.active {
  background: rgba(255, 90, 95, 0.12);
}

.track-item.playing .track-name {
  color: #FF5A5F;
  font-weight: 500;
}

/* 序号列 */
.track-index {
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.index-number {
  font-size: 13px;
  color: var(--color-neutral-400, #C4C4C4);
}

.dark .index-number {
  color: rgba(255, 255, 255, 0.35);
}

.play-button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.play-button:hover {
  transform: scale(1.1);
  background: #2563eb;
}

.play-button.active {
  background: #ef4444;
}

/* 歌曲信息区 */
.track-info {
  flex: 1;
  min-width: 0;
}

.track-name {
  font-size: 14px;
  color: var(--text-primary, #1a1a2e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .track-name {
  color: #F0F0F5;
}

.track-artist {
  font-size: 12px;
  color: var(--color-neutral-500, #767676);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .track-artist {
  color: rgba(255, 255, 255, 0.40);
}

/* 专辑列 */
.track-album {
  width: 200px;
  font-size: 13px;
  color: var(--color-secondary, #666666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: none; /* 小屏隐藏 */

  @media (min-width: 1024px) {
    display: block;
  }
}

.dark .track-album {
  color: rgba(255, 255, 255, 0.55);
}

/* 时长列 */
.track-duration {
  width: 50px;
  font-size: 13px;
  color: var(--color-neutral-400, #C4C4C4);
  text-align: right;
  flex-shrink: 0;
}

.dark .track-duration {
  color: rgba(255, 255, 255, 0.35);
}
</style>
