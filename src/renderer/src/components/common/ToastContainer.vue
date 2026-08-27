<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md max-w-sm"
          :class="toastClasses(toast.type)"
        >
          <AlertTriangle v-if="toast.type === 'error'" class="h-4 w-4 flex-shrink-0" />
          <CheckCircle v-else-if="toast.type === 'success'" class="h-4 w-4 flex-shrink-0" />
          <Info v-else class="h-4 w-4 flex-shrink-0" />
          <span class="text-sm font-medium">{{ toast.message }}</span>
          <button @click="remove(toast.id)" class="ml-2 text-xs opacity-60 hover:opacity-100 transition-opacity">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-vue-next'

const { toasts, remove } = useToast()

function toastClasses(type: string) {
  const base = 'bg-white/90 dark:bg-[#1F1F2E]/90 text-neutral-800 dark:text-[#F0F0F5]'
  switch (type) {
    case 'error':   return `${base} border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400`
    case 'warning': return `${base} border-yellow-300 dark:border-yellow-500/40`
    case 'success': return `${base} border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400`
    default:       return `${base} border-neutral-200 dark:border-white/10`
  }
}
</script>

<style scoped>
.toast-enter-active { transition: all 0.25s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(30px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
