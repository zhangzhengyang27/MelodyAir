<template>
  <div class="sync-adjuster">
    <button type="button" class="sync-btn" @click="$emit('change', -stepMs)">-{{ stepMs }}ms</button>
    <span class="offset">{{ offsetMs > 0 ? '+' : '' }}{{ offsetMs }}ms</span>
    <button type="button" class="sync-btn" @click="$emit('change', stepMs)">+{{ stepMs }}ms</button>
    <button type="button" class="sync-btn ghost" @click="$emit('reset')">重置</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ offsetMs: number; stepMs?: number }>()
const stepMs = 100

defineEmits<{
  (e: 'change', delta: number): void
  (e: 'reset'): void
}>()
</script>

<style scoped>
.sync-adjuster {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.sync-btn {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.sync-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.sync-btn:active {
  transform: scale(0.95);
}

.sync-btn.ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  border-color: rgba(255, 255, 255, 0.08);
}

.sync-btn.ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
}

.offset {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  min-width: 80px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
