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
          <p class="setting-label">迷你悬浮窗</p>
          <p class="setting-description">显示轻量悬浮播放面板</p>
        </div>
        <button class="primary-button" @click="showMiniPlayer = true">打开悬浮窗</button>
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
            :class="activePresetName === key ? '!border-coral !text-coral' : ''"
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
const cacheSizeUsed = ref(0)
const cacheLimitMB = ref(settingsStore.cacheLimitMB)
const isClearingCache = ref(false)

const cacheLimitDisplay = computed(() => cacheLimitMB.value)

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
