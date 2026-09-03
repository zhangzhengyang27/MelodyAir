<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Song } from '../../stores/player'
import { useQueueHistory } from '@/composables/useQueueHistory'
// 时长统一用 utils/format 的毫秒版 formatDuration：song.duration 是网易云毫秒字段，
// 此处曾本地按“秒”重定义同名函数导致队列时长显示成几千分钟
import { formatDuration } from '@/utils/format'
import { X } from 'lucide-vue-next'

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
  (e: 'reorder', fromIndex: number, toIndex: number): void
  (e: 'removeDuplicates'): void
  (e: 'saveAsPlaylist'): void
  (e: 'restoreQueue', playlist: Song[], currentIndex: number): void
}>()

const queueHistory = useQueueHistory()
const showHistory = ref(false)

// 拖拽状态
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

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

// 检测重复歌曲
const duplicateCount = computed(() => {
  const seen = new Set<number>()
  let count = 0
  props.playlist.forEach(song => {
    if (seen.has(song.id)) {
      count++
    } else {
      seen.add(song.id)
    }
  })
  return count
})

// 拖拽事件处理
function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

function handleDragLeave() {
  dragOverIndex.value = null
}

function handleDrop(event: DragEvent, toIndex: number) {
  event.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== toIndex) {
    emit('reorder', draggedIndex.value, toIndex)
  }
  draggedIndex.value = null
  dragOverIndex.value = null
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

function handleRemoveDuplicates() {
  if (duplicateCount.value > 0) {
    emit('removeDuplicates')
  }
}

function handleSaveQueue() {
  const name = prompt('请输入队列名称', `队列 ${new Date().toLocaleString()}`)
  if (name && name.trim()) {
    queueHistory.saveSnapshot(props.playlist, props.currentIndex, name.trim())
    alert('队列已保存')
  }
}

function handleRestoreQueue(snapshotId: string) {
  const snapshot = queueHistory.restoreSnapshot(snapshotId)
  if (snapshot) {
    emit('restoreQueue', snapshot.playlist, snapshot.currentIndex)
    showHistory.value = false
  }
}

function handleDeleteSnapshot(snapshotId: string) {
  if (confirm('确定要删除这个队列快照吗？')) {
    queueHistory.removeSnapshot(snapshotId)
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}

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
              <X class="h-4 w-4" />
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

            <div class="queue-list">
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
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- 当前播放列表 -->
          <div class="section playlist-section">
            <div class="section-header">
              <span class="section-label">播放列表</span>
              <div class="header-actions">
                <button
                  v-if="queueHistory.history.value.length > 0"
                  class="action-btn"
                  @click="showHistory = !showHistory"
                  title="队列历史"
                >
                  历史 ({{ queueHistory.history.value.length }})
                </button>
                <button
                  v-if="playlist.length > 0"
                  class="action-btn"
                  @click="handleSaveQueue"
                  title="保存当前队列"
                >
                  保存队列
                </button>
                <button
                  v-if="playlist.length > 0"
                  class="action-btn"
                  @click="emit('saveAsPlaylist')"
                  title="保存为歌单"
                >
                  保存为歌单
                </button>
                <button
                  v-if="duplicateCount > 0"
                  class="action-btn"
                  @click="handleRemoveDuplicates"
                  title="移除重复"
                >
                  去重 ({{ duplicateCount }})
                </button>
                <span v-if="currentSong" class="now-playing-badge">正在播放</span>
              </div>
            </div>

            <!-- 队列历史面板 -->
            <div v-if="showHistory" class="history-panel">
              <div class="history-header">
                <h4>队列历史</h4>
                <button class="close-history-btn" @click="showHistory = false"><X class="h-4 w-4" /></button>
              </div>
              <div class="history-list">
                <div
                  v-for="snapshot in queueHistory.history.value"
                  :key="snapshot.id"
                  class="history-item"
                >
                  <div class="history-info" @click="handleRestoreQueue(snapshot.id)">
                    <p class="history-name">{{ snapshot.name }}</p>
                    <p class="history-meta">
                      {{ snapshot.playlist.length }} 首 · {{ formatTimestamp(snapshot.timestamp) }}
                    </p>
                  </div>
                  <button
                    class="delete-history-btn"
                    @click.stop="handleDeleteSnapshot(snapshot.id)"
                    title="删除"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div class="queue-list scrollable">
              <div
                v-for="(song, index) in playlist"
                :key="song.id"
                class="queue-item"
                :class="{
                  active: index === currentIndex,
                  dragging: draggedIndex === index,
                  'drag-over': dragOverIndex === index
                }"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragover="handleDragOver($event, index)"
                @dragleave="handleDragLeave"
                @drop="handleDrop($event, index)"
                @dragend="handleDragEnd"
              >
                <div class="item-info" @click="$emit('play', song, index)">
                  <div class="cover-wrapper">
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
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
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
  margin: 50px 0; /* 仅上下留边距，靠右对齐 */
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

/* 播放列表区域：需要弹性伸缩以支持内部滚动 */
.playlist-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  font-size: 11px;
  padding: 4px 10px;
  border: none;
  background: rgba(255, 90, 95, 0.15);
  color: #ff5a5f;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.15s ease;
  font-weight: 500;
}

.action-btn:hover {
  background: rgba(255, 90, 95, 0.25);
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
  cursor: grab;
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.queue-item.active {
  background: rgba(59, 130, 246, 0.12);
}

/* 拖拽状态 */
.queue-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.queue-item.drag-over {
  background: rgba(255, 90, 95, 0.1);
}

.item-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  cursor: pointer;
}

/* 封面图包装器 */
.cover-wrapper {
  position: relative;
  flex-shrink: 0;
}

.item-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 播放动画指示器 */
.playing-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
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

/* 队列历史面板 */
.history-panel {
  margin: 12px 24px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.history-header h4 {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.close-history-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-history-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.delete-history-btn {
  width: 24px;
  height: 24px;
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
  font-size: 12px;
}

.history-item:hover .delete-history-btn {
  opacity: 1;
}

.delete-history-btn:hover {
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
}
</style>
