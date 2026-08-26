<template>
  <div :class="gridClass">
    <div
      v-for="i in count"
      :key="i"
      class="animate-fade-in-up"
      :style="{ '--stagger-delay': `${(i - 1) * 45}ms` }"
    >
      <Skeleton class="mb-2 aspect-square w-full rounded-xl" />
      <Skeleton class="mb-1.5 h-3.5 w-4/5 rounded-md" />
      <Skeleton class="h-3 w-2/5 rounded-md" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from './Skeleton.vue'

withDefaults(defineProps<{
  /** 占位卡片数量 */
  count?: number
  /** 网格布局 class，默认与歌单/专辑卡片网格一致 */
  gridClass?: string
}>(), {
  count: 12,
  gridClass: 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
})
</script>
