<template>
  <Teleport to="body">
    <Transition name="notice">
      <div
        v-if="visible"
        class="fixed bottom-24 right-4 z-[9998] w-80 rounded-xl border bg-white/95 shadow-xl backdrop-blur-md dark:bg-[#1A1A29]/95"
        :class="borderClass"
      >
        <div class="flex items-start gap-3 p-4">
          <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" :class="iconBg">
            <Loader2 v-if="downloading" class="h-4 w-4 animate-spin" :class="iconColor" />
            <Download v-else-if="downloaded" class="h-4 w-4" :class="iconColor" />
            <Sparkles v-else class="h-4 w-4" :class="iconColor" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-neutral-800 dark:text-[#F0F0F5]">{{ title }}</p>
            <p class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{{ description }}</p>

            <!-- 下载进度条（Windows 下载中） -->
            <div v-if="downloading" class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
              <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300" :style="{ width: `${progress}%` }" />
            </div>
            <p v-if="downloading" class="mt-1 text-right text-[11px] text-neutral-400">{{ progress }}%</p>

            <div v-if="!downloading" class="mt-2 flex gap-2">
              <button
                v-if="!downloaded"
                class="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                :class="actionBg"
                @click="onPrimaryAction"
              >
                {{ primaryActionLabel }}
              </button>
              <button
                v-else
                class="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                :class="actionBg"
                @click="installUpdate"
              >
                立即重启更新
              </button>
              <button
                class="rounded-lg px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-white/10"
                @click="dismiss"
              >
                {{ macMode ? '暂不' : '稍后' }}
              </button>
            </div>
          </div>

          <button class="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300" @click="dismiss">
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Download, Loader2, Sparkles, X } from 'lucide-vue-next'

interface UpdateInfo {
  version: string
  currentVersion: string
  downloadUrl?: string
  releasesUrl?: string
}

const visible = ref(false)
const info = ref<UpdateInfo | null>(null)
const downloading = ref(false)
const downloaded = ref(false)
const progress = ref(0)
const macMode = ref(false)

const platform = ref('')

const title = computed(() => {
  if (downloading.value) return '正在下载更新…'
  if (downloaded.value) return '更新已下载完成'
  return macMode.value ? '发现新版本' : '发现新版本'
})

const description = computed(() => {
  if (downloading.value) return `v${info.value?.version ?? ''} 正在下载，请稍候`
  if (downloaded.value) return `v${info.value?.version ?? ''} 已就绪，重启后生效`
  if (macMode.value) return `v${info.value?.version ?? ''} 已发布，前往 GitHub 下载`
  return `v${info.value?.version ?? ''} 已发布，是否立即更新？`
})

const primaryActionLabel = computed(() => (macMode.value ? '前往下载' : '立即下载'))

const iconBg = computed(() =>
  downloaded.value
    ? 'bg-emerald-500/15'
    : 'bg-gradient-to-br from-sky-500/15 to-cyan-500/15'
)
const iconColor = computed(() =>
  downloaded.value ? 'text-emerald-500' : 'text-sky-500'
)
const actionBg = computed(() =>
  'bg-gradient-to-r from-sky-500 to-cyan-500'
)
const borderClass = computed(() =>
  'border-neutral-200 dark:border-white/10'
)

function dismiss(): void {
  visible.value = false
}

async function onPrimaryAction(): Promise<void> {
  if (macMode.value) {
    // macOS：打开 GitHub Releases 下载页
    await window.electronAPI?.openReleases()
    visible.value = false
    return
  }
  // Windows：开始下载
  downloading.value = true
  progress.value = 0
  await window.electronAPI?.downloadUpdate()
}

async function installUpdate(): Promise<void> {
  await window.electronAPI?.installUpdate()
}

function setupListeners(): () => void {
  const unlisteners: (() => void)[] = []

  unlisteners.push(
    window.electronAPI?.onMacUpdateAvailable((macInfo) => {
      macMode.value = true
      info.value = {
        version: macInfo.version,
        currentVersion: macInfo.currentVersion,
        downloadUrl: macInfo.downloadUrl,
        releasesUrl: macInfo.releasesUrl,
      }
      visible.value = true
    })
  )

  unlisteners.push(
    window.electronAPI?.onUpdateAvailable((winInfo) => {
      macMode.value = false
      info.value = { version: winInfo.version, currentVersion: winInfo.currentVersion }
      visible.value = true
    })
  )

  unlisteners.push(
    window.electronAPI?.onUpdateDownloadProgress((data) => {
      downloading.value = true
      progress.value = data.percent
    })
  )

  unlisteners.push(
    window.electronAPI?.onUpdateDownloaded((data) => {
      downloading.value = false
      downloaded.value = true
      if (info.value) info.value.version = data.version
    })
  )

  unlisteners.push(
    window.electronAPI?.onUpdateError(() => {
      downloading.value = false
      visible.value = false
    })
  )

  return () => unlisteners.forEach((fn) => fn?.())
}

let cleanup: (() => void) | null = null

onMounted(async () => {
  cleanup = setupListeners()
  // 获取平台信息（区分 mac / win 的展示逻辑）
  try {
    platform.value = (await window.electronAPI?.getPlatform()) ?? ''
    if (platform.value === 'darwin') macMode.value = true
  } catch {
    // 忽略
  }
})

onUnmounted(() => {
  cleanup?.()
})
</script>

<style scoped>
.notice-enter-active,
.notice-leave-active {
  transition: all 0.25s ease-out;
}
.notice-enter-from,
.notice-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
