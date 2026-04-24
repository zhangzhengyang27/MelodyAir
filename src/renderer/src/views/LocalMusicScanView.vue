<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-title">本地音乐扫描</h1>
      <button
        v-if="!scanning"
        class="rounded-xl bg-coral-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-600"
        @click="selectDirectory"
      >
        选择文件夹
      </button>
    </div>

    <!-- 扫描状态 -->
    <div v-if="scanning || scanResult" class="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/10 dark:bg-[#13131C]">
      <!-- 扫描中 -->
      <div v-if="scanning">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-subtitle font-semibold">
            {{ progress.status === 'scanning' ? '正在扫描文件...' : '正在解析元数据...' }}
          </h2>
          <button
            class="rounded-lg px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-red-500 dark:hover:bg-white/5"
            @click="abortScan"
          >
            取消扫描
          </button>
        </div>

        <div class="space-y-4">
          <!-- 进度条 -->
          <div>
            <div class="mb-2 flex items-center justify-between text-sm">
              <span class="text-neutral-500">
                {{ progress.status === 'scanning' ? '已扫描' : '已解析' }}
                {{ progress.status === 'scanning' ? progress.scannedCount : progress.parsedCount }} 个文件
              </span>
              <span class="text-neutral-500">
                {{ progress.status === 'scanning' ? '100%' : Math.round((progress.parsedCount / progress.totalCount) * 100) + '%' }}
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-[#252535]">
              <div
                class="h-full rounded-full bg-coral-500 transition-all duration-300"
                :style="{ width: progress.status === 'scanning' ? '100%' : ((progress.parsedCount / progress.totalCount) * 100) + '%' }"
              />
            </div>
          </div>

          <!-- 当前文件 -->
          <div class="rounded-lg bg-neutral-100 p-3 dark:bg-[#1F1F2E]">
            <p class="truncate text-sm text-neutral-600 dark:text-neutral-400">
              {{ progress.currentFile || '准备中...' }}
            </p>
          </div>

          <!-- 统计信息 -->
          <div class="grid grid-cols-3 gap-4">
            <div class="rounded-lg bg-neutral-100 p-3 text-center dark:bg-[#1F1F2E]">
              <p class="text-2xl font-bold text-coral-500">{{ progress.scannedCount }}</p>
              <p class="mt-1 text-xs text-neutral-500">已扫描</p>
            </div>
            <div class="rounded-lg bg-neutral-100 p-3 text-center dark:bg-[#1F1F2E]">
              <p class="text-2xl font-bold text-green-500">{{ progress.parsedCount }}</p>
              <p class="mt-1 text-xs text-neutral-500">已解析</p>
            </div>
            <div class="rounded-lg bg-neutral-100 p-3 text-center dark:bg-[#1F1F2E]">
              <p class="text-2xl font-bold text-red-500">{{ progress.errorCount }}</p>
              <p class="mt-1 text-xs text-neutral-500">失败</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 扫描完成 -->
      <div v-else-if="scanResult">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-subtitle font-semibold">扫描完成</h2>
          <div class="flex gap-2">
            <button
              class="rounded-lg px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
              @click="resetScan"
            >
              重新扫描
            </button>
            <button
              v-if="scanResult.successCount > 0"
              class="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-600"
              @click="showImportDialog = true"
            >
              导入音乐
            </button>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="grid grid-cols-4 gap-4">
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-coral-500">{{ scanResult.totalFiles }}</p>
            <p class="mt-2 text-sm text-neutral-500">总文件数</p>
          </div>
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-green-500">{{ scanResult.successCount }}</p>
            <p class="mt-2 text-sm text-neutral-500">成功</p>
          </div>
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-red-500">{{ scanResult.errorCount }}</p>
            <p class="mt-2 text-sm text-neutral-500">失败</p>
          </div>
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-blue-500">{{ formatDuration(scanResult.duration) }}</p>
            <p class="mt-2 text-sm text-neutral-500">耗时</p>
          </div>
        </div>

        <!-- 扫描结果列表 -->
        <div class="mt-6">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold">扫描结果 ({{ scanResult.files.length }})</h3>
            <div class="flex gap-2">
              <button
                class="rounded-lg px-3 py-1 text-xs transition-colors"
                :class="filterType === 'all' ? 'bg-coral-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-neutral-400'"
                @click="filterType = 'all'"
              >
                全部
              </button>
              <button
                class="rounded-lg px-3 py-1 text-xs transition-colors"
                :class="filterType === 'success' ? 'bg-green-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-neutral-400'"
                @click="filterType = 'success'"
              >
                成功
              </button>
              <button
                class="rounded-lg px-3 py-1 text-xs transition-colors"
                :class="filterType === 'error' ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-neutral-400'"
                @click="filterType = 'error'"
              >
                失败
              </button>
            </div>
          </div>

          <div class="max-h-96 space-y-2 overflow-y-auto">
            <div
              v-for="file in filteredFiles"
              :key="file.filePath"
              class="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.05)]"
            >
              <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-[#252535]">
                <span class="flex h-full w-full items-center justify-center text-lg">
                  {{ file.error ? '❌' : '🎵' }}
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {{ file.title || file.fileName }}
                </p>
                <p class="truncate text-xs text-neutral-500">
                  {{ file.error || `${file.artist || '未知歌手'} - ${file.album || '未知专辑'}` }}
                </p>
              </div>
              <div class="shrink-0 text-xs text-neutral-400">
                {{ formatFileSize(file.fileSize) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入对话框 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showImportDialog"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          @click.self="showImportDialog = false"
        >
          <div class="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/10 dark:bg-[#171722]">
            <h3 class="mb-4 text-lg font-semibold">导入音乐</h3>
            <p class="mb-6 text-sm text-neutral-500">
              确定要导入 {{ scanResult?.successCount }} 首音乐吗？
            </p>
            <div class="flex justify-end gap-3">
              <button
                class="rounded-lg px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
                @click="showImportDialog = false"
              >
                取消
              </button>
              <button
                class="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-600"
                @click="importMusic"
              >
                确定导入
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 导入进度对话框 -->
      <Transition name="fade">
        <div
          v-if="importing"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div class="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/10 dark:bg-[#171722]">
            <h3 class="mb-4 text-lg font-semibold">正在导入...</h3>

            <div class="space-y-4">
              <!-- 进度条 -->
              <div>
                <div class="mb-2 flex items-center justify-between text-sm">
                  <span class="text-neutral-500">
                    已处理 {{ importProgress.current }} / {{ importProgress.total }}
                  </span>
                  <span class="text-neutral-500">
                    {{ Math.round((importProgress.current / importProgress.total) * 100) }}%
                  </span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-[#252535]">
                  <div
                    class="h-full rounded-full bg-coral-500 transition-all duration-300"
                    :style="{ width: ((importProgress.current / importProgress.total) * 100) + '%' }"
                  />
                </div>
              </div>

              <!-- 当前文件 -->
              <div class="rounded-lg bg-neutral-100 p-3 dark:bg-[#1F1F2E]">
                <p class="truncate text-sm text-neutral-600 dark:text-neutral-400">
                  {{ importProgress.currentFile || '准备中...' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLocalStore } from '@/stores/local'
import { batchImportFiles, type ImportFileData } from '@/api/local'
import { useRouter } from 'vue-router'

const router = useRouter()
const localStore = useLocalStore()

interface ScanProgress {
  status: 'scanning' | 'parsing' | 'completed' | 'error'
  currentFile: string
  scannedCount: number
  totalCount: number
  parsedCount: number
  errorCount: number
}

interface AudioFileMetadata {
  filePath: string
  fileName: string
  fileSize: number
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  year?: number
  genre?: string[]
  duration?: number
  bitrate?: number
  format?: string
  trackNumber?: number
  diskNumber?: number
  coverData?: Buffer
  coverMimeType?: string
  error?: string
}

interface ScanResult {
  files: AudioFileMetadata[]
  totalFiles: number
  successCount: number
  errorCount: number
  duration: number
}

const scanning = ref(false)
const importing = ref(false)
const importProgress = ref({
  current: 0,
  total: 0,
  currentFile: ''
})
const progress = ref<ScanProgress>({
  status: 'scanning',
  currentFile: '',
  scannedCount: 0,
  totalCount: 0,
  parsedCount: 0,
  errorCount: 0
})
const scanResult = ref<ScanResult | null>(null)
const filterType = ref<'all' | 'success' | 'error'>('all')
const showImportDialog = ref(false)
const selectedLibraryId = ref<number | null>(null)

const filteredFiles = computed(() => {
  if (!scanResult.value) return []
  if (filterType.value === 'all') return scanResult.value.files
  if (filterType.value === 'success') return scanResult.value.files.filter(f => !f.error)
  return scanResult.value.files.filter(f => f.error)
})

async function selectDirectory() {
  const dirPath = await window.electronAPI.selectScanDirectory()
  if (dirPath) {
    startScan(dirPath)
  }
}

async function startScan(dirPath: string) {
  scanning.value = true
  scanResult.value = null
  progress.value = {
    status: 'scanning',
    currentFile: '',
    scannedCount: 0,
    totalCount: 0,
    parsedCount: 0,
    errorCount: 0
  }

  try {
    const result = await window.electronAPI.startScan(dirPath)
    scanResult.value = result
  } catch (error) {
    console.error('Scan failed:', error)
    alert('扫描失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    scanning.value = false
  }
}

async function abortScan() {
  await window.electronAPI.abortScan()
  scanning.value = false
}

function resetScan() {
  scanResult.value = null
  selectDirectory()
}

async function importMusic() {
  if (!scanResult.value || !selectedLibraryId.value) {
    // 如果没有选择音乐库，先获取或创建一个
    await localStore.fetchLibraries()

    if (localStore.libraries.length === 0) {
      alert('请先创建一个音乐库')
      router.push('/local')
      return
    }

    selectedLibraryId.value = localStore.libraries[0].id
  }

  importing.value = true
  showImportDialog.value = false

  try {
    const successFiles = scanResult.value.files.filter(f => !f.error)
    const importFiles: ImportFileData[] = []

    // 准备导入数据
    for (let i = 0; i < successFiles.length; i++) {
      const file = successFiles[i]
      importProgress.value = {
        current: i + 1,
        total: successFiles.length,
        currentFile: file.fileName
      }

      // 计算文件校验和
      const checksum = await window.electronAPI.calculateChecksum(file.filePath)
      if (!checksum) {
        console.error('Failed to calculate checksum for:', file.filePath)
        continue
      }

      // 处理封面
      let coverPath: string | undefined
      if (file.coverData && file.coverMimeType) {
        const ext = file.coverMimeType.split('/')[1] || 'jpg'
        const coverFileName = `${checksum}.${ext}`
        const savedPath = await window.electronAPI.saveCover(
          Buffer.from(file.coverData).toString('base64'),
          coverFileName
        )
        if (savedPath) {
          coverPath = savedPath
        }
      }

      importFiles.push({
        filePath: file.filePath,
        fileName: file.fileName,
        fileSize: file.fileSize,
        checksum,
        format: file.format || 'unknown',
        bitrate: file.bitrate,
        duration: file.duration,
        title: file.title,
        artist: file.artist,
        album: file.album,
        albumArtist: file.albumArtist,
        year: file.year,
        genre: file.genre,
        trackNumber: file.trackNumber,
        diskNumber: file.diskNumber,
        coverPath
      })
    }

    // 批量导入
    const result = await batchImportFiles(selectedLibraryId.value, importFiles)

    alert(`导入完成！\n成功：${result.body?.successCount || 0}\n跳过：${result.body?.skippedCount || 0}\n失败：${result.body?.errorCount || 0}`)

    // 刷新音乐库统计
    await localStore.fetchStats()

    // 返回本地音乐页面
    router.push('/local')
  } catch (error) {
    console.error('Import failed:', error)
    alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    importing.value = false
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = window.electronAPI.onScanProgress((p: ScanProgress) => {
    progress.value = p
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
