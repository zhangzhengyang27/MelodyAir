<template>
  <div class="lyric-container h-full overflow-y-auto px-4" ref="containerRef">
    <div class="py-20 text-center">
      <p
        v-for="(line, i) in lyrics"
        :key="i"
        :ref="(el) => { if (el) lineRefs[i] = el as HTMLElement }"
        class="cursor-pointer py-2 text-base transition-all duration-300"
        :class="i === currentIndex ? 'scale-105 font-bold text-[#FF5A5F]' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'"
        @click="seekToLyric(line.time)"
      >
        {{ line.text }}
      </p>
    </div>
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

function seekToLyric(time: number) {
  emit('seek', time)
}

watch(
  () => props.currentIndex,
  async (idx) => {
    if (lineRefs[idx] && containerRef.value) {
      await nextTick()
      lineRefs[idx].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }
)
</script>
