<template>
  <div
    class="lyric-container flex-1 overflow-y-auto"
    ref="containerRef"
  >
    <div class="lyric-spacer" />
    <div class="lyric-lines">
      <p
        v-for="(line, i) in lyrics"
        :key="i"
        :ref="(el) => { if (el) lineRefs[i] = el as HTMLElement }"
        class="lyric-line"
        :class="{ active: i === currentIndex, adjacent: Math.abs(i - currentIndex) === 1 }"
        @click="seekToLyric(line.time)"
      >
        {{ line.text }}
      </p>
    </div>
    <div class="lyric-spacer" />
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

let isUserScrolling = false
let userScrollTimer: ReturnType<typeof setTimeout> | null = null

function seekToLyric(time: number) {
  emit('seek', time)
}

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

import { onMounted, onUnmounted } from 'vue'
onMounted(() => {
  containerRef.value?.addEventListener('wheel', onUserScroll, { passive: true })
  containerRef.value?.addEventListener('touchstart', onUserScroll, { passive: true })
})
onUnmounted(() => {
  containerRef.value?.removeEventListener('wheel', onUserScroll)
  containerRef.value?.removeEventListener('touchstart', onUserScroll)
  if (userScrollTimer) clearTimeout(userScrollTimer)
})
</script>

<style scoped>
@reference "tailwindcss";

/* Container */
.lyric-container {
  padding: 0 2rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.lyric-container::-webkit-scrollbar {
  display: none;
}

/* Gradient mask for fade effect at top/bottom */
.lyric-container {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 1) 15%,
    rgba(0, 0, 0, 1) 85%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}

/* Spacer for vertical centering */
.lyric-spacer {
  height: 38vh;
  flex-shrink: 0;
}

/* Lines wrapper */
.lyric-lines {
  text-align: center;
}

/* Individual lyric line */
.lyric-line {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  line-height: 2;
  color: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 8px;
  user-select: none;
}

.lyric-line:hover {
  color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.03);
}

/* Active (current playing) line */
.lyric-line.active {
  font-size: 1.175rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 24px rgba(255, 90, 95, 0.25), 0 0 48px rgba(255, 90, 95, 0.12);
  transform: scale(1.04);
  letter-spacing: 0.01em;
}

/* Adjacent lines (subtle highlight) */
.lyric-line.adjacent {
  color: rgba(255, 255, 255, 0.4);
}
</style>
