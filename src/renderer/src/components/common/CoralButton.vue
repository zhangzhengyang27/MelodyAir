<template>
  <button
    class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D] disabled:opacity-50 disabled:cursor-not-allowed"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
defineEmits<{ click: [] }>()
</script>
