import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getLibraries, createLibrary, deleteLibrary, scanLibrary,
  getLocalAlbums, getLocalAlbum,
  getLocalArtists, getLocalArtist,
  getLocalSongs, getLocalSong,
  getLibraryStats, cleanupOrphanedRecords,
  scrapeTrack, autoScrape,
} from '@/api/local'
import type {
  LocalLibrary, LocalAlbum, LocalArtist, LocalSong,
  ScanResult, LibraryStats,
} from '@/types/local'

/** 从 axios 拦截器返回值中提取 body（兼容 { status, body, cookie } 和裸数据） */
function extractBody(res: any): any {
  return res?.body ?? res
}

export const useLocalStore = defineStore('local', () => {
  const libraries = ref<LocalLibrary[]>([])
  const albums = ref<LocalAlbum[]>([])
  const artists = ref<LocalArtist[]>([])
  const songs = ref<LocalSong[]>([])
  const stats = ref<LibraryStats | null>(null)
  const loading = ref(false)
  const scanning = ref(false)
  const scraping = ref(false)

  // 分页状态
  const total = ref(0)
  const page = ref(1)
  const limit = ref(50)

  // 音乐库 CRUD（返回纯数组，非分页）
  async function fetchLibraries() {
    loading.value = true
    try {
      const res: any = await getLibraries()
      const data = extractBody(res)
      libraries.value = Array.isArray(data) ? data : []
    } finally {
      loading.value = false
    }
  }

  async function addLibrary(data: { name: string; path: string }) {
    await createLibrary(data)
    await fetchLibraries()
  }

  async function removeLibrary(id: number) {
    await deleteLibrary(id)
    await fetchLibraries()
  }

  async function triggerScan(libraryId: number): Promise<ScanResult> {
    scanning.value = true
    try {
      const res: any = await scanLibrary(libraryId)
      await fetchStats()
      return extractBody(res)
    } finally {
      scanning.value = false
    }
  }

  // 专辑（分页返回 { albums, total, page, limit }）
  async function fetchAlbums(params?: { artistId?: number }) {
    loading.value = true
    try {
      const res: any = await getLocalAlbums(params)
      const data = extractBody(res)
      albums.value = Array.isArray(data?.albums) ? data.albums : []
      total.value = data?.total ?? albums.value.length
    } finally {
      loading.value = false
    }
  }

  async function fetchAlbum(id: number): Promise<LocalAlbum | null> {
    const res: any = await getLocalAlbum(id)
    return extractBody(res) ?? null
  }

  // 歌手（分页返回 { artists, total, page, limit }）
  async function fetchArtists() {
    loading.value = true
    try {
      const res: any = await getLocalArtists()
      const data = extractBody(res)
      artists.value = Array.isArray(data?.artists) ? data.artists : []
      total.value = data?.total ?? artists.value.length
    } finally {
      loading.value = false
    }
  }

  async function fetchArtist(id: number): Promise<LocalArtist | null> {
    const res: any = await getLocalArtist(id)
    return extractBody(res) ?? null
  }

  // 歌曲（分页返回 { songs, total, page, limit }）
  async function fetchSongs(params?: { artistId?: number; page?: number; limit?: number; search?: string }) {
    loading.value = true
    try {
      const p = page.value
      const l = limit.value
      const res: any = await getLocalSongs({ page: p, limit: l, ...params })
      const data = extractBody(res)
      songs.value = Array.isArray(data?.songs) ? data.songs : []
      total.value = data?.total ?? songs.value.length
      page.value = data?.page ?? p
      limit.value = data?.limit ?? l
    } finally {
      loading.value = false
    }
  }

  async function fetchSong(id: number): Promise<LocalSong | null> {
    const res: any = await getLocalSong(id)
    return extractBody(res) ?? null
  }

  // 统计
  async function fetchStats() {
    try {
      const res: any = await getLibraryStats()
      stats.value = extractBody(res) ?? null
    } catch { /* ignore */ }
  }

  // 清理
  async function cleanup() {
    await cleanupOrphanedRecords()
    await fetchStats()
  }

  // 刮削
  async function scrapeTrackById(trackId: number) {
    const res: any = await scrapeTrack(trackId)
    return extractBody(res)
  }

  async function triggerAutoScrape() {
    scraping.value = true
    try {
      const res: any = await autoScrape()
      return extractBody(res)
    } finally {
      scraping.value = false
    }
  }

  return {
    libraries, albums, artists, songs, stats,
    loading, scanning, scraping, total, page, limit,
    fetchLibraries, addLibrary, removeLibrary, triggerScan,
    fetchAlbums, fetchAlbum,
    fetchArtists, fetchArtist,
    fetchSongs, fetchSong,
    fetchStats, cleanup,
    scrapeTrackById, triggerAutoScrape,
  }
})
