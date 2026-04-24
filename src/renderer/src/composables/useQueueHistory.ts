import { ref } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'
import type { Song } from '@/stores/player'

const STORAGE_KEY = 'queue-history'
const MAX_HISTORY = 10

export interface QueueSnapshot {
  id: string
  timestamp: number
  playlist: Song[]
  currentIndex: number
  name?: string
}

export function useQueueHistory() {
  const history = ref<QueueSnapshot[]>(getStorage(STORAGE_KEY, []))

  function saveSnapshot(playlist: Song[], currentIndex: number, name?: string): void {
    if (playlist.length === 0) return

    const snapshot: QueueSnapshot = {
      id: `queue-${Date.now()}`,
      timestamp: Date.now(),
      playlist: [...playlist],
      currentIndex,
      name: name || `队列 ${new Date().toLocaleString()}`
    }

    history.value.unshift(snapshot)

    // 限制历史记录数量
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY)
    }

    persist()
  }

  function restoreSnapshot(snapshotId: string): QueueSnapshot | null {
    const snapshot = history.value.find(s => s.id === snapshotId)
    return snapshot ? { ...snapshot, playlist: [...snapshot.playlist] } : null
  }

  function removeSnapshot(snapshotId: string): void {
    history.value = history.value.filter(s => s.id !== snapshotId)
    persist()
  }

  function clearHistory(): void {
    history.value = []
    persist()
  }

  function persist(): void {
    setStorage(STORAGE_KEY, history.value)
  }

  return {
    history,
    saveSnapshot,
    restoreSnapshot,
    removeSnapshot,
    clearHistory
  }
}
