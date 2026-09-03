<template>
  <div class="relative" ref="triggerRef">
    <button
      class="player-btn whitespace-nowrap text-[11px] font-medium leading-tight"
      :class="{ 'text-[#FF5A5F]': sleepTimerEnabled }"
      :title="sleepTimerEnabled ? `睡眠定时：${sleepTimerLabel}` : '睡眠定时'"
      @click.stop="togglePanel"
    >
      {{ sleepTimerEnabled ? '定时中' : '定时' }}
    </button>

    <Teleport to="body">
      <Transition name="fade-scale">
        <div
          v-if="showPanel"
          class="fixed z-50 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#171722] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
          :style="panelStyle"
        >
          <div class="border-b border-neutral-100 px-3 py-2 dark:border-white/6">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold tracking-wide text-neutral-500">睡眠定时</span>
              <span v-if="sleepTimerEnabled" class="text-[11px] text-[#FF5A5F]">{{ sleepTimerLabel }}</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 px-3 py-3">
            <button class="sleep-timer-btn" @click="startSleepTimer(15)">15 分钟</button>
            <button class="sleep-timer-btn" @click="startSleepTimer(30)">30 分钟</button>
            <button class="sleep-timer-btn" @click="startSleepTimer(60)">60 分钟</button>
          </div>

          <div class="flex items-center gap-2 border-t border-neutral-100 px-3 py-3 dark:border-white/6">
            <input
              v-model.number="customSleepMinutes"
              type="number"
              min="1"
              max="720"
              placeholder="自定义"
              class="h-8 w-24 rounded-lg border border-neutral-200 bg-transparent px-2 text-sm pointer-coarse:text-base outline-none focus:border-[#FF5A5F] dark:border-white/10"
            />
            <button class="sleep-timer-btn flex-1" @click="startCustomSleepTimer">开始</button>
          </div>

          <div class="flex items-center justify-between border-t border-neutral-100 px-3 py-2 dark:border-white/6">
            <span class="text-[11px] text-neutral-500">{{ sleepTimerEnabled ? sleepTimerLabel : '未开启' }}</span>
            <button
              class="text-[11px] text-neutral-400 hover:text-[#FF5A5F] disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!sleepTimerEnabled"
              @click="cancelSleepTimer"
            >
              取消
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()
const showPanel = ref(false)
const customSleepMinutes = ref<number | null>(30)
const triggerRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({ right: '1rem', bottom: '5.75rem' })

const sleepTimerLabel = computed(() => {
  const deadline = playerStore.sleepTimerDeadline
  if (!deadline) return '未开启'
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return minutes > 0 ? `${minutes}分${String(seconds).padStart(2, '0')}秒` : `${seconds}秒`
})

const sleepTimerEnabled = computed(() => playerStore.sleepTimerDeadline !== null)

function updatePanelPosition() {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  panelStyle.value = {
    left: `${Math.max(16, rect.left - 80)}px`,
    bottom: '5.75rem'
  }
}

function togglePanel() {
  showPanel.value = !showPanel.value
  if (showPanel.value) updatePanelPosition()
}

function startSleepTimer(minutes: number) {
  playerStore.setSleepTimer(minutes)
  showPanel.value = false
}

function startCustomSleepTimer() {
  const minutes = Number(customSleepMinutes.value)
  if (!Number.isFinite(minutes) || minutes <= 0) return
  startSleepTimer(minutes)
}

function cancelSleepTimer() {
  playerStore.clearSleepTimer()
  showPanel.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (triggerRef.value && !triggerRef.value.contains(target)) {
    showPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', updatePanelPosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updatePanelPosition)
})
</script>

<style scoped>
.sleep-timer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  padding: 0 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(229 231 235 / 1);
  font-size: 12px;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.sleep-timer-btn:hover {
  border-color: #FF5A5F;
  color: #FF5A5F;
}

.dark .sleep-timer-btn {
  border-color: rgba(255, 255, 255, 0.08);
  color: #E9E9F2;
}

.dark .sleep-timer-btn:hover {
  background-color: rgba(255, 90, 95, 0.08);
}
</style>
