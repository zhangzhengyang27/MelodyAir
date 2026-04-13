<template>
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-subtitle font-semibold text-neutral-900 dark:text-neutral-100">
      {{ title }}
    </h2>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
