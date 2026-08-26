<template>
  <div class="space-y-0.5">
    <!-- Header -->
    <div class="flex items-center gap-4 rounded-lg px-3 py-2">
      <Skeleton class="h-3 w-8 rounded" />
      <Skeleton class="h-10 w-10 rounded-lg" />
      <Skeleton class="h-3 flex-1 max-w-48 rounded" />
      <Skeleton class="hidden h-3 w-40 rounded lg:block" />
      <Skeleton class="h-3 w-12 rounded" />
    </div>

    <!-- Rows -->
    <div
      v-for="i in rows"
      :key="i"
      class="flex items-center gap-4 rounded-lg px-3 py-2"
    >
      <Skeleton class="h-3 w-8 rounded" />
      <Skeleton class="h-10 w-10 rounded-lg" />
      <div class="min-w-0 flex-1 space-y-1.5">
        <Skeleton class="h-3.5 w-2/5 rounded" />
        <Skeleton class="h-2.5 w-1/4 rounded" />
      </div>
      <Skeleton class="hidden h-3 w-40 rounded lg:block" />
      <Skeleton class="h-3 w-12 rounded" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from './Skeleton.vue'

withDefaults(defineProps<{
  /** 占位行数 */
  rows?: number
}>(), {
  rows: 6
})
</script>
