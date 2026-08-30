<template>
  <label class="toggle-switch">
    <input
      type="checkbox"
      :checked="modelValue"
      class="sr-only"
      @change="onChange"
    />
    <div class="toggle-track"><div class="toggle-thumb" /></div>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<style scoped>
@reference "tailwindcss";

.toggle-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-track {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.15);
  transition: background 0.2s ease;
  position: relative;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.toggle-switch:has(input:checked) .toggle-track {
  background: #FF5A5F;
}

.toggle-switch:has(input:checked) .toggle-thumb {
  transform: translateX(18px);
}

.dark .toggle-track {
  background: rgba(255, 255, 255, 0.2);
}
</style>
