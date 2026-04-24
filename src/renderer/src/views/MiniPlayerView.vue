<template>
  <div class="mini-player">
    <div class="mini-player-content">
      <!-- 封面 -->
      <div class="cover">
        <img v-if="currentTrack?.cover" :src="currentTrack.cover" alt="cover" />
        <div v-else class="cover-placeholder">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      </div>

      <!-- 信息和控制 -->
      <div class="info-controls">
        <div class="track-info">
          <div class="title">{{ currentTrack?.title || '未播放' }}</div>
          <div class="artist">{{ currentTrack?.artist || '-' }}</div>
        </div>

        <div class="controls">
          <button class="control-btn" @click="handlePrev" title="上一首">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button class="control-btn play-btn" @click="handleTogglePlay" :title="isPlaying ? '暂停' : '播放'">
            <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          <button class="control-btn" @click="handleNext" title="下一首">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <button class="control-btn close-btn" @click="handleClose" title="关闭">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- 进度条 -->
        <div class="progress-bar" @click="handleProgressClick">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface TrackInfo {
  title: string
  artist: string
  album: string
  cover?: string
  duration: number
}

const currentTrack = ref<TrackInfo | null>(null)
const isPlaying = ref(false)
const progress = ref(0)

// 监听主进程发送的播放器状态更新
onMounted(() => {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.on('player:trackUpdated', (_event: unknown, track: TrackInfo) => {
      currentTrack.value = track
    })

    window.electron.ipcRenderer.on('player:playStateUpdated', (_event: unknown, playing: boolean) => {
      isPlaying.value = playing
    })

    window.electron.ipcRenderer.on('player:progressUpdated', (_event: unknown, currentTime: number) => {
      if (currentTrack.value && currentTrack.value.duration > 0) {
        progress.value = (currentTime / currentTrack.value.duration) * 100
      }
    })
  }
})

onUnmounted(() => {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.removeAllListeners('player:trackUpdated')
    window.electron.ipcRenderer.removeAllListeners('player:playStateUpdated')
    window.electron.ipcRenderer.removeAllListeners('player:progressUpdated')
  }
})

function handleTogglePlay() {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('player:action', 'toggle')
  }
}

function handlePrev() {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('player:action', 'prev')
  }
}

function handleNext() {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('player:action', 'next')
  }
}

function handleClose() {
  if (window.electronAPI?.closeMiniWindow) {
    window.electronAPI.closeMiniWindow()
  }
}

function handleProgressClick(event: MouseEvent) {
  if (!currentTrack.value) return

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const seekTime = percentage * currentTrack.value.duration

  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('player:action', `seek:${seekTime}`)
  }
}
</script>

<style scoped>
.mini-player {
  width: 100%;
  height: 100%;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  -webkit-app-region: drag;
}

.mini-player-content {
  display: flex;
  gap: 12px;
  padding: 12px;
  height: 100%;
}

.cover {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  -webkit-app-region: no-drag;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
}

.cover-placeholder .icon {
  width: 48px;
  height: 48px;
}

.info-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  -webkit-app-region: no-drag;
}

.track-info {
  flex: 1;
  min-height: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.control-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn svg {
  width: 18px;
  height: 18px;
}

.play-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.15);
}

.play-btn svg {
  width: 20px;
  height: 20px;
}

.close-btn {
  margin-left: auto;
  background: rgba(255, 59, 48, 0.2);
}

.close-btn:hover {
  background: rgba(255, 59, 48, 0.4);
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  transition: width 0.1s linear;
}
</style>
