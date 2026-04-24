<template>
  <div class="lyrics-actions">
    <button type="button" class="action-btn primary" @click="$emit('copy-current')" title="复制当前歌词">
      {{ copied ? '已复制' : '复制' }}
    </button>
    <button type="button" class="action-btn" @click="$emit('toggle-mode')" title="切换显示模式">模式</button>
    <button type="button" class="action-btn" @click="$emit('toggle-follow')" :title="autoFollow ? '关闭自动跟随' : '开启自动跟随'">{{ autoFollow ? '跟随' : '手动' }}</button>
    <button type="button" class="action-btn" @click="$emit('toggle-topmost')" :title="isTopMost ? '取消置顶' : '置顶'">置顶</button>
    <button type="button" class="action-btn" @click="$emit('reset-offset')" title="重置歌词偏移">重置偏移</button>
    <button type="button" class="action-btn" @click="$emit('increase-font')" title="放大字号">A+</button>
    <button type="button" class="action-btn" @click="$emit('decrease-font')" title="缩小字号">A-</button>
    <button type="button" class="action-btn" @click="$emit('sync-minus')" title="歌词提前 100ms">-100</button>
    <button type="button" class="action-btn" @click="$emit('sync-plus')" title="歌词延后 100ms">+100</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ isTopMost: boolean; autoFollow: boolean; copied?: boolean }>()

defineEmits<{
  (e: 'copy-current'): void
  (e: 'toggle-mode'): void
  (e: 'toggle-topmost'): void
  (e: 'toggle-follow'): void
  (e: 'reset-offset'): void
  (e: 'increase-font'): void
  (e: 'decrease-font'): void
  (e: 'sync-minus'): void
  (e: 'sync-plus'): void
}>()
</script>

<style scoped>
.lyrics-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-btn {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.action-btn:active {
  transform: translateY(0);
}

.action-btn.primary {
  color: #fff;
  background: rgba(255, 90, 95, 0.2);
  border-color: rgba(255, 90, 95, 0.35);
}

.action-btn.primary:hover {
  background: rgba(255, 90, 95, 0.3);
  border-color: rgba(255, 90, 95, 0.5);
}
</style>
