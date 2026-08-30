<template>
  <div class="settings-container mx-auto max-w-2xl space-y-6">
    <h1 class="text-title">设置</h1>

    <section class="settings-card">
      <h2 class="card-title"><Music class="h-5 w-5 text-[#FF5A5F]" /> 播放设置</h2>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">音乐音质</p>
          <p class="setting-description">选择默认播放音质，更高音质会消耗更多流量</p>
        </div>
        <select v-model="settingsStore.musicQuality" class="select-field" @change="handleQualityChange">
          <option value="standard">标准 (128K)</option>
          <option value="higher">较高 (192K)</option>
          <option value="exhigh">高品质 (320K)</option>
          <option value="lossless">无损 (FLAC)</option>
          <option value="hires">Hi-Res 无损</option>
          <option value="jyeffect">高清环绕声</option>
          <option value="sky">沉浸环绕声</option>
          <option value="dolby">杜比全景声</option>
          <option value="jymaster">超清母带</option>
        </select>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">淡入淡出效果</p>
          <p class="setting-description">播放/暂停时的平滑过渡时长（毫秒）</p>
        </div>
        <input
          :value="settingsStore.fadeDuration"
          type="number"
          min="0"
          max="1000"
          step="50"
          class="number-field w-24"
          @change="onFadeDurationChange"
        />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">播放速度</p>
          <p class="setting-description">设置当前播放的倍速，适合播客、学习或复听场景</p>
        </div>
        <select v-model="settingsStore.playbackSpeed" class="select-field w-36" @change="handlePlaybackSpeedChange">
          <option :value="0.75">0.75x</option>
          <option :value="1">1.0x</option>
          <option :value="1.25">1.25x</option>
          <option :value="1.5">1.5x</option>
          <option :value="2">2.0x</option>
        </select>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">桌面通知</p>
          <p class="setting-description">播放切歌或恢复播放时显示系统通知</p>
        </div>
        <ToggleSwitch v-model="settingsStore.enableDesktopNotification" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">歌词字体大小</p>
          <p class="setting-description">调整歌词展示字号，适合不同窗口尺寸</p>
        </div>
        <input
          :value="lyricsStore.fontSize"
          type="range"
          min="12"
          max="28"
          step="1"
          class="w-48 accent-coral-500"
          @input="onLyricFontSizeInput"
        />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">歌词翻译</p>
          <p class="setting-description">默认展示翻译行，适合双语歌词</p>
        </div>
        <ToggleSwitch v-model="lyricsStore.showTranslation" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">逐字歌词增强</p>
          <p class="setting-description">优先使用更精细的逐字歌词接口</p>
        </div>
        <ToggleSwitch v-model="settingsStore.enableEnhancedLyric" />
      </div>

      <div v-if="hasMiniPlayer" class="setting-row">
        <div class="setting-info">
          <p class="setting-label">迷你悬浮窗</p>
          <p class="setting-description">显示轻量悬浮播放面板，可拖动并记忆位置</p>
        </div>
        <button class="primary-button" :disabled="miniWindowBusy" @click="handleToggleMiniWindow">
          {{ miniWindowOpen ? '关闭悬浮窗' : '打开悬浮窗' }}
        </button>
      </div>

      <div v-if="hasDesktopLyrics" class="setting-row">
        <div class="setting-info">
          <p class="setting-label">桌面歌词</p>
          <p class="setting-description">桌面悬浮歌词窗口，支持置顶、锁定与字号调节</p>
        </div>
        <button class="primary-button" :disabled="lyricsWindowBusy" @click="handleToggleLyricsWindow">
          {{ lyricsWindowOpen ? '关闭桌面歌词' : '打开桌面歌词' }}
        </button>
      </div>

      <div v-if="hasDesktopLyrics && lyricsWindowOpen" class="setting-row">
        <div class="setting-info">
          <p class="setting-label">歌词字号</p>
          <p class="setting-description">桌面歌词的显示字号（14 - 48 px）</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            type="range"
            min="14"
            max="48"
            step="2"
            :value="lyricsFontSize"
            class="w-32 accent-coral-500"
            @input="onLyricsFontSizeInput"
          />
          <span class="w-10 text-right text-sm tabular-nums">{{ lyricsFontSize }}</span>
        </div>
      </div>

      <div v-if="hasDesktopLyrics && lyricsWindowOpen" class="setting-row">
        <div class="setting-info">
          <p class="setting-label">显示译文</p>
          <p class="setting-description">桌面歌词中显示翻译歌词（默认关闭）</p>
        </div>
        <button
          class="primary-button"
          :class="{ 'opacity-70': !lyricsShowTranslation }"
          @click="onToggleLyricsTranslation"
        >
          {{ lyricsShowTranslation ? '已开启' : '已关闭' }}
        </button>
      </div>

    </section>

    <section class="settings-card">
      <h2 class="card-title"><Settings class="h-5 w-5 text-[#FF5A5F]" /> 系统设置</h2>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">启用音乐解锁</p>
          <p class="setting-description">自动获取 VIP 歌曲的播放地址</p>
        </div>
        <ToggleSwitch v-model="settingsStore.enableUnblock" />
      </div>

      <!-- 桌面端专属设置（Web 端自动隐藏） -->
      <template v-if="hasGlobalShortcut || hasTray || hasAutoLaunch">
        <div class="my-2 flex items-center gap-2 px-1">
          <Monitor class="h-3.5 w-3.5 text-[#FF5A5F]" />
          <span class="text-xs font-medium tracking-wide text-[#FF5A5F]">桌面端专属</span>
          <div class="h-px flex-1 bg-neutral-100 dark:bg-white/5" />
        </div>

        <div v-if="hasGlobalShortcut" class="setting-row">
          <div class="setting-info">
            <p class="setting-label">全局快捷键</p>
            <p class="setting-description">在任何界面控制播放器</p>
          </div>
          <ToggleSwitch v-model="settingsStore.globalShortcut" @update:model-value="handleGlobalShortcutChange" />
        </div>

        <div v-if="hasGlobalShortcut && settingsStore.globalShortcut" class="setting-row">
          <div class="setting-info">
            <p class="setting-label">自定义快捷键</p>
            <p class="setting-description">自定义播放控制快捷键</p>
          </div>
          <button class="primary-button" @click="showShortcutManager = true">管理快捷键</button>
        </div>

        <div v-if="hasTray" class="setting-row">
          <div class="setting-info">
            <p class="setting-label">最小化到托盘</p>
            <p class="setting-description">关闭窗口时最小化到系统托盘</p>
          </div>
          <ToggleSwitch v-model="settingsStore.minimizeToTray" @update:model-value="handleMinimizeToTrayChange" />
        </div>

        <div v-if="hasAutoLaunch" class="setting-row">
          <div class="setting-info">
            <p class="setting-label">开机自启</p>
            <p class="setting-description">系统启动时自动运行 MelodyAir</p>
          </div>
          <ToggleSwitch v-model="settingsStore.autoLaunch" @update:model-value="handleAutoLaunchChange" />
        </div>
      </template>
    </section>

    <section class="settings-card">
      <h2 class="card-title"><HardDrive class="h-5 w-5 text-[#FF5A5F]" /> 存储与缓存</h2>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">启用缓存</p>
          <p class="setting-description">缓存已播放的音频，二次播放与离线更快</p>
        </div>
        <ToggleSwitch v-model="settingsStore.enableCache" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">自动缓存下一首</p>
          <p class="setting-description">播放时提前缓存下一首，减少切歌等待</p>
        </div>
        <ToggleSwitch v-model="settingsStore.autoCacheNextTrack" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">缓存上限</p>
          <p class="setting-description">超出后按最旧数据自动清理（100 - 5000 MB）</p>
        </div>
        <input
          type="number"
          min="100"
          max="5000"
          step="100"
          class="number-field w-28"
          :value="settingsStore.cacheLimitMB"
          @change="onCacheLimitChange"
        />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">已用缓存</p>
          <p class="setting-description">{{ cacheSizeLabel }}</p>
        </div>
        <button
          class="danger-button"
          :disabled="isClearingCache || cacheSizeUsed === 0"
          @click="handleClearCache"
        >
          {{ isClearingCache ? '清除中…' : '清除缓存' }}
        </button>
      </div>
    </section>

    <section class="settings-card">
      <h2 class="card-title"><Info class="h-5 w-5 text-[#FF5A5F]" /> 关于</h2>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">当前版本</p>
          <p class="setting-description">{{ appVersionLabel }}</p>
        </div>
        <!-- 检查更新依赖桌面端更新通道，Web 端随服务端部署自动生效，无需展示 -->
        <button v-if="isElectron" class="primary-button" :disabled="checkingUpdate" @click="handleCheckUpdate">
          {{ checkingUpdate ? '检查中…' : '检查更新' }}
        </button>
      </div>

      <div v-if="isElectron" class="setting-row">
        <div class="setting-info">
          <p class="setting-label">开发者工具</p>
          <p class="setting-description">打开 Chromium DevTools 调试渲染进程</p>
        </div>
        <button class="primary-button" @click="handleOpenDevTools">打开</button>
      </div>
    </section>

    <!-- 快捷键管理对话框 -->
    <div v-if="showShortcutManager" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#171722]">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">全局快捷键管理</h2>
          <button class="secondary-button" @click="showShortcutManager = false">关闭</button>
        </div>

        <div class="mb-4 rounded-lg bg-black/5 p-3 text-sm text-neutral-600 dark:bg-white/5 dark:text-white/70">
          <p>点击快捷键输入框，然后按下你想要设置的组合键。</p>
          <p class="mt-1">按 Esc 取消录制。</p>
        </div>

        <div class="space-y-4">
          <!-- 播放/暂停 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-neutral-900 dark:text-white">播放 / 暂停</p>
              <p class="text-sm text-neutral-500 dark:text-white/50">控制音乐播放和暂停</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="tempShortcuts.playPause"
                type="text"
                readonly
                class="w-48 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-center font-mono text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/10 dark:bg-white/10 dark:text-white"
                :class="{ 'ring-2 ring-[#FF5A5F]': recordingKey === 'playPause' }"
                @click="startRecording('playPause')"
                placeholder="点击录制"
              />
              <button
                v-if="tempShortcuts.playPause !== defaultShortcuts.playPause"
                class="text-sm text-[#FF5A5F] hover:underline"
                @click="resetShortcut('playPause')"
              >
                重置
              </button>
            </div>
          </div>

          <!-- 上一首 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-neutral-900 dark:text-white">上一首</p>
              <p class="text-sm text-neutral-500 dark:text-white/50">播放上一首歌曲</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="tempShortcuts.prev"
                type="text"
                readonly
                class="w-48 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-center font-mono text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/10 dark:bg-white/10 dark:text-white"
                :class="{ 'ring-2 ring-[#FF5A5F]': recordingKey === 'prev' }"
                @click="startRecording('prev')"
                placeholder="点击录制"
              />
              <button
                v-if="tempShortcuts.prev !== defaultShortcuts.prev"
                class="text-sm text-[#FF5A5F] hover:underline"
                @click="resetShortcut('prev')"
              >
                重置
              </button>
            </div>
          </div>

          <!-- 下一首 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-neutral-900 dark:text-white">下一首</p>
              <p class="text-sm text-neutral-500 dark:text-white/50">播放下一首歌曲</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="tempShortcuts.next"
                type="text"
                readonly
                class="w-48 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-center font-mono text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/10 dark:bg-white/10 dark:text-white"
                :class="{ 'ring-2 ring-[#FF5A5F]': recordingKey === 'next' }"
                @click="startRecording('next')"
                placeholder="点击录制"
              />
              <button
                v-if="tempShortcuts.next !== defaultShortcuts.next"
                class="text-sm text-[#FF5A5F] hover:underline"
                @click="resetShortcut('next')"
              >
                重置
              </button>
            </div>
          </div>
        </div>

        <div v-if="shortcutError" class="mt-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
          {{ shortcutError }}
        </div>

        <div class="mt-6 flex items-center justify-between">
          <button class="secondary-button" @click="resetAllShortcuts">恢复默认</button>
          <div class="flex gap-2">
            <button class="secondary-button" @click="cancelShortcutChanges">取消</button>
            <button class="primary-button" @click="saveShortcuts">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { Music, Settings, Monitor, Info, HardDrive } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'
import { logger } from '@/utils/logger'
import { cacheManager } from '@/utils/db'
import { usePlatform } from '@/composables/usePlatform'
import { showToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'

const settingsStore = useSettingsStore()
const playerStore = usePlayerStore()
const lyricsStore = useLyricsStore()
const { hasMiniPlayer, hasDesktopLyrics, hasGlobalShortcut, hasTray, hasAutoLaunch, isElectron } = usePlatform()

/** 版本文案：构建期注入版本号，并标注当前运行环境 */
const appVersionLabel = computed(() => {
  const version = typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? `v${__APP_VERSION__}` : '未知版本'
  return `${version} · ${isElectron ? '桌面版' : 'Web 版'}`
})

const showShortcutManager = ref(false)

// 快捷键管理
const defaultShortcuts = {
  playPause: 'MediaPlayPause',
  prev: 'MediaPreviousTrack',
  next: 'MediaNextTrack',
}
const tempShortcuts = ref({
  playPause: settingsStore.shortcutPlayPause,
  prev: settingsStore.shortcutPrev,
  next: settingsStore.shortcutNext,
})
const recordingKey = ref<'playPause' | 'prev' | 'next' | null>(null)
const shortcutError = ref('')

// ---------- 存储与缓存 ----------

const cacheSizeUsed = ref(0)
const isClearingCache = ref(false)

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const cacheSizeLabel = computed(() =>
  cacheSizeUsed.value > 0 ? formatBytes(cacheSizeUsed.value) : '暂无缓存数据'
)

async function refreshCacheSize(): Promise<void> {
  try {
    cacheSizeUsed.value = await cacheManager.getCacheSize()
  } catch (error) {
    logger.error('settings', 'Failed to get cache size:', error)
  }
}

function onCacheLimitChange(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  // 上限由 settings store 的 watch 同步给 CacheManager
  settingsStore.cacheLimitMB = Math.max(100, Math.min(5000, Math.round(value)))
}

async function handleClearCache(): Promise<void> {
  if (!confirm('确定要清除所有缓存的音频数据吗？此操作不可恢复。')) return
  isClearingCache.value = true
  try {
    await cacheManager.clearTrackSources()
    await refreshCacheSize()
    showToast('缓存已清除', { type: 'success' })
  } catch (error) {
    logger.error('settings', 'Failed to clear cache:', error)
    showToast('清除缓存失败，请重试', { type: 'error' })
  } finally {
    isClearingCache.value = false
  }
}

function handleQualityChange(): void {
  logger.info('settings', 'Quality changed to:', settingsStore.currentQualityLabel)
  // 切换音质后立即重载当前歌曲（保留播放进度）
  if (playerStore.currentSong) {
    playerStore.reloadCurrentSongAudio()
  }
}

function handlePlaybackSpeedChange(): void {
  playerStore.setPlaybackSpeed(Number(settingsStore.playbackSpeed))
  logger.info('settings', 'Playback speed changed to:', settingsStore.playbackSpeed)
}

function onFadeDurationChange(event: Event): void {
  playerStore.setFadeDuration(Number((event.target as HTMLInputElement).value))
}

/** 歌词字号与播放页 +/- 按钮共用 lyricsStore，避免两套状态各说各话 */
function onLyricFontSizeInput(event: Event): void {
  lyricsStore.setFontSize(Number((event.target as HTMLInputElement).value))
}

// ---------- 桌面歌词 / 迷你悬浮窗 ----------

const miniWindowOpen = ref(false)
const miniWindowBusy = ref(false)
const lyricsWindowOpen = ref(false)
const lyricsWindowBusy = ref(false)
const lyricsFontSize = ref(24)
const lyricsShowTranslation = ref(false)

/** 同步两个子窗口的当前开关状态，让按钮文案反映真实情况 */
async function refreshWindowStates(): Promise<void> {
  const api = window.electronAPI
  if (!api) return
  try {
    const [miniOpen, lyricsOpen] = await Promise.all([
      api.isMiniWindowOpen?.() ?? false,
      api.isLyricsWindowOpen?.() ?? false,
    ])
    miniWindowOpen.value = miniOpen
    lyricsWindowOpen.value = lyricsOpen
    if (lyricsOpen) {
      const prefs = await api.getLyricsWindowPrefs?.()
      if (prefs) {
        lyricsFontSize.value = prefs.fontSize
        lyricsShowTranslation.value = prefs.showTranslation
      }
    }
  } catch (error) {
    logger.error('settings', 'Failed to refresh window states:', error)
  }
}

async function handleToggleMiniWindow(): Promise<void> {
  const api = window.electronAPI
  if (!api || miniWindowBusy.value) return
  miniWindowBusy.value = true
  try {
    if (miniWindowOpen.value) await api.closeMiniWindow?.()
    else await api.openMiniWindow?.()
    await refreshWindowStates()
  } catch (error) {
    logger.error('settings', 'Failed to toggle mini window:', error)
  } finally {
    miniWindowBusy.value = false
  }
}

async function handleToggleLyricsWindow(): Promise<void> {
  const api = window.electronAPI
  if (!api || lyricsWindowBusy.value) return
  lyricsWindowBusy.value = true
  try {
    if (lyricsWindowOpen.value) await api.closeLyricsWindow?.()
    else await api.openLyricsWindow?.()
    await refreshWindowStates()
  } catch (error) {
    logger.error('settings', 'Failed to toggle lyrics window:', error)
  } finally {
    lyricsWindowBusy.value = false
  }
}

async function onLyricsFontSizeInput(event: Event): Promise<void> {
  const value = Number((event.target as HTMLInputElement).value)
  lyricsFontSize.value = value
  try {
    // 持久化到主进程，桌面歌词窗口打开时立即生效
    await window.electronAPI?.setLyricsWindowPrefs?.({ fontSize: value })
  } catch (error) {
    logger.error('settings', 'Failed to save lyrics font size:', error)
  }
}

async function onToggleLyricsTranslation(): Promise<void> {
  const next = !lyricsShowTranslation.value
  lyricsShowTranslation.value = next
  try {
    await window.electronAPI?.setLyricsWindowPrefs?.({ showTranslation: next })
  } catch (error) {
    logger.error('settings', 'Failed to save lyrics translation pref:', error)
  }
}

/**
 * ToggleSwitch 的 v-model 已经把新值写回 store，handler 里再用 toggle 类方法会把状态翻回原值，
 * 表现为「开关点了又弹回去」。这里只做显式赋值 + 下发主进程，保证幂等。
 */
function handleMinimizeToTrayChange(enabled: boolean): void {
  settingsStore.minimizeToTray = enabled
  window.electronAPI?.setMinimizeToTray?.(enabled)
}

function handleAutoLaunchChange(enabled: boolean): void {
  settingsStore.autoLaunch = enabled
  window.electronAPI?.setAutoLaunch?.(enabled)
}

// ---------- 关于（版本 / 检查更新 / 反馈）----------

const checkingUpdate = ref(false)
/** 检查更新的兜底提示定时器（组件卸载时清理） */
let updateCheckTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 手动检查更新。
 * 检测到新版本时由全局 UpdateNotice 弹窗承接，这里只补「无新版本 / 检查失败」的反馈。
 */
async function handleCheckUpdate(): Promise<void> {
  const api = window.electronAPI
  if (!api || checkingUpdate.value) return

  checkingUpdate.value = true
  let notified = false

  const stop = api.onUpdateStatus((data) => {
    if (data.state !== 'not-available') return
    notified = true
    showToast('当前已是最新版本')
    finish()
  })

  function finish(): void {
    if (updateCheckTimer) clearTimeout(updateCheckTimer)
    updateCheckTimer = null
    stop()
    checkingUpdate.value = false
  }

  // macOS 通过 GitHub 检测最新版本，无新版本时不会推送任何事件，需要兜底提示
  updateCheckTimer = setTimeout(() => {
    if (!notified) showToast('当前已是最新版本')
    finish()
  }, 4000)

  try {
    await api.checkForUpdates()
  } catch (error) {
    logger.error('settings', 'Failed to check update:', error)
    showToast('检查更新失败，请稍后重试', { type: 'error' })
    finish()
  }
}

onBeforeUnmount(() => {
  if (updateCheckTimer) clearTimeout(updateCheckTimer)
  updateCheckTimer = null
})

function handleOpenDevTools(): void {
  window.electronAPI?.openDevTools?.()
}

function handleGlobalShortcutChange(enabled: boolean): void {
  window.electronAPI?.setGlobalShortcuts?.(enabled)
}

function startRecording(key: 'playPause' | 'prev' | 'next'): void {
  recordingKey.value = key
  shortcutError.value = ''

  const handleKeyDown = (event: KeyboardEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Esc 取消录制
    if (event.key === 'Escape') {
      stopRecording()
      return
    }

    // 构建快捷键字符串
    const parts: string[] = []
    if (event.ctrlKey || event.metaKey) parts.push(event.metaKey ? 'Command' : 'Control')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')

    // 添加主键
    const mainKey = event.key.length === 1 ? event.key.toUpperCase() : event.key
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(mainKey)) {
      parts.push(mainKey)
    }

    if (parts.length > 0) {
      const shortcut = parts.join('+')

      // 检查冲突
      const conflictKey = Object.entries(tempShortcuts.value).find(
        ([k, v]) => k !== key && v === shortcut
      )?.[0]

      if (conflictKey) {
        shortcutError.value = `快捷键冲突：该快捷键已被"${getShortcutLabel(conflictKey)}"使用`
        stopRecording()
        return
      }

      tempShortcuts.value[key] = shortcut
      stopRecording()
    }
  }

  const stopRecording = () => {
    recordingKey.value = null
    document.removeEventListener('keydown', handleKeyDown)
  }

  document.addEventListener('keydown', handleKeyDown)
}

function getShortcutLabel(key: string): string {
  const labels: Record<string, string> = {
    playPause: '播放/暂停',
    prev: '上一首',
    next: '下一首',
  }
  return labels[key] || key
}

function resetShortcut(key: 'playPause' | 'prev' | 'next'): void {
  tempShortcuts.value[key] = defaultShortcuts[key]
  shortcutError.value = ''
}

function resetAllShortcuts(): void {
  tempShortcuts.value = { ...defaultShortcuts }
  shortcutError.value = ''
}

function cancelShortcutChanges(): void {
  tempShortcuts.value = {
    playPause: settingsStore.shortcutPlayPause,
    prev: settingsStore.shortcutPrev,
    next: settingsStore.shortcutNext,
  }
  shortcutError.value = ''
  showShortcutManager.value = false
}

async function saveShortcuts(): Promise<void> {
  try {
    settingsStore.shortcutPlayPause = tempShortcuts.value.playPause
    settingsStore.shortcutPrev = tempShortcuts.value.prev
    settingsStore.shortcutNext = tempShortcuts.value.next
    // 标记已使用自定义快捷键，启动时才会回灌给主进程
    settingsStore.customShortcutsEnabled = true

    if (window.electronAPI?.setCustomShortcuts) {
      await window.electronAPI.setCustomShortcuts({
        playPause: tempShortcuts.value.playPause,
        prev: tempShortcuts.value.prev,
        next: tempShortcuts.value.next,
      })
    }

    showShortcutManager.value = false
    logger.info('settings', 'Shortcuts saved successfully')
  } catch (error) {
    logger.error('settings', 'Failed to save shortcuts:', error)
    shortcutError.value = '保存快捷键失败，请重试'
  }
}

onMounted(async () => {
  // 进入设置页时同步子窗口状态（用户可能已从托盘/播放栏打开过）
  await refreshWindowStates()
  await refreshCacheSize()
})
</script>

<style scoped>
@reference "tailwindcss";

/* 容器 */
.settings-container {
  padding-bottom: 60px;
}

/* 卡片通用样式 - Deep Dark elevation system */
.settings-card {
  background: var(--bg-card, #fff);
  border-radius: 16px;
  padding: 24px;
  box-shadow:
    0 2px 16px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.dark .settings-card {
  background: #171722;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.40),
    0 0 1px rgba(255, 255, 255, 0.05);
}

.settings-card:hover {
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.10),
    0 0 1px rgba(0, 0, 0, 0.06);
}

.dark .settings-card:hover {
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.55),
    0 0 1px rgba(255, 255, 255, 0.08);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dark .card-title {
  color: #F0F0F5;
}

/* 设置行 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.setting-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.dark .setting-row {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 2px;
}

.dark .setting-label {
  color: #F0F0F5;
}

.setting-description {
  font-size: 12px;
  color: var(--text-secondary, #666);
  line-height: 1.4;
}

.dark .setting-description {
  color: #A1A1B5;
}

/* 输入框/选择器 - Deep dark input styling */
.input-field,
.select-field,
.number-field {
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: var(--bg-input, #fafafa);
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.input-field:focus,
.select-field:focus,
.number-field:focus {
  border-color: #FF5A5F;
  box-shadow: 0 0 0 3px rgba(255, 90, 95, 0.15);
}

.dark .input-field,
.dark .select-field,
.dark .number-field {
  background: #13131C;
  border-color: rgba(255, 255, 255, 0.10);
  color: #F0F0F5;
}

.dark .input-field:focus,
.dark .select-field:focus,
.dark .number-field:focus {
  border-color: rgba(255, 90, 95, 0.55);
  box-shadow: 0 0 0 3px rgba(255, 90, 95, 0.15);
}

/* 危险按钮 - Adapted for dark mode */
.danger-button {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid #F87171;
  background: transparent;
  color: #EF4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.danger-button:hover:not(:disabled) {
  background: #EF4444;
  color: white;
}

.dark .danger-button {
  border-color: rgba(248, 113, 113, 0.50);
  color: #F87171;
}

.dark .danger-button:hover:not(:disabled) {
  background: #DC2626;
  border-color: #DC2626;
  color: white;
}

.primary-button {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #FF5A5F, #E0484D);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danger-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary-button {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: transparent;
  color: var(--text-primary, #1a1a2e);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.dark .secondary-button {
  border-color: rgba(255, 255, 255, 0.12);
  color: #F0F0F5;
}

.dark .secondary-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}
</style>
