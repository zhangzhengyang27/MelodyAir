<template>
  <div class="space-y-6">
    <!-- 详情头部：封面 + 信息 -->
    <div class="flex gap-6">
      <Skeleton class="h-48 w-48 shrink-0 rounded-2xl" />
      <div class="flex flex-1 flex-col justify-center gap-3">
        <Skeleton class="h-8 w-2/5 rounded-lg" />
        <Skeleton class="h-4 w-1/3 rounded-md" />
        <Skeleton class="h-3 w-1/2 rounded-md" />
        <div class="mt-2 flex gap-3">
          <Skeleton class="h-9 w-28 rounded-xl" />
          <Skeleton class="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>

    <!-- 歌曲列表骨架 -->
    <SkeletonSongTable :rows="rows" />
  </div>
</template>

<script setup lang="ts">
import Skeleton from './Skeleton.vue'
import SkeletonSongTable from './SkeletonSongTable.vue'

withDefaults(defineProps<{
  rows?: number
}>(), {
  rows: 6
})
</script>
