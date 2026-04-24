<template>
  <div class="lyrics-display" :class="mode">
    <div v-if="loading" class="state">歌词加载中…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="!lyrics.length" class="state">暂无歌词</div>

    <div v-else-if="mode === 'compact'" class="compact-wrap">
      <LyricsLine
        v-if="currentLine"
        :line="currentLine"
        :active="true"
        :show-translation="showTranslation"
        :show-romanized="showRomanized"
        :font-size="fontSize"
        @click="emit('line-click', currentIndex)"
      />
    </div>

    <div v-else-if="mode === 'normal'" class="normal-wrap">
      <LyricsLine
        v-if="prevLine"
        :line="prevLine"
        :prev="true"
        :show-translation="showTranslation"
        :show-romanized="showRomanized"
        :font-size="fontSize"
        @click="emit('line-click', currentIndex - 1)"
      />
      <LyricsLine
        v-if="currentLine"
        :line="currentLine"
        :active="true"
        :show-translation="showTranslation"
        :show-romanized="showRomanized"
        :font-size="fontSize"
        @click="emit('line-click', currentIndex)"
      />
      <LyricsLine
        v-if="nextLine"
        :line="nextLine"
        :next="true"
        :show-translation="showTranslation"
        :show-romanized="showRomanized"
        :font-size="fontSize"
        @click="emit('line-click', currentIndex + 1)"
      />
    </div>

    <div v-else ref="scrollRef" class="expanded-wrap">
      <div class="expanded-spacer-top" />
      <LyricsLine
        v-for="(line, idx) in lyrics"
        :key="`${line.time}-${idx}`"
        :line="line"
        :active="idx === currentIndex"
        :prev="idx < currentIndex"
        :next="idx > currentIndex"
        :show-translation="showTranslation"
        :show-romanized="showRomanized"
        :font-size="fontSize"
        :clickable="true"
        @click="emit('line-click', idx)"
      />
      <div class="expanded-spacer-bottom" />
      <div class="expanded-mask-top" />
      <div class="expanded-mask-bottom" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, nextTick, ref } from 'vue'
import type { ParsedLyricLine, LyricsDisplayMode } from '@/types/lyrics'
import LyricsLine from './LyricsLine.vue'

const props = defineProps<{
  lyrics: ParsedLyricLine[]
  currentIndex: number
  currentLine: ParsedLyricLine | null
  prevLine: ParsedLyricLine | null
  nextLine: ParsedLyricLine | null
  mode: LyricsDisplayMode
  fontSize: number
  showTranslation: boolean
  showRomanized: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{ (e: 'line-click', index: number): void }>()

const scrollRef = ref<HTMLElement | null>(null)

watch(
  () => props.currentIndex,
  async () => {
    if (props.mode !== 'expanded') return
    await nextTick()
    const container = scrollRef.value
    if (!container) return
    const active = container.querySelector<HTMLElement>('.lyrics-line.active')
    if (!active) return

    const containerRect = container.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()

    // 计算目标滚动位置，使当前歌词在容器中间
    const target = container.scrollTop + (activeRect.top - containerRect.top) - container.clientHeight / 2 + activeRect.height / 2

    container.scrollTo({
      top: Math.max(0, target),
      behavior: 'smooth',
    })
  },
)
</script>

<style scoped>
.lyrics-display {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  overflow: hidden;
}

.state {
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
}

.state.error {
  color: rgba(255, 144, 144, 0.7);
}

.compact-wrap,
.normal-wrap,
.expanded-wrap {
  width: 100%;
  height: 100%;
}

.compact-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.normal-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.expanded-wrap {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.expanded-wrap::-webkit-scrollbar {
  display: none;
}

/* 顶部和底部占位，让歌词可以滚动到中间 */
.expanded-spacer-top,
.expanded-spacer-bottom {
  flex-shrink: 0;
  height: 40vh;
}

/* 顶部和底部渐变遮罩 */
.expanded-mask-top,
.expanded-mask-bottom {
  position: sticky;
  left: 0;
  right: 0;
  height: 120px;
  pointer-events: none;
  z-index: 2;
}

.expanded-mask-top {
  top: 0;
  margin-bottom: -120px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 30%, transparent 100%);
}

.expanded-mask-bottom {
  bottom: 0;
  margin-top: -120px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 30%, transparent 100%);
}
</style>
