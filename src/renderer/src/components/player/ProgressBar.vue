<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  /** 当前进度 0-1 */
  progress: number
  /** 当前时间(秒) */
  currentTime: number
  /** 总时长(秒) */
  duration: number
  /** 是否可以拖动 */
  draggable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  draggable: true
})

const emit = defineEmits<{
  (e: 'seek', time: number): void
  (e: 'dragStart'): void
  (e: 'dragEnd', time: number): void
}>()

// DOM 引用
const progressBar = ref<HTMLElement>()
const progressThumb = ref<HTMLElement>()

// 拖动状态
let isDragging = false

/**
 * 格式化时间显示
 */
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

/**
 * 根据鼠标位置计算进度
 */
function calculateProgress(event: MouseEvent | TouchEvent): number {
  if (!progressBar.value) return 0
  const rect = progressBar.value.getBoundingClientRect()
  const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
  return x / rect.width
}

/**
 * 处理点击跳转
 */
function handleClick(event: MouseEvent): void {
  if (!props.draggable) return
  const newProgress = calculateProgress(event)
  emit('seek', newProgress * props.duration)
}

/**
 * 开始拖动
 */
function startDrag(event: MouseEvent | TouchEvent): void {
  if (!props.draggable) return
  isDragging = true
  emit('dragStart')

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)

  // 阻止默认行为（防止文本选择等）
  event.preventDefault()
}

/**
 * 拖动中
 */
function onDrag(event: Event): void {
  if (!isDragging || !props.draggable) return
  const e = event as MouseEvent | TouchEvent
  const newProgress = calculateProgress(e)
  // 实时更新进度显示（不触发 seek，直到拖动结束）
  updateVisualProgress(newProgress)
}

/**
 * 结束拖动
 */
function stopDrag(event: MouseEvent | TouchEvent): void {
  if (!isDragging) return
  isDragging = false

  const newProgress = calculateProgress(event)

  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)

  emit('seek', newProgress * props.duration)
  emit('dragEnd', newProgress * props.duration)
}

/**
 * 更新视觉进度条位置
 */
function updateVisualProgress(progress: number): void {
  if (progressBar.value) {
    const fillEl = progressBar.value.querySelector('.progress-fill') as HTMLElement
    const thumbEl = progressBar.value.querySelector('.progress-thumb') as HTMLElement
    if (fillEl) fillEl.style.width = `${progress * 100}%`
    if (thumbEl) thumbEl.style.left = `${progress * 100}%`
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <div class="progress-bar-container">
    <!-- 当前时间 -->
    <span class="time-display current-time">{{ formatTime(currentTime) }}</span>

    <!-- 进度条 -->
    <div
      ref="progressBar"
      class="progress-bar"
      @click="handleClick"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <!-- 缓冲进度（可选） -->
      <div class="progress-buffer" />

      <!-- 已播放进度 -->
      <div
        class="progress-fill"
        :style="{ width: `${progress * 100}%` }"
      />

      <!-- 滑块 -->
      <div
        ref="progressThumb"
        class="progress-thumb"
        :style="{ left: `${progress * 100}%` }"
      />

      <!-- 悬停高亮层 -->
      <div class="progress-hover-layer" />
    </div>

    <!-- 总时长 -->
    <span class="time-display total-time">{{ formatTime(duration) }}</span>
  </div>
</template>

<style scoped>
.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 0;
  user-select: none;
}

.time-display {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
  min-width: 45px;
  flex-shrink: 0;
  user-select: none;
}

.current-time {
  text-align: right;
}

.total-time {
  text-align: left;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  cursor: pointer;
  transition: height 0.2s ease;
}

/* 悬停时增高 */
.progress-bar:hover {
  height: 8px;
}

/* 缓冲层（暂未使用，预留） */
.progress-buffer {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  pointer-events: none;
}

/* 已播放进度 */
.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 2px;
  transition: width 0.1s linear;
  pointer-events: none;
}

/* 拖动时禁用过渡动画以提升流畅度 */
.progress-bar:active .progress-fill {
  transition: none;
}

/* 滑块 */
.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
  pointer-events: none;
  z-index: 2;
}

/* 悬停或拖动时显示滑块 */
.progress-bar:hover .progress-thumb,
.progress-bar:active .progress-thumb {
  transform: translate(-50%, -50%) scale(1);
}

/* 悬停高亮效果 */
.progress-hover-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.progress-bar:hover .progress-hover-layer {
  opacity: 1;
}
</style>
