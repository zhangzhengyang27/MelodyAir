<template>
  <div class="group relative overflow-hidden rounded-lg" :class="sizeClass">
    <img
      v-if="src"
      :src="src + '?param=' + imgSize + 'y' + imgSize"
      :alt="alt"
      class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
    <div v-else class="flex h-full w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700">
      <span class="text-2xl text-neutral-400">🎵</span>
    </div>
    <!-- Play overlay -->
    <div
      v-if="playable"
      class="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20"
      @click="$emit('play')"
    >
      <div class="flex h-10 w-10 scale-0 items-center justify-center rounded-full bg-[#FF5A5F] text-white shadow-lg transition-transform group-hover:scale-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  playable?: boolean
}>(), {
  alt: '',
  size: 'md',
  playable: false
})

defineEmits<{
  play: []
}>()

const sizeClass = computed(() => {
  const map = { sm: 'h-28 w-28', md: 'h-40 w-40', lg: 'h-56 w-56' }
  return map[props.size]
})

const imgSize = computed(() => {
  const map = { sm: 200, md: 300, lg: 400 }
  return map[props.size]
})
</script>
