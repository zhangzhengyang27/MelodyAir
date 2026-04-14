<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-display">本地音乐</h1>
      <CoralButton @click="showAddDialog = true">添加音乐库</CoralButton>
    </div>

    <!-- 统计概览 -->
    <div v-if="localStore.stats" class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div v-for="item in statCards" :key="item.label" class="rounded-2xl bg-neutral-50 p-4 dark:bg-[#1F1F2E]">
        <div class="text-2xl font-bold">{{ item.value }}</div>
        <div class="text-xs text-neutral-500 dark:text-[#A1A1B5]">{{ item.label }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C]">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="activeTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 音乐库列表 -->
    <section v-if="activeTab === 'libraries'">
      <div v-if="localStore.libraries.length === 0" class="py-12 text-center text-neutral-400">
        <div class="text-5xl mb-3">📂</div>
        <p>还没有音乐库，点击上方按钮添加</p>
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="lib in localStore.libraries"
          :key="lib.id"
          class="flex items-center justify-between rounded-2xl bg-neutral-50 p-4 dark:bg-[#1F1F2E]"
        >
          <div>
            <h3 class="font-medium">{{ lib.name }}</h3>
            <p class="text-xs text-neutral-500 dark:text-[#A1A1B5]">{{ lib.path }} · {{ lib._count?.files || 0 }} 个文件</p>
          </div>
          <div class="flex gap-2">
            <button
              class="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-300 dark:bg-[#2A2A3A] dark:text-[#A1A1B5] dark:hover:bg-[#333345]"
              @click="openUploadDialog(lib.id)"
            >
              上传
            </button>
            <button
              class="rounded-lg bg-[#FF5A5F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#E0484D] disabled:opacity-50"
              :disabled="localStore.scanning"
              @click="handleScan(lib.id)"
            >
              {{ localStore.scanning ? '扫描中...' : '扫描' }}
            </button>
            <button
              class="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-300 dark:bg-[#2A2A3A] dark:text-[#A1A1B5] dark:hover:bg-[#333345]"
              @click="handleDeleteLibrary(lib.id)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 歌手列表 -->
    <section v-if="activeTab === 'artists'">
      <div v-if="localStore.loading" class="py-8"><LoadingSpinner /></div>
      <div v-else-if="localStore.artists.length === 0" class="py-12 text-center text-neutral-400">
        <p>暂无歌手数据</p>
      </div>
      <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div
          v-for="artist in localStore.artists"
          :key="artist.id"
          class="cursor-pointer"
          @click="$router.push(`/local/artist/${artist.id}`)"
        >
          <div class="aspect-square overflow-hidden rounded-2xl bg-neutral-100 dark:bg-[#1F1F2E]">
            <img
              v-if="artist.avatarPath"
              :src="getCoverUrl(artist.avatarPath)"
              :alt="artist.name"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-4xl">🎤</div>
          </div>
          <p class="mt-2 text-sm font-medium line-clamp-1">{{ artist.name }}</p>
          <p class="text-xs text-neutral-500 dark:text-[#A1A1B5]">{{ artist.albums?.length || 0 }} 张专辑</p>
        </div>
      </div>
    </section>

    <!-- 专辑列表 -->
    <section v-if="activeTab === 'albums'">
      <div v-if="localStore.loading" class="py-8"><LoadingSpinner /></div>
      <div v-else-if="localStore.albums.length === 0" class="py-12 text-center text-neutral-400">
        <p>暂无专辑数据</p>
      </div>
      <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div
          v-for="album in localStore.albums"
          :key="album.id"
          class="cursor-pointer"
          @click="$router.push(`/local/album/${album.id}`)"
        >
          <div class="aspect-square overflow-hidden rounded-2xl bg-neutral-100 dark:bg-[#1F1F2E]">
            <img
              v-if="album.coverPath"
              :src="getCoverUrl(album.coverPath)"
              :alt="album.name"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-4xl">💿</div>
          </div>
          <p class="mt-2 text-sm font-medium line-clamp-1">{{ album.name }}</p>
          <p class="text-xs text-neutral-500 dark:text-[#A1A1B5]">{{ album.artist?.name || '未知歌手' }}</p>
        </div>
      </div>
    </section>

    <!-- 歌曲列表 -->
    <section v-if="activeTab === 'songs'">
      <div v-if="localStore.loading" class="py-8"><LoadingSpinner /></div>
      <div v-else-if="localStore.songs.length === 0" class="py-12 text-center text-neutral-400">
        <p>暂无歌曲数据</p>
      </div>
      <template v-else>
        <div class="mb-4 flex gap-3">
          <CoralButton @click="playAllLocal">播放全部</CoralButton>
          <button
            class="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:hover:bg-[#2A2A3A]"
            :disabled="localStore.scraping"
            @click="handleAutoScrape"
          >
            {{ localStore.scraping ? '刮削中...' : '自动刮削' }}
          </button>
        </div>
        <SongTable :songs="songListForPlayer" @play="handlePlaySong" />
      </template>
    </section>

    <!-- 添加音乐库对话框 -->
    <div v-if="showAddDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddDialog = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1F1F2E]">
        <h2 class="text-lg font-semibold">添加音乐库</h2>
        <div class="mt-4 space-y-3">
          <div>
            <label class="text-sm font-medium">名称</label>
            <input v-model="newLibName" class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-[#13131C]" placeholder="我的音乐库" />
          </div>
          <div>
            <label class="text-sm font-medium">路径</label>
            <input v-model="newLibPath" class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-[#13131C]" placeholder="/Users/me/Music" />
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-3">
          <button class="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700" @click="showAddDialog = false">取消</button>
          <CoralButton @click="handleAddLibrary">添加</CoralButton>
        </div>
      </div>
    </div>

    <!-- 上传文件对话框 -->
    <div v-if="showUploadDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showUploadDialog = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1F1F2E]">
        <h2 class="text-lg font-semibold">上传音频文件</h2>
        <div class="mt-4">
          <label class="text-sm font-medium">选择文件</label>
          <input
            ref="uploadFileRef"
            type="file"
            accept="audio/*,.mp3,.flac,.wav,.aac,.ogg,.m4a"
            class="mt-1 w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#FF5A5F] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#E0484D]"
            :disabled="uploading"
          />
          <p class="mt-2 text-xs text-neutral-500">支持 MP3、FLAC、WAV、AAC、OGG、M4A 格式</p>
        </div>
        <div v-if="uploading" class="mt-4">
          <div class="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-[#2A2A3A]">
            <div class="h-full bg-[#FF5A5F] transition-all" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
          <p class="mt-2 text-center text-sm text-neutral-500">上传中... {{ uploadProgress }}%</p>
        </div>
        <div class="mt-5 flex justify-end gap-3">
          <button class="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700" :disabled="uploading" @click="showUploadDialog = false">取消</button>
          <CoralButton :disabled="uploading" @click="handleUpload">上传</CoralButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLocalStore } from '@/stores/local'
import { useSettingsStore } from '@/stores/settings'
import { uploadFile, getOssUrl } from '@/api/local'
import SongTable from '@/components/common/SongTable.vue'
import CoralButton from '@/components/common/CoralButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import { showToast } from '@/composables/useToast'
import type { Song } from '@/stores/player'

const localStore = useLocalStore()
const settingsStore = useSettingsStore()
const { playSongList } = usePlayer()

const activeTab = ref('libraries')
const showAddDialog = ref(false)
const showUploadDialog = ref(false)
const newLibName = ref('')
const newLibPath = ref('')
const uploadLibraryId = ref<number | null>(null)
const uploadFileRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)

const tabs = [
  { label: '音乐库', value: 'libraries' },
  { label: '歌手', value: 'artists' },
  { label: '专辑', value: 'albums' },
  { label: '歌曲', value: 'songs' },
]

const statCards = computed(() => {
  const s = localStore.stats
  if (!s) return []
  return [
    { label: '音轨', value: s.tracks },
    { label: '歌曲', value: s.songs },
    { label: '专辑', value: s.albums },
    { label: '歌手', value: s.artists },
  ]
})

// 将本地歌曲转换为播放器 Song 格式
const songListForPlayer = computed<Song[]>(() =>
  localStore.songs.map((s) => {
    const track = s.tracks?.[0]
    const album = track?.album
    const sourceFile = track?.sourceFile
    // 优先用专辑封面路径（本地/下载），其次用网易云 picUrl
    const picUrl = album?.coverPath
      ? `${settingsStore.apiBase}/cover?type=album&id=0&path=${encodeURIComponent(album.coverPath)}`
      : ''
    return {
      id: s.id,
      name: s.name,
      artists: s.artist ? [{ id: s.artist.id, name: s.artist.name }] : [],
      album: { id: album?.id ?? s.id, name: album?.name || '', picUrl },
      duration: sourceFile?.duration || 0,
      _localTrackId: track?.id,
      _ossUrl: sourceFile?.ossUrl || null,
    }
  })
)

function getCoverUrl(coverPath: string): string {
  if (coverPath.startsWith('http')) return coverPath
  const base = settingsStore.apiBase
  return `${base}/cover?type=album&id=0&path=${encodeURIComponent(coverPath)}`
}

async function handleScan(libraryId: number) {
  try {
    const result = await localStore.triggerScan(libraryId)
    showToast(`扫描完成：新增 ${result.added}，更新 ${result.updated}，移除 ${result.removed}`, { type: 'success' })
  } catch (e: any) {
    showToast(`扫描失败：${e.message}`, { type: 'error' })
  }
}

async function handleAddLibrary() {
  if (!newLibName.value || !newLibPath.value) {
    showToast('请填写名称和路径', { type: 'warning' })
    return
  }
  try {
    await localStore.addLibrary({ name: newLibName.value, path: newLibPath.value })
    showAddDialog.value = false
    newLibName.value = ''
    newLibPath.value = ''
    showToast('音乐库已添加', { type: 'success' })
  } catch (e: any) {
    showToast(`添加失败：${e.message}`, { type: 'error' })
  }
}

async function handleDeleteLibrary(id: number) {
  if (!confirm('确定删除此音乐库？关联的文件记录也会被删除。')) return
  try {
    await localStore.removeLibrary(id)
    showToast('音乐库已删除', { type: 'success' })
  } catch (e: any) {
    showToast(`删除失败：${e.message}`, { type: 'error' })
  }
}

function openUploadDialog(libraryId: number) {
  uploadLibraryId.value = libraryId
  showUploadDialog.value = true
  uploadProgress.value = 0
}

async function handleUpload() {
  const file = uploadFileRef.value?.files?.[0]
  if (!file) {
    showToast('请选择文件', { type: 'warning' })
    return
  }
  if (!uploadLibraryId.value) {
    showToast('未选择音乐库', { type: 'error' })
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    const result = await uploadFile(file, uploadLibraryId.value, (p) => {
      uploadProgress.value = p
    })
    showToast(`上传成功：${result.track?.name || file.name}`, { type: 'success' })
    showUploadDialog.value = false
    uploadProgress.value = 0
    localStore.fetchStats()
  } catch (e: any) {
    const msg = e.response?.data?.message || e.message || '上传失败'
    showToast(`上传失败：${msg}`, { type: 'error' })
  } finally {
    uploading.value = false
    if (uploadFileRef.value) uploadFileRef.value.value = ''
  }
}

async function handleAutoScrape() {
  try {
    const result = await localStore.triggerAutoScrape()
    showToast(`刮削完成：匹配 ${result.matched}，失败 ${result.failed}`, { type: 'success' })
  } catch (e: any) {
    showToast(`刮削失败：${e.message}`, { type: 'error' })
  }
}

function handlePlaySong(song: Song) {
  const idx = songListForPlayer.value.findIndex(s => s.id === song.id)
  playLocalSongs(songListForPlayer.value, idx)
}

function playAllLocal() {
  playLocalSongs(songListForPlayer.value, 0)
}

function playLocalSongs(songs: Song[], index: number) {
  // 本地歌曲播放：优先 OSS URL，其次 /stream/:trackId
  const mapped = songs.map(s => {
    const trackId = (s as any)._localTrackId
    const ossUrl = (s as any)._ossUrl
    return {
      ...s,
      // OSS URL 直接可用，stream URL 需要拼接
      url: ossUrl || `${settingsStore.apiBase}/stream/${trackId}`,
    }
  })
  playSongList(mapped, index)
}

// 按需加载
watch(activeTab, (tab) => {
  if (tab === 'artists') localStore.fetchArtists()
  else if (tab === 'albums') localStore.fetchAlbums()
  else if (tab === 'songs') localStore.fetchSongs()
})

onMounted(() => {
  localStore.fetchLibraries()
  localStore.fetchStats()
})
</script>
