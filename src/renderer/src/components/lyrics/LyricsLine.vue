<template>
  <button
    class="lyrics-line"
    :class="{ active, prev, next, clickable }"
    type="button"
    :disabled="!clickable"
    :style="{ fontSize: `${fontSize}px` }"
    @click="$emit('click')"
  >
    <span class="primary">{{ line.text }}</span>
    <span v-if="line.translation && showTranslation" class="secondary">{{ line.translation }}</span>
    <span v-if="line.romanized && showRomanized" class="tertiary">{{ line.romanized }}</span>
  </button>
</template>

<script setup lang="ts">
import type { ParsedLyricLine } from '@/types/lyrics'

interface Props {
  line: ParsedLyricLine
  active?: boolean
  prev?: boolean
  next?: boolean
  showTranslation?: boolean
  showRomanized?: boolean
  fontSize?: number
  clickable?: boolean
}

withDefaults(defineProps<Props>(), {
  active: false,
  prev: false,
  next: false,
  showTranslation: false,
  showRomanized: false,
  fontSize: 16,
  clickable: true,
})

defineEmits<{ click: [] }>()
</script>

<style scoped>
.lyrics-line {
  width: 100%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  padding: 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0;
}

.lyrics-line:hover {
  color: rgba(255, 255, 255, 0.65);
}

/* 当前歌词 - 网易云风格：大字号、高亮 */
.lyrics-line.active {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  transform: scale(1.05);
}

.lyrics-line.active .primary {
  font-size: 1.15em;
  font-weight: 600;
}

/* 上一句歌词 */
.lyrics-line.prev {
  color: rgba(255, 255, 255, 0.25);
}

/* 下一句歌词 */
.lyrics-line.next {
  color: rgba(255, 255, 255, 0.25);
}

.primary {
  line-height: 1.6;
  font-size: 1em;
  width: 100%;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.secondary {
  line-height: 1.5;
  font-size: 0.88em;
  color: rgba(255, 255, 255, 0.4);
  width: 100%;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.lyrics-line.active .secondary {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.92em;
}

.tertiary {
  line-height: 1.4;
  font-size: 0.82em;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  width: 100%;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.lyrics-line.active .tertiary {
  color: rgba(255, 255, 255, 0.5);
}
</style>
