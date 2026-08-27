<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { VolumeX, Volume1, Volume2 } from 'lucide-vue-next'

interface Props {
  /** 当前音量 0-1 */
  volume: number
  /** 是否静音 */
  muted: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:volume', volume: number): void
  (e: 'update:muted', muted: boolean): void
}>()

// DOM 引用
const volumeSlider = ref<HTMLElement>()
const volumePopup = ref<HTMLElement>()

// 显示状态
const showPopup = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 切换静音
 */
function toggleMute(): void {
  emit('update:muted', !props.muted)
}

/**
 * 根据鼠标位置计算音量
 */
function calculateVolume(event: MouseEvent | TouchEvent): number {
  if (!volumeSlider.value) return props.volume
  const rect = volumeSlider.value.getBoundingClientRect()
  const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX
  const x = clientX - rect.left
  return Math.max(0, Math.min(1, x / rect.width))
}

/**
 * 开始拖动音量滑块
 */
function startDrag(event: MouseEvent | TouchEvent): void {
  event.preventDefault()
  event.stopPropagation()

  const newVolume = calculateVolume(event)
  emit('update:volume', newVolume)

  // 如果在静音状态下调整音量，自动取消静音
  if (props.muted && newVolume > 0) {
    emit('update:muted', false)
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

function onDrag(event: Event): void {
  const e = event as MouseEvent | TouchEvent
  const newVolume = calculateVolume(e)
  emit('update:volume', newVolume)

  if (props.muted && newVolume > 0) {
    emit('update:muted', false)
  }
}

function stopDrag(_event?: MouseEvent | TouchEvent): void {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

/**
 * 显示/隐藏弹出层
 */
function handleMouseEnter(): void {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  showPopup.value = true
}

function handleMouseLeave(): void {
  hideTimer = setTimeout(() => {
    showPopup.value = false
  }, 500) // 延迟隐藏，避免误触
}

// 音量图标计算
const volumeIcon = computed(() => {
  if (props.muted || props.volume === 0) return VolumeX
  if (props.volume < 0.5) return Volume1
  return Volume2
})

onUnmounted(() => {
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
})
</script>

<template>
  <div class="volume-control" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <!-- 音量图标按钮 -->
    <button class="volume-button" @click.stop="toggleMute" :title="muted ? '取消静音' : '静音'">
      <component :is="volumeIcon" class="h-5 w-5" />
    </button>

    <!-- 音量滑块弹出层 -->
    <Transition name="popup-fade">
      <div v-if="showPopup" ref="volumePopup" class="volume-popup">
        <!-- 当前音量显示 -->
        <div class="volume-value">{{ Math.round(muted ? 0 : volume * 100) }}%</div>

        <!-- 滑块容器 -->
        <div
          ref="volumeSlider"
          class="volume-slider"
          @mousedown="startDrag"
          @touchstart="startDrag"
        >
          <!-- 轨道背景 -->
          <div class="slider-track" />

          <!-- 已填充部分 -->
          <div
            class="slider-fill"
            :style="{ width: `${(muted ? 0 : volume) * 100}%` }"
          />

          <!-- 滑块手柄 -->
          <div
            class="slider-thumb"
            :style="{ left: `${(muted ? 0 : volume) * 100}%` }"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.volume-control {
  position: relative;
  display: flex;
  align-items: center;
}

.volume-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-neutral-500, #767676);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.dark .volume-button {
  color: rgba(255, 255, 255, 0.8);
}

.volume-button:hover {
  background: var(--color-neutral-100, #F7F7F7);
  transform: scale(1.05);
}

.dark .volume-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 弹出层 */
.volume-popup {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  padding: 16px 20px;
  background: white;
  backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.10),
    0 0 0 1px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-neutral-200, #EBEBEB);
  min-width: 160px;
  z-index: 100;
}

.dark .volume-popup {
  background: rgba(30, 30, 46, 0.95);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.08);
  border-color: transparent;
}

/* 音量数值 */
.volume-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1a1a2e);
  text-align: center;
  margin-bottom: 12px;
  font-variant-numeric: tabular-nums;
}

.dark .volume-value {
  color: #fff;
}

/* 滑块 */
.volume-slider {
  position: relative;
  width: 120px;
  height: 4px;
  cursor: pointer;
}

.slider-track {
  position: absolute;
  inset: 0;
  background: var(--color-neutral-200, #EBEBEB);
  border-radius: 2px;
}

.dark .slider-track {
  background: rgba(255, 255, 255, 0.2);
}

.slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #FF5A5F, #FF7F66);
  border-radius: 2px;
  transition: width 0.05s linear;
  pointer-events: none;
}

.volume-slider:active .slider-fill {
  transition: none;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: left 0.05s linear, transform 0.1s ease;
  pointer-events: none;
}

.volume-slider:active .slider-thumb {
  transform: translate(-50%, -50%) scale(1.2);
}

/* 过渡动画 */
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
