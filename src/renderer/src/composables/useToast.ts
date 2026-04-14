import { ref, reactive } from 'vue'

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration: number
  /** 去重键：相同 dedupeKey 的 toast 只保留最新一条 */
  dedupeKey?: string
}

const toasts = reactive<ToastItem[]>([])
let nextId = 0

interface ShowToastOptions {
  type?: ToastItem['type']
  duration?: number
  /** 去重键：相同 key 的 toast 只保留最新一条，避免叠加闪烁 */
  dedupeKey?: string
}

/**
 * 模块级 toast 方法 — 可在任意位置调用（包括 Pinia Store）
 */
function showToast(message: string, options?: ShowToastOptions) {
  const dedupeKey = options?.dedupeKey

  // ★ 防抖：相同 dedupeKey 的 toast 先移除旧的
  if (dedupeKey) {
    const existing = toasts.findIndex(t => t.dedupeKey === dedupeKey)
    if (existing >= 0) toasts.splice(existing, 1)
  }

  const id = nextId++
  const item: ToastItem = {
    id,
    message,
    type: options?.type || 'info',
    duration: options?.duration ?? 3000,
    dedupeKey,
  }
  toasts.push(item)

  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx >= 0) toasts.splice(idx, 1)
  }, item.duration)
}

/**
 * Vue composable — 在组件中使用
 */
export function useToast() {
  function show(message: string, options?: ShowToastOptions) {
    showToast(message, options)
  }

  function remove(id: number) {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx >= 0) toasts.splice(idx, 1)
  }

  return { toasts, show, remove }
}

// 导出模块级方法供 Store 使用
export { showToast }
