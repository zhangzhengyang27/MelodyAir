<template>
  <div class="settings-container mx-auto max-w-2xl space-y-6">
    <h1 class="text-title">设置</h1>

    <section class="settings-card">
      <h2 class="card-title">🎵 播放设置</h2>

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
          <p class="setting-label">自动播放</p>
          <p class="setting-description">选择歌曲后自动开始播放</p>
        </div>
        <ToggleSwitch v-model="settingsStore.autoPlay" />
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
          @change="($event) => settingsStore.fadeDuration = Number(($event.target as HTMLInputElement).value)"
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
          :value="settingsStore.lyricFontSize"
          type="range"
          min="12"
          max="28"
          step="1"
          class="w-48"
          @input="($event) => settingsStore.lyricFontSize = Number(($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">歌词翻译</p>
          <p class="setting-description">默认展示翻译行，适合双语歌词</p>
        </div>
        <ToggleSwitch v-model="settingsStore.showLyricTranslation" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">歌词音译 / 罗马音</p>
          <p class="setting-description">对日文 / 韩文等歌词展示音译辅助</p>
        </div>
        <ToggleSwitch v-model="settingsStore.showLyricRomanization" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">逐字歌词增强</p>
          <p class="setting-description">优先使用更精细的逐字歌词接口</p>
        </div>
        <ToggleSwitch v-model="settingsStore.enableEnhancedLyric" />
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">迷你悬浮窗</p>
          <p class="setting-description">显示轻量悬浮播放面板</p>
        </div>
        <button class="primary-button" @click="handleOpenMiniWindow">打开悬浮窗</button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">桌面歌词</p>
          <p class="setting-description">在桌面显示歌词窗口，支持置顶和锁定</p>
        </div>
        <button class="primary-button" @click="handleOpenLyricsWindow">打开桌面歌词</button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">均衡器 / 音效</p>
          <p class="setting-description">为不同曲风提供音效预设与手动调节</p>
        </div>
        <button class="primary-button" @click="showEqualizer = true">打开均衡器</button>
      </div>
    </section>

    <section class="settings-card">
      <h2 class="card-title">⚙️ 系统设置</h2>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">全局快捷键</p>
          <p class="setting-description">在任何界面控制播放器</p>
        </div>
        <ToggleSwitch v-model="settingsStore.globalShortcut" @update:model-value="handleGlobalShortcutChange" />
      </div>

      <div v-if="settingsStore.globalShortcut" class="setting-row">
        <div class="setting-info">
          <p class="setting-label">自定义快捷键</p>
          <p class="setting-description">自定义播放控制快捷键</p>
        </div>
        <button class="primary-button" @click="showShortcutManager = true">管理快捷键</button>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">本地音乐元数据管理</p>
          <p class="setting-description">管理本地歌曲信息、批量整理和导入导出</p>
        </div>
        <button class="primary-button" @click="goToMetadata">打开管理页</button>
      </div>
    </section>

    <MiniFloatingPlayer
      v-if="showMiniPlayer"
      @close="showMiniPlayer = false"
      @toggle="playerStore.togglePlaying()"
      @prev="playerStore.playPrev()"
      @next="playerStore.playNext()"
    />

    <div v-if="showEqualizer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-2xl rounded-2xl bg-[#11111a] p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">均衡器 / 音效</h2>
          <button class="secondary-button" @click="showEqualizer = false">关闭</button>
        </div>
        <div class="mb-4 grid gap-2 md:grid-cols-3">
          <button
            v-for="key in presetKeys"
            :key="key"
            class="secondary-button"
            :class="activePresetName === key ? '!border-[#FF5A5F] !text-[#FF5A5F]' : ''"
            @click="equalizer.applyPreset(key)"
          >
            {{ key }}
          </button>
        </div>
        <div class="space-y-3">
          <label v-for="(band, index) in equalizerBands" :key="band.id" class="block">
            <div class="mb-1 flex items-center justify-between text-sm text-white/70">
              <span>{{ band.label }}</span>
              <span>{{ band.value }} dB</span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              :value="band.value"
              class="w-full"
              @input="onEqualizerBandInput(index, $event)"
            />
          </label>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <ToggleSwitch v-model="equalizerEnabled" />
          <span class="text-sm text-white/50">{{ equalizerEnabled ? '音效已开启' : '音效已关闭' }}</span>
        </div>
      </div>
    </div>

    <!-- 快捷键管理对话框 -->
    <div v-if="showShortcutManager" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-2xl rounded-2xl bg-[#11111a] p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">全局快捷键管理</h2>
          <button class="secondary-button" @click="showShortcutManager = false">关闭</button>
        </div>

        <div class="mb-4 rounded-lg bg-white/5 p-3 text-sm text-white/70">
          <p>点击快捷键输入框，然后按下你想要设置的组合键。</p>
          <p class="mt-1">按 Esc 取消录制。</p>
        </div>

        <div class="space-y-4">
          <!-- 播放/暂停 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">播放 / 暂停</p>
              <p class="text-sm text-white/50">控制音乐播放和暂停</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="tempShortcuts.playPause"
                type="text"
                readonly
                class="w-48 rounded-lg bg-white/10 px-3 py-2 text-center font-mono text-sm"
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
              <p class="font-medium">上一首</p>
              <p class="text-sm text-white/50">播放上一首歌曲</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="tempShortcuts.prev"
                type="text"
                readonly
                class="w-48 rounded-lg bg-white/10 px-3 py-2 text-center font-mono text-sm"
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
              <p class="font-medium">下一首</p>
              <p class="text-sm text-white/50">播放下一首歌曲</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="tempShortcuts.next"
                type="text"
                readonly
                class="w-48 rounded-lg bg-white/10 px-3 py-2 text-center font-mono text-sm"
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
import { ref, onMounted, computed, onBeforeUnmount, defineComponent } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { usePlayerStore } from '@/stores/player'
import { logger } from '@/utils/logger'
import { cacheManager } from '@/utils/db'
import { useUserStore } from '@/stores/user'
import { useShortcutRecorder } from '@/composables/useShortcutRecorder'
import { useEqualizer } from '@/composables/useEqualizer'
import MiniFloatingPlayer from '@/components/player/MiniFloatingPlayer.vue'
import { useRouter } from 'vue-router'

const ToggleSwitch = defineComponent({
  props: {
    modelValue: { type: Boolean, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const onChange = (event: Event) => {
      emit('update:modelValue', (event.target as HTMLInputElement).checked)
    }
    return { onChange, props }
  },
  template: `
    <label class="toggle-switch">
      <input type="checkbox" :checked="props.modelValue" @change="onChange" class="sr-only" />
      <div class="toggle-track"><div class="toggle-thumb" /></div>
    </label>
  `
})

const settingsStore = useSettingsStore()
const playerStore = usePlayerStore()
const userStore = useUserStore()
const router = useRouter()
const shortcutRecorder = useShortcutRecorder()
const equalizer = useEqualizer()
const equalizerEnabled = equalizer.enabled
const equalizerBands = equalizer.bands
const activePresetName = equalizer.activePresetName
const presetKeys = Object.keys(equalizer.presets)

const showMiniPlayer = ref(false)
const showEqualizer = ref(false)
const showShortcutManager = ref(false)
const cacheSizeUsed = ref(0)
const cacheLimitMB = ref(settingsStore.cacheLimitMB)
const isClearingCache = ref(false)

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

function applyTheme(): void {
  if (settingsStore.theme === 'dark') document.documentElement.classList.add('dark')
  else if (settingsStore.theme === 'light') document.documentElement.classList.remove('dark')
  else document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function handleQualityChange(): void {
  logger.info('settings', 'Quality changed to:', settingsStore.currentQualityLabel)
}

function handlePlaybackSpeedChange(): void {
  playerStore.setPlaybackSpeed(Number(settingsStore.playbackSpeed))
  logger.info('settings', 'Playback speed changed to:', settingsStore.playbackSpeed)
}

function onEqualizerBandInput(index: number, event: Event): void {
  equalizer.setBand(index, Number((event.target as HTMLInputElement).value))
}

function goToMetadata(): void {
  router.push('/local-metadata')
}

async function handleOpenMiniWindow(): Promise<void> {
  try {
    if (window.electronAPI?.openMiniWindow) {
      await window.electronAPI.openMiniWindow()
      logger.info('settings', 'Mini window opened')
    }
  } catch (error) {
    logger.error('settings', 'Failed to open mini window:', error)
  }
}

async function handleOpenLyricsWindow(): Promise<void> {
  try {
    if (window.electronAPI?.openLyricsWindow) {
      await window.electronAPI.openLyricsWindow()
      logger.info('settings', 'Lyrics window opened')
    }
  } catch (error) {
    logger.error('settings', 'Failed to open lyrics window:', error)
  }
}

async function handleCacheLimitChange(): Promise<void> {
  settingsStore.cacheLimitMB = cacheLimitMB.value
  cacheManager.setMaxCacheSize(cacheLimitMB.value)
}

async function clearCache(): Promise<void> {
  if (!confirm('确定要清除所有缓存的音频数据吗？此操作不可恢复。')) return
  isClearingCache.value = true
  try {
    await cacheManager.clearTrackSources()
    cacheSizeUsed.value = 0
    logger.info('settings', 'Cache cleared successfully')
  } finally {
    isClearingCache.value = false
  }
}

function handleMinimizeToTrayChange(enabled: boolean): void {
  settingsStore.toggleMinimizeToTray()
  window.electronAPI?.sendIpcEvent?.('app:setMinimizeToTray', enabled)
}

function handleAutoLaunchChange(enabled: boolean): void {
  settingsStore.toggleAutoLaunch()
  window.electronAPI?.sendIpcEvent?.('app:setAutoLaunch', enabled)
}

async function handleImportCookie(): Promise<void> {
  const value = cookieInput.value.trim()
  if (!value) return
  isImportingCookie.value = true
  cookieImportMsg.value = ''
  try {
    const result = await userStore.importMusicUCookie(value)
    cookieImportSuccess.value = result.success
    cookieImportMsg.value = result.message || (result.success ? '登录成功！' : '登录失败')
    if (result.success) {
      cookieInput.value = ''
      setTimeout(() => { cookieImportMsg.value = '' }, 3000)
    }
  } finally {
    isImportingCookie.value = false
  }
}

async function handleLogout(): Promise<void> {
  await userStore.logout()
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

onMounted(async () => {
  try {
    cacheSizeUsed.value = await cacheManager.getCacheSize()
  } catch (error) {
    logger.error('settings', 'Failed to get cache size:', error)
  }
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

/* Toggle Switch 开关样式 */
.toggle-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-track {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.15);
  transition: background 0.2s ease;
  position: relative;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.toggle-switch:has(input:checked) .toggle-track {
  background: #FF5A5F;
}

.toggle-switch:has(input:checked) .toggle-thumb {
  transform: translateX(18px);
}

.dark .toggle-track {
  background: rgba(255, 255, 255, 0.2);
}
</style>
