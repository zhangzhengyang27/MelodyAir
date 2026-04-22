import { ref } from 'vue'

export function useShortcutRecorder() {
  const recording = ref(false)

  function start() {
    recording.value = true
  }

  function stop() {
    recording.value = false
  }

  function normalizeShortcut(event: KeyboardEvent): string | null {
    const parts: string[] = []
    if (event.metaKey) parts.push('Meta')
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')

    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(key)) return null

    parts.push(key)
    return parts.join('+')
  }

  return {
    recording,
    start,
    stop,
    normalizeShortcut,
  }
}
