<template>
  <div class="skeleton" aria-hidden="true">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 通用骨架屏基础块。尺寸/圆角通过外部传入 class 控制，例如：
// <Skeleton class="h-40 w-40 rounded-xl" />
</script>
