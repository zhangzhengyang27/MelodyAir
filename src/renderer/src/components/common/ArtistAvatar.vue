<template>
  <div
    class="relative overflow-hidden rounded-full bg-neutral-200 dark:bg-[#1F1F2E]"
    :class="sizeClass"
  >
    <!-- 骨架屏：仅当图片未加载且未命中缓存时显示 -->
    <div v-if="!imgLoaded" class="skeleton absolute inset-0" />

    <!-- 图片 -->
    <img
      v-if="src && !imgError"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover transition-opacity duration-300"
      :class="imgLoaded ? 'opacity-100' : 'opacity-0'"
      loading="lazy"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 加载失败 / 无图：占位图标 -->
    <div
      v-else
      class="flex h-full w-full items-center justify-center bg-neutral-200 dark:bg-[#1F1F2E]"
    >
      <User class="text-neutral-400" :class="iconSizeClass" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { User } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  alt: '',
  size: 'md'
})

/** 模块级图片缓存：记录已成功加载过的图片 URL，避免重复渲染时闪骨架屏 */
const loadedCache = new Set<string>()

const sizeClass = computed(() => {
  const map = { sm: 'h-12 w-12', md: 'h-24 w-24', lg: 'h-32 w-32' }
  return map[props.size]
})

const iconSizeClass = computed(() => {
  const map = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-10 w-10' }
  return map[props.size]
})

// 若已命中缓存，直接视为已加载（不闪骨架屏）
const imgLoaded = ref(false)
const imgError = ref(false)

watch(() => props.src, (newSrc) => {
  imgError.value = false
  if (newSrc && loadedCache.has(newSrc)) {
    imgLoaded.value = true
  } else {
    imgLoaded.value = false
  }
}, { immediate: true })

function handleLoad() {
  imgLoaded.value = true
  if (props.src) loadedCache.add(props.src)
}

function handleError() {
  imgLoaded.value = true
  imgError.value = true
}
</script>
