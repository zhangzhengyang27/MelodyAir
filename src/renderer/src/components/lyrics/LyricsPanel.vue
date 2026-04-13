<script setup lang="ts">
import {
  ref,
  watch,
  computed,
  nextTick,
  onMounted,
  onUnmounted
} from 'vue'
import type { LyricLine } from '../../utils/lyric'
import { findCurrentLyricIndex, formatTime } from '../../utils/lyric'

interface Props {
  /** 歌词数据 */
  lyrics: LyricLine[]
  /** 当前播放时间(秒) */
  currentTime: number
  /** 是否显示翻译 */
  showTranslation?: boolean
  /** 背景图片URL（用于动态背景） */
  backgroundUrl?: string
  /** 背景类型：blur | gradient | cover | none */
  backgroundType?: 'blur' | 'gradient' | 'cover' | 'none'
  /** 是否自动滚动到当前行 */
  autoScroll?: boolean
  /** 字体大小 */
  fontSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  showTranslation: true,
  backgroundType: 'blur',
  autoScroll: true,
  fontSize: 16
})

const emit = defineEmits<{
  (e: 'seek', time: number): void
}>()

// DOM 引用
const lyricsContainer = ref<HTMLElement>()
const lyricsWrapper = ref<HTMLElement>()

// 当前高亮行索引
const currentLineIndex = computed(() =>
  findCurrentLyricIndex(props.lyrics, props.currentTime)
)

// 是否正在手动拖动
let isDragging = false

/**
 * 自动滚动到当前播放行
 * 使用 CSS Transform 实现平滑滚动（GPU 加速）
 */
watch(currentLineIndex, async (newIndex, oldIndex) => {
  if (!props.autoScroll || isDragging) return

  await nextTick()

  if (lyricsContainer.value && lyricsWrapper.value) {
    const activeElement = lyricsWrapper.value.children[newIndex] as HTMLElement
    if (activeElement) {
      const containerHeight = lyricsContainer.value.clientHeight
      const elementTop = activeElement.offsetTop
      const elementHeight = activeElement.clientHeight

      // 将当前行居中显示（考虑容器高度的一半）
      const scrollTo = elementTop - containerHeight / 2 + elementHeight / 2

      // 使用 CSS transition 实现平滑滚动
      lyricsContainer.value.scrollTo({
        top: Math.max(0, scrollTo),
        behavior: 'smooth'
      })
    }
  }
})

/**
 * 点击歌词跳转到指定位置
 */
function handleLyricClick(line: LyricLine): void {
  if (line.text && line.time > 0) {
    emit('seek', line.time)
  }
}

/**
 * 处理鼠标按下（开始拖动）
 */
function handleMouseDown(): void {
  isDragging = true

  // 鼠标释放后恢复自动滚动
  const handleMouseUp = () => {
    isDragging = false
    document.removeEventListener('mouseup', handleMouseUp)
  }
  document.addEventListener('mouseup', handleMouseUp)
}

// 动态背景样式计算
const backgroundStyle = computed(() => {
  if (props.backgroundType === 'none' || !props.backgroundUrl) {
    return {}
  }

  switch (props.backgroundType) {
    case 'blur':
      return {
        backgroundImage: `url(${props.backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(40px) brightness(0.4)',
        transform: 'scale(1.2)'
      }
    case 'gradient':
      return {
        backgroundImage: `linear-gradient(
          135deg,
          rgba(${extractDominantColor(props.backgroundUrl)}, 0.6) 0%,
          rgba(${extractDominantColor(props.backgroundUrl)}, 0.3) 50%,
          transparent 100%
        )`
      }
    case 'cover':
      return {
        backgroundImage: `url(${props.backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    default:
      return {}
  }
})

/**
 * 从图片 URL 提取主色调（简化版，实际应使用 color-thief 等库）
 * 这里返回一个默认的渐变色
 */
function extractDominantColor(_url: string): string {
  // TODO: 实现真正的颜色提取算法
  return '66, 133, 244' // 默认蓝色调
}

// 清理定时器
let animationFrameId: number | null = null

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <div class="lyrics-panel">
    <!-- 动态背景层 -->
    <div
      v-if="backgroundType !== 'none'"
      class="lyrics-background"
      :style="backgroundStyle"
    />

    <!-- 渐变遮罩 -->
    <div class="lyrics-overlay" />

    <!-- 歌词内容区 -->
    <div
      ref="lyricsContainer"
      class="lyrics-container"
      @mousedown="handleMouseDown"
    >
      <div ref="lyricsWrapper" class="lyrics-wrapper" :style="{ fontSize: `${fontSize}px` }">
        <!-- 开场占位，用于将第一首歌词推至中间 -->
        <div class="lyrics-spacer" />

        <!-- 歌词行列表 -->
        <TransitionGroup name="lyric-fade" tag="div">
          <div
            v-for="(line, index) in lyrics"
            :key="index"
            class="lyric-line"
            :class="{
              active: index === currentLineIndex,
              past: index < currentLineIndex,
              future: index > currentLineIndex
            }"
            @click="handleLyricClick(line)"
          >
            <!-- 原文 -->
            <span class="lyric-text">{{ line.text || '......' }}</span>

            <!-- 翻译文本 -->
            <span v-if="showTranslation && line.translatedText" class="lyric-translation">
              {{ line.translatedText }}
            </span>
          </div>
        </TransitionGroup>

        <!-- 底部占位 -->
        <div class="lyrics-spacer" />
      </div>
    </div>

    <!-- 时间指示器 -->
    <div v-if="currentTime >= 0" class="time-indicator">
      {{ formatTime(currentTime) }}
    </div>
  </div>
</template>

<style scoped>
.lyrics-panel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 动态背景 */
.lyrics-background {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 120%;
  height: 120%;
  z-index: 0;
  pointer-events: none;
  transition: background-image 0.5s ease;
}

/* 渐变遮罩 */
.lyrics-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.7) 0%,
    transparent 20%,
    transparent 80%,
    rgba(0, 0, 0, 0.8) 100%
  );
}

/* 歌词容器 */
.lyrics-container {
  position: relative;
  z-index: 2;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}

.lyrics-container::-webkit-scrollbar {
  width: 4px;
}

.lyrics-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

/* 歌词包裹器 */
.lyrics-wrapper {
  padding: 0 32px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 占位空间 */
.lyrics-spacer {
  height: calc(50vh - 30px);
  min-height: 200px;
}

/* 单行歌词 */
.lyric-line {
  padding: 12px 0;
  text-align: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  user-select: none;
  transform-origin: center center;
}

/* 已播放的行 */
.lyric-line.past {
  opacity: 0.4;
  transform: scale(0.95);
}

/* 当前激活的行 */
.lyric-line.active {
  transform: scale(1.08);
  opacity: 1;
}

.lyric-line.active .lyric-text {
  font-weight: 600;
  background: linear-gradient(135deg, #fff 0%, #a0c4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 未播放的行 */
.lyric-line.future {
  opacity: 0.6;
  transform: scale(0.98);
}

/* 原文文本 */
.lyric-text {
  display: block;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

/* 翻译文本 */
.lyric-translation {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 300;
}

.lyric-line.active .lyric-translation {
  color: rgba(160, 196, 255, 0.7);
}

/* 悬停效果 */
.lyric-line:hover:not(.active) {
  opacity: 0.9;
  transform: scale(1.02);
}

/* 时间指示器 */
.time-indicator {
  position: absolute;
  bottom: 20px;
  right: 24px;
  z-index: 3;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
}

/* 过渡动画 */
.lyric-fade-enter-active,
.lyric-fade-leave-active {
  transition: all 0.5s ease;
}

.lyric-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.lyric-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
