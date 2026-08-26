<template>
  <div :class="gridClass">
    <div
      v-for="i in count"
      :key="i"
      class="animate-fade-in-up text-center"
      :style="{ '--stagger-delay': `${(i - 1) * 40}ms` }"
    >
      <Skeleton class="mx-auto mb-2 h-24 w-24 rounded-full" />
      <Skeleton class="mx-auto mb-1 h-3.5 w-16 rounded-md" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from './Skeleton.vue'

withDefaults(defineProps<{
  /** 占位数量 */
  count?: number
  /** 网格布局 class，默认与歌手页一致 */
  gridClass?: string
}>(), {
  count: 16,
  gridClass: 'grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
})
</script>
