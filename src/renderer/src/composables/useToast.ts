import { ref, reactive } from 'vue'

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration: number
}

const toasts = reactive<ToastItem[]>([])
let nextId = 0

/**
 * 模块级 toast 方法 — 可在任意位置调用（包括 Pinia Store）
 */
function showToast(message: string, options?: { type?: ToastItem['type']; duration?: number }) {
  const id = nextId++
  const item: ToastItem = {
    id,
    message,
    type: options?.type || 'info',
    duration: options?.duration ?? 3000
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
  function show(message: string, options?: { type?: ToastItem['type']; duration?: number }) {
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
