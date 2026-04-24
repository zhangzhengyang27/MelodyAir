<template>
  <div
    class="desktop-o3ics-window"
    :class="{ locked: isLocked, 'show-controls': showControls }"
    @mouseenter="showControls = true"
    @mouseleave="showControls = false"
  >
    <!-- 控制栏：只有锁和关闭按钮 -->
    <div v-if="showControls" class="controls-bar">
      <div class="controls-left">
        <button class="control-btn" @click="toggleLock" :title="isLocked ? '解锁' : '锁定'">
          <svg v-if="!isLocked" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        </button>
      </div>
      <div class="controls-right">
        <button class="control-btn" @click="closeWindow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 歌词显示区域 -->
    <div class="o3ics-content" :style="{ fontSize: fontSize + 'px' }">
      <div v-if="!currentLine" class="no-o3ics">
        <span v-if="currentSong">{{ currentSong.name }}</span>
        <span v-else>暂无播放</span>
      </div>
      <div v-else class="o3ics-lines">
        <div class="o3ic-line current">
          {{ currentLine.text }}
        </div>
        <div v-if="currentLine.translation && showTranslation" class="o3ic-line translation">
          {{ currentLine.translation }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '../stores/player'
import { useLyricsStore } from '../stores/o3ics'
import { useSettingsStore } from '../stores/settings'
import { useLyricsSync } from '../composables/useLyricsSync'

const playerStore = usePlayerStore()
const o3icsStore = useLyricsStore()
const settingsStore = useSettingsStore()

const showControls = ref(false)
const isLocked = ref(false)
const fontSize = computed(() => settingsStore.o3icFontSize)

const currentSong = computed(() => playerStore.currentSong)
const currentLine = computed(() => o3icsStore.currentLine)
const showTranslation = computed(() => o3icsStore.showTranslation)

// 初始化歌词同步
useLyricsSync()

// 监听歌曲变化，重置歌词状态
watch(
  () => currentSong.value?.id,
  () => {
    o3icsStore.setCurrentIndex(-1)
  }
)

// 窗口控制
async function toggleLock() {
  isLocked.value = !isLocked.value
  if (window.electronAPI?.setLyricsWindowLocked) {
    await window.electronAPI.setLyricsWindowLocked(isLocked.value)
  }
}

async function closeWindow() {
  if (window.electronAPI?.closeLyricsWindow) {
    await window.electronAPI.closeLyricsWindow()
  }
}
</script>

<style scoped>
.desktop-o3ics-window {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.desktop-o3ics-window.locked {
  pointer-events: none;
}

.desktop-o3ics-window.locked .o3ics-content {
  pointer-events: none;
}

.controls-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.desktop-o3ics-window:hover .controls-bar {
  opacity: 1;
}

.controls-left,
.controls-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn:active {
  transform: scale(0.95);
}

.o3ics-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  -webkit-app-region: drag;
}

.no-o3ics {
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
}

.o3ics-lines {
  width: 100%;
}

.o3ic-line {
  color: #fff;
  font-weight: 600;
  line-height: 1.5;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

.o3ic-line.current {
  font-size: 1em;
  opacity: 1;
}

.o3ic-line.translation {
  font-size: 0.75em;
  opacity: 0.7;
  margin-top: 8px;
  font-weight: 400;
}
</style>
