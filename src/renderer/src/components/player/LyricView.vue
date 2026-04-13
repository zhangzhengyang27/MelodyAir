<template>
  <div
    class="lyric-container flex-1 overflow-y-auto px-6"
    ref="containerRef"
  >
    <!-- 上方留白，让首行歌词能居中 -->
    <div class="h-[35vh] shrink-0" />
    <div text-center>
      <p
        v-for="(line, i) in lyrics"
        :key="i"
        :ref="(el) => { if (el) lineRefs[i] = el as HTMLElement }"
        class="lyric-line cursor-pointer py-1.5 text-base transition-all duration-500 ease-out"
        :class="[
          i === currentIndex
            ? 'scale-105 font-bold text-lg text-white'
            : 'text-neutral-500 hover:text-neutral-300'
        ]"
        @click="seekToLyric(line.time)"
      >
        {{ line.text }}
      </p>
    </div>
    <!-- 下方留白，让末行歌词能居中 -->
    <div class="h-[35vh] shrink-0" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { LyricLine } from '@/utils/lyric'

const props = defineProps<{
  lyrics: LyricLine[]
  currentIndex: number
}>()

const emit = defineEmits<{
  seek: [time: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const lineRefs: Record<number, HTMLElement> = {}

/** 用户是否正在手动滚动 */
let isUserScrolling = false
let userScrollTimer: ReturnType<typeof setTimeout> | null = null

function seekToLyric(time: number) {
  emit('seek', time)
}

/** 用户主动滚动时暂停自动跟随 */
function onUserScroll() {
  isUserScrolling = true
  if (userScrollTimer) clearTimeout(userScrollTimer)
  userScrollTimer = setTimeout(() => { isUserScrolling = false }, 4000)
}

async function scrollToLine(idx: number) {
  const el = lineRefs[idx]
  const container = containerRef.value
  if (!el || !container || !props.lyrics.length) return
  await nextTick()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(() => props.currentIndex, async (newIdx, oldIdx) => {
  if (!props.lyrics.length || newIdx === oldIdx || newIdx < 0) return
  if (isUserScrolling) return
  await scrollToLine(newIdx)
})

// 切歌时立即定位
watch(
  () => props.lyrics,
  async () => {
    if (props.currentIndex >= 0 && props.lyrics.length > 0) {
      await nextTick()
      await scrollToLine(props.currentIndex)
    }
  },
  { deep: false }
)

// 绑定用户滚动事件（模板中的 @scroll 可能不触发）
import { onMounted, onUnmounted } from 'vue'
onMounted(() => {
  containerRef.value?.addEventListener('wheel', onUserScroll, { passive: true })
  containerRef.value?.addEventListener('touchstart', onUserScroll, { passive: true })
})
onUnmounted(() => {
  containerRef.value?.removeEventListener('wheel', onUserScroll)
  containerRef.value?.removeEventListener('touchstart', onUserScroll)
})
</script>

<style scoped>
.lyric-container {
  /* 隐藏原生滚动条，保留滚动功能 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.lyric-container::-webkit-scrollbar {
  display: none;
}

/* 渐隐遮罩效果 */
.lyric-container {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 12%,
    black 88%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 12%,
    black 88%,
    transparent 100%
  );
}

.lyric-line {
  line-height: 1.9;
}
</style>
