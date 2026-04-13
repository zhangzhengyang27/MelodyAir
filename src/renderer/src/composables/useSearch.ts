import { ref, watch, onMounted, onUnmounted } from 'vue'

export function useSearch(delay = 300) {
  const query = ref('')
  const debouncedQuery = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  function onInput() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debouncedQuery.value = query.value.trim()
    }, delay)
  }

  watch(query, onInput)

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return { query, debouncedQuery }
}
