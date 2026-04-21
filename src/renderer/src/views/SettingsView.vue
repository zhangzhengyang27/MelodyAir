<template>
  <div class="settings-container mx-auto max-w-2xl space-y-6">
    <h1 class="text-title">设置</h1>

    <!-- 播放设置 -->
    <section class="settings-card">
      <h2 class="card-title">🎵 播放设置</h2>

      <!-- 音乐音质 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">音乐音质</p>
          <p class="setting-description">选择默认播放音质，更高音质会消耗更多流量</p>
        </div>
        <select
          v-model="settingsStore.musicQuality"
          class="select-field"
          @change="handleQualityChange"
        >
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

      <!-- 自动播放 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">自动播放</p>
          <p class="setting-description">选择歌曲后自动开始播放</p>
        </div>
        <ToggleSwitch v-model="settingsStore.autoPlay" />
      </div>

      <!-- 淡入淡出效果 -->
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

      <!-- 解灰（替换不可用歌曲） -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">自动替换灰歌</p>
          <p class="setting-description">当歌曲不可用时，自动尝试从其他音源替换</p>
        </div>
        <ToggleSwitch v-model="settingsStore.enableUnblock" />
      </div>
    </section>

    <!-- 歌词设置 -->
    <section class="settings-card">
      <h2 class="card-title">📝 歌词设置</h2>

      <!-- 显示翻译 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">显示歌词翻译</p>
          <p class="setting-description">在歌词下方显示翻译内容</p>
        </div>
        <ToggleSwitch v-model="settingsStore.showLyricTranslation" />
      </div>

      <!-- 歌词字体大小 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">歌词字号</p>
          <p class="setting-description">调整歌词显示的字体大小</p>
        </div>
        <div class="font-size-control">
          <button
            class="size-btn"
            @click="settingsStore.lyricFontSize = Math.max(12, settingsStore.lyricFontSize - 2)"
          >
            A-
          </button>
          <span class="size-value">{{ settingsStore.lyricFontSize }}px</span>
          <button
            class="size-btn"
            @click="settingsStore.lyricFontSize = Math.min(28, settingsStore.lyricFontSize + 2)"
          >
            A+
          </button>
        </div>
      </div>

      <!-- 歌词背景类型 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">歌词背景</p>
          <p class="setting-description">全屏歌词页面的背景样式</p>
        </div>
        <select
          v-model="settingsStore.lyricsBackground"
          class="select-field w-36"
        >
          <option value="blur">模糊封面</option>
          <option value="gradient">渐变色彩</option>
          <option value="cover">原始封面</option>
          <option value="none">无背景</option>
        </select>
      </div>
    </section>

    <!-- 缓存设置 -->
    <section class="settings-card">
      <h2 class="card-title">💾 缓存管理</h2>

      <!-- 启用缓存 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">启用本地缓存</p>
          <p class="setting-description">将音乐文件缓存到本地以支持离线播放</p>
        </div>
        <ToggleSwitch v-model="settingsStore.enableCache" />
      </div>

      <!-- 缓存大小限制 -->
      <div class="setting-row" v-if="settingsStore.enableCache">
        <div class="setting-info">
          <p class="setting-label">缓存大小限制</p>
          <p class="setting-description">
            当前已用: {{ formatBytes(cacheSizeUsed) }}
            / 最大 {{ cacheLimitDisplay }}MB
          </p>
        </div>
        <select
          v-model="cacheLimitMB"
          class="select-field w-32"
          @change="handleCacheLimitChange"
        >
          <option :value="128">128 MB</option>
          <option :value="256">256 MB</option>
          <option :value="500">500 MB</option>
          <option :value="1024">1 GB</option>
          <option :value="2048">2 GB</option>
          <option :value="4096">4 GB</option>
          <option :value="8192">8 GB</option>
        </select>
      </div>

      <!-- 自动预缓存下一首 -->
      <div class="setting-row" v-if="settingsStore.enableCache">
        <div class="setting-info">
          <p class="setting-label">自动预缓存下一首</p>
          <p class="setting-description">播放时自动缓存下一首歌曲</p>
        </div>
        <ToggleSwitch v-model="settingsStore.autoCacheNextTrack" />
      </div>

      <!-- 清除缓存按钮 -->
      <div class="setting-row" v-if="settingsStore.enableCache">
        <div class="setting-info">
          <p class="setting-label text-red-400">清除缓存</p>
          <p class="setting-description">删除所有缓存的音频数据（不会删除歌单信息）</p>
        </div>
        <button
          class="danger-button"
          @click="clearCache"
          :disabled="isClearingCache"
        >
          {{ isClearingCache ? '清除中...' : '清除全部' }}
        </button>
      </div>
    </section>

    <!-- 外观设置 -->
    <section class="settings-card">
      <h2 class="card-title">🎨 外观设置</h2>

      <!-- 主题模式 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">主题模式</p>
          <p class="setting-description">界面颜色主题</p>
        </div>
        <select
          v-model="settingsStore.theme"
          class="select-field"
          @change="applyTheme"
        >
          <option value="system">跟随系统</option>
          <option value="light">亮色主题</option>
          <option value="dark">暗色主题</option>
        </select>
      </div>
    </section>

    <!-- 系统设置 -->
    <section class="settings-card">
      <h2 class="card-title">⚙️ 系统设置</h2>

      <!-- 账号登录（Cookie 导入） -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">账号状态</p>
          <p class="setting-description">{{ userStore.isAccountLoggedIn ? `已登录: ${userStore.profile?.nickname || '用户'}` : '未登录' }}</p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="userStore.isAccountLoggedIn"
            class="danger-button"
            @click="handleLogout"
          >
            退出登录
          </button>
        </div>
      </div>

      <!-- Cookie 导入 -->
      <div class="setting-row" v-if="!userStore.isAccountLoggedIn">
        <div class="setting-info">
          <p class="setting-label">导入 Cookie 登录</p>
          <p class="setting-description">从 music.163.com 复制 MUSIC_U 值，快速登录（绕过风控）</p>
        </div>
        <div class="flex gap-2 items-center">
          <input
            v-model="cookieInput"
            type="text"
            class="input-field w-80"
            placeholder="粘贴 MUSIC_U 值..."
          />
          <button
            class="primary-button"
            @click="handleImportCookie"
            :disabled="!cookieInput.trim() || isImportingCookie"
          >
            {{ isImportingCookie ? '导入中...' : '导入' }}
          </button>
        </div>
      </div>
      <div v-if="cookieImportMsg" class="text-xs mt-1 px-3 py-2 rounded-lg" :class="cookieImportSuccess ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'">
        {{ cookieImportMsg }}
      </div>

      <!-- API 地址 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">API 服务地址</p>
          <p class="setting-description">网易云音乐 API 服务端地址</p>
        </div>
        <input
          :value="settingsStore.apiBase"
          type="url"
          class="input-field w-64"
          placeholder="http://localhost:3000"
          @change="(e) => settingsStore.setApiBase((e.target as HTMLInputElement).value)"
        />
      </div>

      <!-- 最小化到托盘 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">最小化到托盘</p>
          <p class="setting-description">关闭窗口时最小化到系统托盘</p>
        </div>
        <ToggleSwitch
          :model-value="settingsStore.minimizeToTray"
          @update:model-value="handleMinimizeToTrayChange"
        />
      </div>

      <!-- 全局快捷键 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">全局快捷键</p>
          <p class="setting-description">启用全局媒体控制快捷键（需重启应用生效）</p>
        </div>
        <ToggleSwitch
          :model-value="settingsStore.globalShortcut"
          @update:model-value="settingsStore.toggleGlobalShortcut()"
        />
      </div>

      <!-- 开机自启 -->
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">开机自启动</p>
          <p class="setting-description">开机时自动启动 MelodyAir</p>
        </div>
        <ToggleSwitch
          :model-value="settingsStore.autoLaunch"
          @update:model-value="handleAutoLaunchChange"
        />
      </div>
    </section>

    <!-- 关于 -->
    <section class="settings-card">
      <h2 class="card-title">ℹ️ 关于</h2>

      <div class="about-content">
        <div class="app-icon">🎵</div>
        <h3 class="app-name">Melody Air</h3>
        <p class="app-version">v1.0.0</p>
        <p class="app-description">
          基于 Electron + Vue 3 + TypeScript 构建的现代化桌面音乐播放器<br/>
          借鉴 YesPlayMusic 的优秀设计理念
        </p>
        <div class="tech-stack">
          <span>Vue 3</span>
          <span>TypeScript</span>
          <span>Tailwind CSS</span>
          <span>Howler.js</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { logger } from '@/utils/logger'
import { cacheManager } from '@/utils/db'
import { useUserStore } from '@/stores/user'

// 子组件：开关按钮
const ToggleSwitch = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <label class="toggle-switch">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', $event.target.checked)"
        class="sr-only"
      />
      <div class="toggle-track">
        <div class="toggle-thumb" />
      </div>
    </label>
  `
}

const settingsStore = useSettingsStore()
const userStore = useUserStore()

// Cookie 导入相关
const cookieInput = ref('')
const isImportingCookie = ref(false)
const cookieImportMsg = ref('')
const cookieImportSuccess = ref(false)

// 缓存相关状态
const cacheSizeUsed = ref(0)
const cacheLimitMB = ref(settingsStore.cacheLimitMB)
const isClearingCache = ref(false)

// 计算属性
const cacheLimitDisplay = computed(() => cacheLimitMB.value)

/**
 * 应用主题变更
 */
function applyTheme(): void {
  if (settingsStore.theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (settingsStore.theme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', isDark)
  }
}

/**
 * 处理音质变更
 */
function handleQualityChange(): void {
  logger.info('settings', 'Quality changed to:', settingsStore.currentQualityLabel)
}

/**
 * 处理缓存大小限制变更
 */
async function handleCacheLimitChange(): Promise<void> {
  settingsStore.cacheLimitMB = cacheLimitMB.value
  // setMaxCacheSize 内部已调用 cleanupIfNeeded，不需要额外调用
  cacheManager.setMaxCacheSize(cacheLimitMB.value)
}

/**
 * 清除所有缓存
 */
async function clearCache(): Promise<void> {
  if (!confirm('确定要清除所有缓存的音频数据吗？此操作不可恢复。')) {
    return
  }

  isClearingCache.value = true
  try {
    await cacheManager.clearTrackSources()
    cacheSizeUsed.value = 0
    logger.info('settings', 'Cache cleared successfully')
  } catch (error) {
    logger.error('settings', 'Failed to clear cache:', error)
  } finally {
    isClearingCache.value = false
  }
}

/**
 * 处理最小化到托盘变更
 */
function handleMinimizeToTrayChange(enabled: boolean): void {
  settingsStore.toggleMinimizeToTray()
  window.electronAPI?.sendIpcEvent?.('app:setMinimizeToTray', enabled)
}

/**
 * 处理开机自启变更
 */
function handleAutoLaunchChange(enabled: boolean): void {
  settingsStore.toggleAutoLaunch()
  window.electronAPI?.sendIpcEvent?.('app:setAutoLaunch', enabled)
}

/**
 * 导入 Cookie 登录
 */
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
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e)
    cookieImportSuccess.value = false
    cookieImportMsg.value = errMsg || '导入失败'
  } finally {
    isImportingCookie.value = false
  }
}

/**
 * 退出登录
 */
async function handleLogout(): Promise<void> {
  await userStore.logout()
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// 初始化：加载缓存使用量
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
  transform: translateY(-2px);
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

/* 字号控制 */
.font-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input, #f5f5f5);
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .font-size-control {
  background: #13131C;
  border-color: rgba(255, 255, 255, 0.10);
}

.size-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-secondary, #666);
}

.size-btn:hover {
  background: rgba(255, 90, 95, 0.10);
  color: #FF5A5F;
}

.dark .size-btn:hover {
  background: rgba(255, 90, 95, 0.18);
}

.size-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #1a1a2e);
  min-width: 48px;
  text-align: center;
}

.dark .size-value {
  color: #F0F0F5;
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

/* Toggle 开关组件 - Dark-adapted */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.toggle-track {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #d1d5db;
  transition: background 0.25s ease;
  position: relative;
}

.dark .toggle-track {
  background: #3E3E52;
}

.toggle-switch input:checked + .toggle-track {
  background: linear-gradient(135deg, #FF5A5F, #E0484D);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}

.toggle-switch input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}

/* 关于区域 */
.about-content {
  text-align: center;
  padding: 20px 0;
}

.app-icon {
  font-size: 64px;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.dark .app-icon {
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.35));
}

.app-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #1a1a2e);
  margin-bottom: 4px;
}

.dark .app-name {
  color: #F0F0F5;
}

.app-version {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin-bottom: 16px;
}

.dark .app-version {
  color: #A1A1B5;
}

.app-description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, #888);
  max-width: 360px;
  margin: 0 auto 20px;
}

.dark .app-description {
  color: #6B6B80;
}

.tech-stack {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-stack span {
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(255, 90, 95, 0.08), rgba(224, 72, 77, 0.08));
  border: 1px solid rgba(255, 90, 95, 0.15);
  border-radius: 20px;
  font-size: 12px;
  color: #FF5A5F;
  font-weight: 500;
}

.dark .tech-stack span {
  background: linear-gradient(135deg, rgba(255, 90, 95, 0.12), rgba(224, 72, 77, 0.08));
  border-color: rgba(255, 90, 95, 0.20);
}
</style>
