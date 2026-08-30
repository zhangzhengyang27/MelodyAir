<template>
  <div
    class="desktop-lyrics-window"
    :class="{ locked: isLocked, 'controls-visible': showControls }"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <!-- 控制栏：右上角，悬停或解锁时浮现 -->
    <div class="controls-bar">
      <button class="control-btn" :title="isLocked ? '解锁歌词' : '锁定歌词'" @click.stop="toggleLock">
        <svg v-if="!isLocked" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      </button>

      <button
        class="control-btn"
        :class="{ active: alwaysOnTop }"
        :title="alwaysOnTop ? '取消置顶' : '窗口置顶'"
        @click.stop="toggleAlwaysOnTop"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v10M8 7h8M5 21h14M8 21l2-6M16 21l-2-6"/>
        </svg>
      </button>

      <button
        class="control-btn"
        :class="{ active: showTranslation }"
        :title="showTranslation ? '隐藏译文' : '显示译文'"
        @click.stop="toggleTranslation"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>
        </svg>
      </button>

      <button class="control-btn" title="减小字号" @click.stop="adjustFontSize(-2)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M5 12h14"/>
        </svg>
      </button>

      <button class="control-btn" title="增大字号" @click.stop="adjustFontSize(2)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>

      <button class="control-btn close-btn" title="关闭桌面歌词" @click.stop="closeWindow">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- 磨砂玻璃歌词卡片 -->
    <div class="glass-card" :style="contentStyle">
      <template v-if="lyric.currentText">
        <!-- 上一句：幽灵态，弱化存在感但仍可辨 -->
        <p v-if="lyric.prevText && showPrevLine" class="lyric-line prev">{{ lyric.prevText }}</p>

        <div class="current-block">
          <p class="lyric-line current">
            <template v-if="segments">
              <span v-for="(seg, index) in segments" :key="index" class="word">
                <span class="word-base">{{ seg.text }}</span>
                <span class="word-sung" :style="{ width: sungWidth(seg) }">{{ seg.text }}</span>
              </span>
            </template>
            <template v-else>{{ lyric.currentText }}</template>
          </p>
        </div>

        <p v-if="showTranslation && lyric.translation" class="lyric-line translation">
          {{ lyric.translation }}
        </p>
      </template>

      <!-- 无歌词时退化为歌名 -->
      <p v-else class="lyric-line idle">{{ currentSongName || '暂无播放' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { usePlatform } from '@/composables/usePlatform'
import type { DesktopLyricPayload, WindowTrackInfo } from '@/types/electron'

const FONT_MIN = 14
const FONT_MAX = 48

const { platform } = usePlatform()
/** setIgnoreMouseEvents 的 forward 选项只在 macOS 生效，其它平台必须保持窗口可点击 */
const isMac = platform === 'darwin'

const showControls = ref(false)
const isLocked = ref(false)
const alwaysOnTop = ref(true)
const showTranslation = ref(false)
const fontSize = ref(24)
const currentSongName = ref('')

const lyric = reactive<DesktopLyricPayload>({
  currentText: '',
  hasLyrics: false,
})

/** 最近一次收到的歌曲时间（毫秒）与本地时钟，用于插值出平滑的逐字进度 */
let anchorSongMs = 0
let anchorWallClock = 0

/** 锁定状态下是否正处于鼠标穿透中（仅 macOS 需要动态切换） */
let ignoringMouse = false

const displayMs = ref(0)
const isPlaying = ref(false)

let rafId = 0
const disposers: Array<() => void> = []

/** 字号太小时上一句会挤成一团，低于阈值直接不显示 */
const showPrevLine = computed(() => fontSize.value >= 18)

const contentStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
}))

/**
 * 逐字渲染分段。
 * 只有当 words 拼接结果与 currentText 完全一致时才启用，
 * 否则（歌词源不带逐字时间轴 / 数据不一致）退化为整行渲染。
 */
const segments = computed(() => {
  const { words, lineTime, currentText } = lyric
  if (!words?.length || !currentText) return null
  if (words.map((w) => w.text).join('') !== currentText) return null

  const base = lineTime ?? words[0]!.time
  return words.map((w, index) => {
    const start = w.time - base
    const next = words[index + 1]
    const end = next ? next.time - base : start + 500
    return { text: w.text, start, end }
  })
})

/** 已唱过的部分在该字上的占比（0~100%） */
function sungWidth(seg: { start: number; end: number }): string {
  const elapsed = displayMs.value - (lyric.lineTime ?? 0)
  if (elapsed <= seg.start) return '0%'
  if (elapsed >= seg.end) return '100%'
  const span = seg.end - seg.start
  if (span <= 0) return '100%'
  return `${Math.min(100, ((elapsed - seg.start) / span) * 100)}%`
}

/** 播放中用 rAF 在两次 IPC 之间插值，避免逐字进度 300ms 一跳 */
function tick(): void {
  if (isPlaying.value) {
    displayMs.value = anchorSongMs + (performance.now() - anchorWallClock)
  }
  rafId = requestAnimationFrame(tick)
}

function startTicking(): void {
  if (rafId) return
  rafId = requestAnimationFrame(tick)
}

function stopTicking(): void {
  if (!rafId) return
  cancelAnimationFrame(rafId)
  rafId = 0
}

function syncProgress(currentTimeSec: number): void {
  anchorSongMs = currentTimeSec * 1000
  anchorWallClock = performance.now()
  if (!isPlaying.value) displayMs.value = anchorSongMs
}

// ---------------- 鼠标交互 ----------------

/**
 * 锁定状态下的点击穿透切换。
 * macOS 用 setIgnoreMouseEvents(true, {forward:true}) 仍可收到 mousemove，
 * 因此在控制栏区域临时关闭穿透；其它平台窗口本来就保持可点击，无需处理。
 */
function onMouseMove(e: MouseEvent): void {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const inControlsArea = x > rect.width - 170 && y < 40

  if (!isLocked.value) {
    showControls.value = true
    return
  }

  // 锁定状态：控制栏仅在鼠标进入右上角时浮现
  showControls.value = inControlsArea
  if (!isMac) return

  if (inControlsArea && ignoringMouse) {
    ignoringMouse = false
    void window.electronAPI?.setLyricsWindowIgnoreMouse?.(false)
  } else if (!inControlsArea && !ignoringMouse) {
    ignoringMouse = true
    void window.electronAPI?.setLyricsWindowIgnoreMouse?.(true)
  }
}

function onMouseLeave(): void {
  showControls.value = false
  if (isLocked.value && isMac && !ignoringMouse) {
    ignoringMouse = true
    void window.electronAPI?.setLyricsWindowIgnoreMouse?.(true)
  }
}

// ---------------- 控制 ----------------

type LyricsPrefsPatch = Partial<{
  locked: boolean
  fontSize: number
  alwaysOnTop: boolean
  showTranslation: boolean
}>

async function persistPrefs(patch: LyricsPrefsPatch): Promise<void> {
  try {
    await window.electronAPI?.setLyricsWindowPrefs?.(patch)
  } catch (error) {
    console.error('[DesktopLyrics] setLyricsWindowPrefs failed:', error)
  }
}

function toggleLock(): void {
  isLocked.value = !isLocked.value
  ignoringMouse = isLocked.value
  void window.electronAPI?.setLyricsWindowLocked?.(isLocked.value)
  void persistPrefs({ locked: isLocked.value })
}

function toggleAlwaysOnTop(): void {
  alwaysOnTop.value = !alwaysOnTop.value
  void window.electronAPI?.setLyricsWindowAlwaysOnTop?.(alwaysOnTop.value)
  void persistPrefs({ alwaysOnTop: alwaysOnTop.value })
}

function toggleTranslation(): void {
  showTranslation.value = !showTranslation.value
  void persistPrefs({ showTranslation: showTranslation.value })
}

function adjustFontSize(delta: number): void {
  const next = Math.min(FONT_MAX, Math.max(FONT_MIN, fontSize.value + delta))
  if (next === fontSize.value) return
  fontSize.value = next
  void persistPrefs({ fontSize: next })
}

async function closeWindow(): Promise<void> {
  await window.electronAPI?.closeLyricsWindow()
}

watch(isPlaying, (playing) => {
  if (playing) startTicking()
  else stopTicking()
})

onMounted(async () => {
  const api = window.electronAPI
  if (!api) return

  // 读取持久化的歌词偏好（字号 / 锁定 / 置顶 / 译文）
  try {
    const prefs = await api.getLyricsWindowPrefs?.()
    if (prefs) {
      isLocked.value = prefs.locked
      fontSize.value = Math.min(FONT_MAX, Math.max(FONT_MIN, prefs.fontSize))
      alwaysOnTop.value = prefs.alwaysOnTop
      showTranslation.value = prefs.showTranslation
    }
  } catch (error) {
    console.error('[DesktopLyrics] getLyricsWindowPrefs failed:', error)
  }

  // 锁定状态需要在窗口创建后重新应用一次（主进程只认 IPC，不知道渲染层何时就绪）
  if (isLocked.value) {
    ignoringMouse = true
    void api.setLyricsWindowLocked?.(true)
  }
  void api.setLyricsWindowAlwaysOnTop?.(alwaysOnTop.value)

  disposers.push(
    api.onLyricsUpdated((data) => {
      lyric.currentText = data?.currentText ?? ''
      lyric.translation = data?.translation
      lyric.prevText = data?.prevText
      lyric.nextText = data?.nextText
      lyric.hasLyrics = !!data?.hasLyrics
      lyric.lineTime = data?.lineTime
      lyric.words = data?.words
    }),
    api.onTrackUpdated((track: WindowTrackInfo) => {
      currentSongName.value = track?.title ?? ''
      displayMs.value = 0
      anchorSongMs = 0
      anchorWallClock = performance.now()
    }),
    api.onPlayStateUpdated((playing) => {
      isPlaying.value = playing
    }),
    api.onProgressUpdated((currentTime) => {
      syncProgress(currentTime)
    }),
    // 设置页调整字号/置顶/译文时即时生效
    api.onIpcEvent('lyrics:prefsChanged', (prefs: LyricsPrefsPatch) => {
      if (!prefs) return
      if (typeof prefs.fontSize === 'number') {
        fontSize.value = Math.min(FONT_MAX, Math.max(FONT_MIN, prefs.fontSize))
      }
      if (typeof prefs.showTranslation === 'boolean') {
        showTranslation.value = prefs.showTranslation
      }
      if (typeof prefs.alwaysOnTop === 'boolean') {
        alwaysOnTop.value = prefs.alwaysOnTop
      }
      if (typeof prefs.locked === 'boolean' && prefs.locked !== isLocked.value) {
        isLocked.value = prefs.locked
        ignoringMouse = prefs.locked
      }
    }),
  )

  // 新开的窗口收不到历史事件，主动向主进程要一次全量状态
  api.sendIpcEvent('player:requestState')
})

onUnmounted(() => {
  stopTicking()
  disposers.forEach((dispose) => dispose())
  disposers.length = 0
})
</script>

<style scoped>
.desktop-lyrics-window {
  width: 100%;
  height: 100%;
  display: flex;
  padding: 5px 8px;
  box-sizing: border-box;
  /* 极轻微不透明，保证透明窗口仍能接收到鼠标事件 */
  background: rgba(0, 0, 0, 0.001);
  position: relative;
  overflow: hidden;
  -webkit-app-region: drag;
  user-select: none;
}

.desktop-lyrics-window.locked {
  cursor: default;
  -webkit-app-region: no-drag;
}

/* ---------- 磨砂玻璃卡片 ---------- */
.glass-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.14em;
  padding: 0.34em 1em;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(28, 28, 40, 0.44) 0%,
    rgba(16, 16, 26, 0.38) 100%
  );
  backdrop-filter: blur(22px) saturate(170%);
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  border: 1px solid rgba(255, 255, 255, 0.13);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.09);
  overflow: hidden;
}

/* ---------- 控制栏 ---------- */
.controls-bar {
  position: absolute;
  top: 8px;
  right: 12px;
  display: flex;
  gap: 2px;
  padding: 3px;
  background: rgba(12, 12, 20, 0.62);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  z-index: 10;
  -webkit-app-region: no-drag;
  pointer-events: auto;
}

.desktop-lyrics-window.controls-visible .controls-bar {
  opacity: 1;
  transform: translateY(0);
}

.control-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-app-region: no-drag;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

/* 启用中的能力用品牌珊瑚色标识 */
.control-btn.active {
  color: #ff9a8f;
  background: rgba(255, 90, 95, 0.16);
}

.control-btn.close-btn:hover {
  background: rgba(255, 90, 95, 0.85);
  color: #fff;
}

/* ---------- 歌词排版 ---------- */
.lyric-line {
  margin: 0;
  max-width: 100%;
  text-align: center;
  /* 玻璃底已经保证对比度，用柔和的投影而不是硬描边，观感更干净 */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 2px 14px rgba(0, 0, 0, 0.32);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*
 * 当前句固定单行：桌面歌词是横向条，换行会让高度不可控从而被窗口裁切。
 * 超长句以省略号截断，用户拖动窗口加宽即可完整显示。
 */
.lyric-line.current {
  font-size: 1em;
  font-weight: 700;
  color: #fff;
  line-height: 1.28;
  letter-spacing: 0.02em;
}

.current-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2em;
  max-width: 100%;
}

.lyric-line.prev {
  font-size: 0.42em;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.3;
  letter-spacing: 0.04em;
}

.lyric-line.translation {
  font-size: 0.46em;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.35;
  letter-spacing: 0.03em;
  font-style: normal;
}

.lyric-line.idle {
  font-size: 0.62em;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.3;
  letter-spacing: 0.06em;
}

/* ---------- 逐字高亮 ---------- */
.word {
  position: relative;
  display: inline-block;
  white-space: pre;
}

.word-base {
  color: rgba(255, 255, 255, 0.92);
}

/* 已唱部分：品牌珊瑚渐变填充，按演唱进度裁切宽度 */
.word-sung {
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  white-space: pre;
  background: linear-gradient(90deg, #ffcbb8 0%, #ff8f75 45%, #ff5a5f 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
</style>
