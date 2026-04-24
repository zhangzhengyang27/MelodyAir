<template>
  <div class="empty-state">
    <p>{{ error ? error : '暂无歌词' }}</p>
    <button v-if="error" class="retry" type="button" @click="$emit('retry')">重试</button>
    <button class="retry ghost" type="button" @click="$emit('search')">搜索歌词</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ error?: string | null }>()

defineEmits<{ (e: 'retry'): void; (e: 'search'): void }>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.45);
}
.retry {
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
}
.retry.ghost { background: transparent; opacity: 0.8; }
</style>
