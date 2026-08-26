<template>
  <button
    class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#E0484D] hover:shadow-[0_4px_14px_rgba(255,90,95,0.35)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
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
