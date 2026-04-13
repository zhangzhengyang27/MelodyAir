<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from '../../stores/player'
import TrackItem from './TrackItem.vue'

interface Props {
  songs: Song[]
  currentSongId?: number | null
  isPlaying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentSongId: null,
  isPlaying: false
})

const emit = defineEmits<{
  (e: 'play', song: Song, index: number): void
  (e: 'addToNext', song: Song): void
}>()

/**
 * 处理播放事件
 */
function handlePlay(song: Song): void {
  const index = props.songs.findIndex(s => s.id === song.id)
  emit('play', song, index)
}

/**
 * 列表头信息
 */
interface Column {
  label: string
  width?: string
}

const columns: Column[] = [
  { label: '#', width: '32px' },
  { label: '标题' },
  { label: '专辑', width: '200px' },
  { label: '时长', width: '50px' }
]
</script>

<template>
  <div class="track-list">
    <!-- 表头 -->
    <div class="track-list-header">
      <div class="header-index">#</div>
      <div class="header-info">标题</div>
      <div class="header-album">专辑</div>
      <div class="header-duration">时长</div>
    </div>

    <!-- 歌曲列表 -->
    <div class="track-list-body">
      <TransitionGroup name="list" tag="div">
        <TrackItem
          v-for="(song, index) in songs"
          :key="song.id"
          :song="song"
          :index="index"
          :is-active="currentSongId === song.id"
          :is-playing="isPlaying && currentSongId === song.id"
          @play="handlePlay"
          @add-to-next="(s) => emit('addToNext', s)"
        />
      </TransitionGroup>

      <!-- 空状态 -->
      <div v-if="songs.length === 0" class="empty-state">
        <div class="empty-icon">🎵</div>
        <p>暂无歌曲</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-list {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}

/* 表头样式 */
.track-list-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-index {
  width: 32px;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-album {
  width: 200px;
  display: none;

  @media (min-width: 1024px) {
    display: block;
  }
}

.header-duration {
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}

/* 列表主体 */
.track-list-body {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.track-list-body::-webkit-scrollbar {
  width: 6px;
}

.track-list-body::-webkit-scrollbar-track {
  background: transparent;
}

.track-list-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}

/* 列表过渡动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
