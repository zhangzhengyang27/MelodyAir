<template>
  <div
    class="desktop-lyrics-window"
    :class="{ locked: isLocked }"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <!-- 控制栏：右上角 -->
    <div class="controls-bar" :class="{ visible: showControls }">
      <button class="control-btn" @click.stop="toggleLock" :title="isLocked ? '解锁歌词' : '锁定歌词（鼠标穿透）'">
        <svg v-if="!isLocked" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      </button>
      <button class="control-btn close-btn" @click.stop="closeWindow" title="关闭桌面歌词">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- 歌词显示区域 -->
    <div class="lyrics-content" :style="{ fontSize: fontSize + 'px' }">
      <div v-if="!currentLyricText" class="no-lyrics">
        <span v-if="currentSongName">{{ currentSongName }}</span>
        <span v-else>暂无播放</span>
      </div>
      <div v-else class="lyrics-lines">
        <div class="lyric-line current">
          {{ currentLyricText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const showControls = ref(false)
const isLocked = ref(false)
const fontSize = computed(() => settingsStore.o3icFontSize)

const currentSongName = ref('')
const currentLyricText = ref('')

// 记录当前是否处于"临时允许点击"状态（锁定时鼠标在控制栏区域）
let isTempClickable = false

let removeLyricsListener: (() => void) | null = null
let removeTrackListener: (() => void) | null = null

onMounted(() => {
  // 监听主窗口同步过来的歌词
  if (window.electronAPI?.onIpcEvent) {
    removeLyricsListener = window.electronAPI.onIpcEvent('lyrics:update', (data: any) => {
      currentLyricText.value = data?.currentText || ''
    })

    // 监听歌曲信息更新
    removeTrackListener = window.electronAPI.onIpcEvent('player:trackUpdated', (track: any) => {
      currentSongName.value = track?.title || ''
    })
  }
})

onUnmounted(() => {
  removeLyricsListener?.()
  removeTrackListener?.()
})

// 监听锁定状态变化
watch(isLocked, async (locked) => {
  if (window.electronAPI?.setLyricsWindowLocked) {
    try {
      await window.electronAPI.setLyricsWindowLocked(locked)
      // 锁定后重置临时状态
      if (locked) {
        isTempClickable = false
        showControls.value = false
      }
    } catch (e) {
      console.error('[DesktopLyrics] setLyricsWindowLocked failed:', e)
    }
  }
})

function onMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 判断鼠标是否在控制栏区域（右上角 80x40）
  const inControlsArea = x > rect.width - 90 && y < 45

  if (isLocked.value) {
    // 锁定状态：动态切换点击穿透
    if (inControlsArea) {
      showControls.value = true
      if (!isTempClickable) {
        isTempClickable = true
        // 临时允许点击
        window.electronAPI?.setLyricsWindowIgnoreMouse?.(false)
      }
    } else {
      showControls.value = false
      if (isTempClickable) {
        isTempClickable = false
        // 恢复点击穿透
        window.electronAPI?.setLyricsWindowIgnoreMouse?.(true)
      }
    }
  } else {
    // 未锁定状态：控制栏始终可见
    showControls.value = true
  }
}

function onMouseLeave() {
  showControls.value = false
  // 锁定时鼠标离开，恢复点击穿透
  if (isLocked.value && isTempClickable) {
    isTempClickable = false
    window.electronAPI?.setLyricsWindowIgnoreMouse?.(true)
  }
}

// 窗口控制
function toggleLock() {
  isLocked.value = !isLocked.value
  console.log('[DesktopLyrics] toggleLock, locked=', isLocked.value)
}

async function closeWindow() {
  if (window.electronAPI?.closeLyricsWindow) {
    await window.electronAPI.closeLyricsWindow()
  }
}
</script>

<style scoped>
.desktop-lyrics-window {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 极轻微不透明，防止鼠标事件穿透到桌面 */
  background: rgba(0, 0, 0, 0.001);
  position: relative;
  overflow: hidden;
  -webkit-app-region: drag;
}

.desktop-lyrics-window.locked {
  cursor: default;
  -webkit-app-region: no-drag;
}

/* 控制栏：右上角 */
.controls-bar {
  position: absolute;
  top: 6px;
  right: 8px;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 6px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 10;
  -webkit-app-region: no-drag;
  pointer-events: auto;
}

.controls-bar.visible {
  opacity: 1;
  transform: translateY(0);
}

/* 未锁定时，控制栏始终可见但半透明 */
.desktop-lyrics-window:not(.locked) .controls-bar {
  opacity: 0.7;
  transform: translateY(0);
}

.desktop-lyrics-window:not(.locked) .controls-bar:hover {
  opacity: 1;
}

.control-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-app-region: no-drag;
  pointer-events: auto;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.control-btn.close-btn:hover {
  background: rgba(255, 90, 95, 0.8);
  color: #fff;
}

/* 歌词内容区域 */
.lyrics-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 70px 8px 20px; /* 右侧留出控制栏空间 */
  text-align: center;
}

.no-lyrics {
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  font-weight: 500;
  -webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.3);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.lyrics-lines {
  width: 100%;
}

.lyric-line {
  color: #fff;
  font-weight: 700;
  line-height: 1.4;
  /* 歌词描边：确保在任何桌面背景下都清晰可见 */
  -webkit-text-stroke: 0.8px rgba(0, 0, 0, 0.6);
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.8),
    0 0 8px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

.lyric-line.current {
  font-size: 1em;
  opacity: 1;
}
</style>
