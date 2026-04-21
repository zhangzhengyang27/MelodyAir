import { computed, onUnmounted, ref } from 'vue'

export interface SleepTimerOptions {
  onTimeout: () => void
}

export function useSleepTimer(options: SleepTimerOptions) {
  const enabled = ref(false)
  const durationMinutes = ref(0)
  const endAt = ref<number | null>(null)
  const remainingSeconds = ref(0)
  const timerId = ref<number | null>(null)

  const isExpired = computed(() => enabled.value && remainingSeconds.value <= 0)

  function clearTimer() {
    if (timerId.value !== null) {
      window.clearInterval(timerId.value)
      timerId.value = null
    }
  }

  function finish() {
    clearTimer()
    enabled.value = false
    durationMinutes.value = 0
    endAt.value = null
    remainingSeconds.value = 0
    options.onTimeout()
  }

  function syncRemaining() {
    if (endAt.value === null) {
      remainingSeconds.value = 0
      return
    }

    const nextRemaining = Math.max(0, Math.ceil((endAt.value - Date.now()) / 1000))
    remainingSeconds.value = nextRemaining

    if (nextRemaining <= 0) {
      finish()
    }
  }

  function start(minutes: number) {
    const safeMinutes = Math.max(1, Math.floor(minutes))
    clearTimer()

    durationMinutes.value = safeMinutes
    endAt.value = Date.now() + safeMinutes * 60 * 1000
    enabled.value = true

    syncRemaining()
    timerId.value = window.setInterval(syncRemaining, 1000)
  }

  function cancel() {
    clearTimer()
    enabled.value = false
    durationMinutes.value = 0
    endAt.value = null
    remainingSeconds.value = 0
  }

  function formatRemaining() {
    const total = remainingSeconds.value
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    if (minutes <= 0) return `${seconds}秒`
    return `${minutes}分${String(seconds).padStart(2, '0')}秒`
  }

  onUnmounted(() => {
    clearTimer()
  })

  return {
    enabled,
    durationMinutes,
    endAt,
    remainingSeconds,
    timerId,
    isExpired,
    start,
    cancel,
    formatRemaining,
  }
}
