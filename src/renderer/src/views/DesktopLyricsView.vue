<template>
  <div
    class="desktop-lyrics-window"
    :class="{ locked: isLocked, 'show-controls': showControls }"
    @mouseenter="showControls = true"
    @mouseleave="showControls = false"
  >
    <!-- 控制栏 -->
    <div v-if="showControls && !isLocked" class="controls-bar">
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
        <button class="control-btn" @click="toggleAlwaysOnTop" :title="alwaysOnTop ? '取消置顶' : '置顶'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </button>
      </div>
      <div class="controls-center">
        <button class="control-btn" @click="playPrev">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>
        <button class="control-btn play-btn" @click="togglePlay">
          <svg v-if="!isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
          </svg>
        </button>
        <button class="control-btn" @click="playNext">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 18h2V6h-2zm-11-7l8.5-6v12z"/>
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
    <div class="lyrics-content" :style="{ fontSize: fontSize + 'px' }">
      <div v-if="!currentLine" class="no-lyrics">
        <span v-if="currentSong">{{ currentSong.name }}</span>
        <span v-else>暂无播放</span>
      </div>
      <div v-else class="lyrics-lines">
        <div class="lyric-line current">
          {{ currentLine.text }}
        </div>
        <div v-if="currentLine.translation && showTranslation" class="lyric-line translation">
          {{ currentLine.translation }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/player'
import { useLyricsStore } from '../stores/lyrics'
import { useLyricsSync } from '../composables/useLyricsSync'

const playerStore = usePlayerStore()
const lyricsStore = useLyricsStore()

const showControls = ref(false)
const isLocked = ref(false)
const alwaysOnTop = ref(true)
const fontSize = ref(24)

const currentSong = computed(() => playerStore.currentSong)
const isPlaying = computed(() => playerStore.playing)
const currentLine = computed(() => lyricsStore.currentLine)
const showTranslation = computed(() => lyricsStore.showTranslation)

// 初始化歌词同步
useLyricsSync()

// 播放控制
function togglePlay() {
  playerStore.togglePlaying()
}

function playPrev() {
  playerStore.playPrev()
}

function playNext() {
  playerStore.playNext()
}

// 窗口控制
async function toggleLock() {
  isLocked.value = !isLocked.value
  if (window.electronAPI?.setLyricsWindowLocked) {
    await window.electronAPI.setLyricsWindowLocked(isLocked.value)
  }
}

async function toggleAlwaysOnTop() {
  alwaysOnTop.value = !alwaysOnTop.value
  if (window.electronAPI?.setLyricsWindowAlwaysOnTop) {
    await window.electronAPI.setLyricsWindowAlwaysOnTop(alwaysOnTop.value)
  }
}

async function closeWindow() {
  if (window.electronAPI?.closeLyricsWindow) {
    await window.electronAPI.closeLyricsWindow()
  }
}

// 监听播放器操作
let unsubscribePlayerAction: (() => void) | undefined

onMounted(() => {
  if (window.electronAPI?.onPlayerAction) {
    unsubscribePlayerAction = window.electronAPI.onPlayerAction((action) => {
      switch (action) {
        case 'toggle':
          togglePlay()
          break
        case 'prev':
          playPrev()
          break
        case 'next':
          playNext()
          break
      }
    })
  }
})

onUnmounted(() => {
  if (unsubscribePlayerAction) {
    unsubscribePlayerAction()
  }
})
</script>

<style scoped>
.desktop-lyrics-window {
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

.desktop-lyrics-window.locked {
  pointer-events: none;
}

.desktop-lyrics-window.locked .lyrics-content {
  pointer-events: none;
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0;
  transition: opacity 0.3s ease;
  -webkit-app-region: drag;
}

.show-controls .controls-bar {
  opacity: 1;
}

.controls-left,
.controls-center,
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
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-app-region: no-drag;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn.play-btn {
  width: 40px;
  height: 40px;
  background: rgba(99, 102, 241, 0.8);
}

.control-btn.play-btn:hover {
  background: rgba(99, 102, 241, 1);
}

.lyrics-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.no-lyrics {
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
}

.lyrics-lines {
  width: 100%;
}

.lyric-line {
  color: #fff;
  font-weight: 600;
  line-height: 1.5;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

.lyric-line.current {
  font-size: 1em;
  opacity: 1;
}

.lyric-line.translation {
  font-size: 0.75em;
  opacity: 0.7;
  margin-top: 8px;
  font-weight: 400;
}
</style>
