import { ref } from 'vue'
import { getStorage, setStorage } from '../utils/storage'

export interface SearchHistoryItem {
  keyword: string
  timestamp: number
  resultCount?: number
}

const STORAGE_KEY = 'search-history'
const MAX_HISTORY_ITEMS = 30

export function useSearchHistory() {
  const history = ref<SearchHistoryItem[]>([])

  function loadHistory() {
    try {
      history.value = getStorage<SearchHistoryItem[]>(STORAGE_KEY, [])
    } catch (error) {
      console.error('Failed to load search history:', error)
      history.value = []
    }
  }

  function addToHistory(keyword: string, resultCount?: number) {
    if (!keyword || !keyword.trim()) return

    const trimmedKeyword = keyword.trim()

    history.value = history.value.filter(
      item => item.keyword.toLowerCase() !== trimmedKeyword.toLowerCase()
    )

    history.value.unshift({
      keyword: trimmedKeyword,
      timestamp: Date.now(),
      resultCount
    })

    if (history.value.length > MAX_HISTORY_ITEMS) {
      history.value = history.value.slice(0, MAX_HISTORY_ITEMS)
    }

    try {
      setStorage(STORAGE_KEY, history.value)
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }

  function removeFromHistory(keyword: string) {
    history.value = history.value.filter(item => item.keyword !== keyword)
    try {
      setStorage(STORAGE_KEY, history.value)
    } catch (error) {
      console.error('Failed to remove from search history:', error)
    }
  }

  function clearHistory() {
    history.value = []
    try {
      setStorage(STORAGE_KEY, [])
    } catch (error) {
      console.error('Failed to clear search history:', error)
    }
  }

  loadHistory()

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory
  }
}
