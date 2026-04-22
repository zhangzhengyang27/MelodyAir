import { computed, ref } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

export interface LocalMusicMetadata {
  id: string
  title: string
  artist: string
  album: string
  genre: string
  year: string
  filePath: string
  notes: string
  coverUrl?: string
}

const STORAGE_KEY = 'local-music-metadata'

export function useLocalMusicMetadata() {
  const items = ref<LocalMusicMetadata[]>(getStorage<LocalMusicMetadata[]>(STORAGE_KEY, []))

  const count = computed(() => items.value.length)

  function persist() {
    setStorage(STORAGE_KEY, items.value)
  }

  function upsert(item: LocalMusicMetadata) {
    const index = items.value.findIndex(i => i.id === item.id)
    if (index >= 0) items.value[index] = { ...items.value[index], ...item }
    else items.value.unshift(item)
    persist()
  }

  function remove(id: string) {
    items.value = items.value.filter(item => item.id !== id)
    persist()
  }

  function clear() {
    items.value = []
    persist()
  }

  function batchUpdate(ids: string[], patch: Partial<LocalMusicMetadata>) {
    items.value = items.value.map(item => ids.includes(item.id) ? { ...item, ...patch } : item)
    persist()
  }

  function exportJson() {
    return JSON.stringify(items.value, null, 2)
  }

  function importFromJson(json: string) {
    const parsed = JSON.parse(json) as LocalMusicMetadata[]
    if (!Array.isArray(parsed)) throw new Error('Invalid metadata format')
    items.value = parsed.map(item => ({
      id: String(item.id),
      title: item.title || '',
      artist: item.artist || '',
      album: item.album || '',
      genre: item.genre || '',
      year: item.year || '',
      filePath: item.filePath || '',
      notes: item.notes || '',
      coverUrl: item.coverUrl,
    }))
    persist()
  }

  function updateCover(id: string, coverUrl: string) {
    const target = items.value.find(item => item.id === id)
    if (!target) return
    target.coverUrl = coverUrl
    persist()
  }

  return {
    items,
    count,
    upsert,
    remove,
    clear,
    batchUpdate,
    exportJson,
    importFromJson,
    updateCover,
  }
}
