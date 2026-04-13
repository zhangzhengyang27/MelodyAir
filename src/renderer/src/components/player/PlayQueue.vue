<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from '../../stores/player'

interface Props {
  /** 播放列表 */
  playlist: Song[]
  /** 当前播放索引 */
  currentIndex: number
  /** "下一首播放"队列 */
  playNextList: Song[]
  /** 是否显示 */
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'play', song: Song, index: number): void
  (e: 'remove', index: number): void
  (e: 'removeFromNext', index: number): void
  (e: 'clearAll'): void
}>()

/**
 * 格式化时长
 */
function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/**
 * 当前歌曲（从播放列表中获取）
 */
const currentSong = computed(() =>
  props.currentIndex >= 0 && props.currentIndex < props.playlist.length
    ? props.playlist[props.currentIndex]
    : null
)

// 计算总时长
const totalDuration = computed(() =>
  props.playlist.reduce((sum, song) => sum + song.duration, 0)
)
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="visible" class="queue-panel-overlay" @click.self="emit('close')">
        <div class="queue-panel">
          <!-- 面板头部 -->
          <div class="panel-header">
            <h3 class="panel-title">
              播放队列
              <span class="song-count">{{ playlist.length }} 首</span>
            </h3>
            <button class="close-button" @click="emit('close')" title="关闭">
              ✕
            </button>
          </div>

          <!-- "下一首播放"队列 -->
          <div v-if="playNextList.length > 0" class="section next-section">
            <div class="section-header">
              <span class="section-label">下一首播放</span>
              <button
                class="clear-btn"
                @click="$emit('clearAll')"
                title="清空队列"
              >
                清空
              </button>
            </div>

            <TransitionGroup name="list" tag="div" class="queue-list">
              <div
                v-for="(song, index) in playNextList"
                :key="'next-' + song.id"
                class="queue-item"
              >
                <div class="item-info" @click="$emit('play', song, -1)">
                  <img
                    :src="song.album.picUrl"
                    :alt="song.name"
                    class="item-cover"
                  />
                  <div class="item-details">
                    <div class="item-name">{{ song.name }}</div>
                    <div class="item-artist">
                      {{ song.artists.map(a => a.name).join(', ') }}
                    </div>
                  </div>
                  <span class="item-duration">{{ formatDuration(song.duration) }}</span>
                </div>

                <button
                  class="remove-btn"
                  @click.stop="$emit('removeFromNext', index)"
                  title="移除"
                >
                  ✕
                </button>
              </div>
            </TransitionGroup>
          </div>

          <!-- 当前播放列表 -->
          <div class="section playlist-section">
            <div class="section-header">
              <span class="section-label">播放列表</span>
              <span v-if="currentSong" class="now-playing-badge">正在播放</span>
            </div>

            <TransitionGroup name="list" tag="div" class="queue-list scrollable">
              <div
                v-for="(song, index) in playlist"
                :key="song.id"
                class="queue-item"
                :class="{ active: index === currentIndex }"
              >
                <div class="item-info" @click="$emit('play', song, index)">
                  <img
                    :src="song.album.picUrl"
                    :alt="song.name"
                    class="item-cover"
                  />

                  <!-- 播放状态指示器 -->
                  <div v-if="index === currentIndex" class="playing-indicator">
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                  </div>

                  <div class="item-details">
                    <div class="item-name" :class="{ active: index === currentIndex }">
                      {{ song.name }}
                    </div>
                    <div class="item-artist">
                      {{ song.artists.map(a => a.name).join(', ') }}
                    </div>
                  </div>

                  <span class="item-duration">{{ formatDuration(song.duration) }}</span>
                </div>

                <button
                  class="remove-btn"
                  @click.stop="$emit('remove', index)"
                  title="从列表中移除"
                >
                  ✕
                </button>
              </div>
            </TransitionGroup>
          </div>

          <!-- 底部统计 -->
          <div class="panel-footer">
            <span>共 {{ playlist.length }} 首</span>
            <span>{{ formatDuration(totalDuration) }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 遮罩层 */
.queue-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 主面板 */
.queue-panel {
  width: 380px;
  max-width: 90vw;
  height: calc(100vh - 100px);
  margin: auto;
  background: #1a1a2e;
  border-radius: 16px 0 0 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    -8px 0 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.song-count {
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.close-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* 分区 */
.section {
  padding: 16px 24px;
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
}

.now-playing-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  border-radius: 10px;
  font-weight: 500;
}

.clear-btn {
  font-size: 12px;
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  margin-left: auto;
}

.clear-btn:hover {
  background: rgba(255, 99, 71, 0.15);
  color: #ff6347;
}

/* 列表容器 */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.queue-list.scrollable {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;

  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.queue-list.scrollable::-webkit-scrollbar {
  width: 4px;
}

.queue-list.scrollable::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

/* 列表项 */
.queue-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.15s ease;
  gap: 8px;
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.queue-item.active {
  background: rgba(59, 130, 246, 0.12);
}

.item-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  cursor: pointer;
}

.item-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 播放动画指示器 */
.playing-indicator {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  margin-left: -36px; /* 覆盖在封面图上 */
  position: absolute;
}

.playing-indicator .bar {
  width: 3px;
  background: #3b82f6;
  border-radius: 1px;
  animation: soundBar 0.6s ease-in-out infinite alternate;
}

.playing-indicator .bar:nth-child(1) {
  height: 60%;
  animation-delay: 0s;
}

.playing-indicator .bar:nth-child(2) {
  height: 100%;
  animation-delay: 0.15s;
}

.playing-indicator .bar:nth-child(3) {
  height: 40%;
  animation-delay: 0.3s;
}

@keyframes soundBar {
  from { transform: scaleY(0.4); }
  to { transform: scaleY(1); }
}

.item-details {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.item-name.active {
  color: #60a5fa;
  font-weight: 500;
}

.item-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-duration {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
  font-size: 14px;
}

.queue-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
}

/* 底部统计栏 */
.panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 14px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-from .queue-panel,
.slide-up-leave-to .queue-panel {
  transform: translateX(100%);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
