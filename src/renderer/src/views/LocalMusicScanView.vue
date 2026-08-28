<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-title">本地音乐扫描</h1>
      <button
        v-if="!scanning"
        class="rounded-xl bg-[#FF5A5F] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
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
            {{ progress.status === 'running' ? '正在扫描文件...' : '准备中...' }}
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
                已处理 {{ progress.processed }} / {{ progress.total || '?' }} 个文件
              </span>
              <span class="text-neutral-500">
                {{ progress.total ? Math.round((progress.processed / progress.total) * 100) + '%' : '扫描中...' }}
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-[#252535]">
              <div
                class="h-full rounded-full bg-[#FF5A5F] transition-all duration-300"
                :style="{ width: progress.total ? `${(progress.processed / progress.total) * 100}%` : '50%' }"
              />
            </div>
          </div>

          <!-- 当前文件 -->
          <div class="rounded-lg bg-neutral-100 p-3 dark:bg-[#1F1F2E]">
            <p class="truncate text-sm text-neutral-600 dark:text-neutral-400">
              {{ progress.currentFile || '准备中...' }}
            </p>
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
              class="rounded-lg bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
              @click="goToLocal"
            >
              返回本地音乐
            </button>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="grid grid-cols-4 gap-4">
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-[#FF5A5F]">{{ scanResult.added + scanResult.updated + scanResult.skipped }}</p>
            <p class="mt-2 text-sm text-neutral-500">总文件数</p>
          </div>
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-green-500">{{ scanResult.added }}</p>
            <p class="mt-2 text-sm text-neutral-500">新增</p>
          </div>
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-blue-500">{{ scanResult.updated }}</p>
            <p class="mt-2 text-sm text-neutral-500">更新</p>
          </div>
          <div class="rounded-lg bg-neutral-100 p-4 text-center dark:bg-[#1F1F2E]">
            <p class="text-3xl font-bold text-neutral-500">{{ scanResult.skipped }}</p>
            <p class="mt-2 text-sm text-neutral-500">跳过</p>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="scanResult.errors && scanResult.errors.length > 0" class="mt-6">
          <h3 class="mb-2 text-sm font-semibold text-red-500">错误 ({{ scanResult.errors.length }})</h3>
          <div class="max-h-48 space-y-1 overflow-y-auto">
            <div
              v-for="(error, index) in scanResult.errors"
              :key="index"
              class="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400"
            >
              {{ error }}
            </div>
          </div>
        </div>

        <p class="mt-4 text-sm text-neutral-500">
          音乐已自动导入，点击"返回本地音乐"查看结果。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { createLibrary, startAsyncScan, getScanProgress, getLibraries } from '@/api/local'

const router = useRouter()

interface BackendScanProgress {
  libraryId: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  total: number
  processed: number
  currentFile?: string
  result?: {
    added: number
    updated: number
    skipped: number
    removed: number
    errors: string[]
    queuedForScrape: number
  }
  error?: string
  startedAt: number
  completedAt?: number
}

const scanning = ref(false)
const currentLibraryId = ref<number | null>(null)
const progress = ref<BackendScanProgress>({
  libraryId: 0,
  status: 'pending',
  total: 0,
  processed: 0,
  currentFile: '',
  startedAt: Date.now(),
})
const scanResult = ref<BackendScanProgress['result'] | null>(null)
let progressTimer: ReturnType<typeof setInterval> | null = null

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
    libraryId: 0,
    status: 'pending',
    total: 0,
    processed: 0,
    currentFile: '',
    startedAt: Date.now(),
  }

  try {
    // 1. 创建音乐库（如果路径已存在则使用已有）
    let libraryId: number
    const libName = dirPath.split('/').pop() || '本地音乐'
    try {
      const res: any = await createLibrary({ name: libName, path: dirPath })
      libraryId = res.body?.id ?? res.id
    } catch (e: any) {
      // 音乐库已存在，查找已有音乐库
      console.log('音乐库创建失败，查找已有音乐库:', e?.message)
      const libsRes: any = await getLibraries()
      const libs = libsRes.body ?? libsRes
      const existing = Array.isArray(libs) ? libs.find((l: any) => l.path === dirPath) : null
      if (existing) {
        libraryId = existing.id
      } else {
        throw new Error('创建音乐库失败：' + (e?.message || '未知错误'))
      }
    }

    currentLibraryId.value = libraryId

    // 2. 启动异步扫描
    await startAsyncScan(libraryId)

    // 3. 轮询进度
    progressTimer = setInterval(async () => {
      try {
        const res: any = await getScanProgress(libraryId)
        const data = res?.body ?? res
        if (data && data.libraryId === libraryId) {
          progress.value = data
          if (data.status === 'completed' || data.status === 'failed') {
            if (progressTimer) clearInterval(progressTimer)
            progressTimer = null
            scanning.value = false
            if (data.status === 'completed') {
              scanResult.value = data.result
            } else {
              alert('扫描失败：' + (data.error || '未知错误'))
            }
          }
        }
      } catch (e) {
        console.error('获取扫描进度失败:', e)
      }
    }, 1000)
  } catch (error) {
    scanning.value = false
    console.error('Scan failed:', error)
    alert('扫描失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

function abortScan() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  scanning.value = false
  // 注意：后端异步扫描无法直接取消，这里只是停止前端轮询
}

function resetScan() {
  scanResult.value = null
  selectDirectory()
}

function goToLocal() {
  router.push('/local')
}

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
})
</script>

<style scoped>
</style>
