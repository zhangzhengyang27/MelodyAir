<template>
  <div
    class="player-full fixed inset-0 z-50 flex flex-col overflow-hidden"
    :style="{ '--accent-color': accentColor }"
  >
    <!-- 动态背景层：封面模糊 + 渐变叠加 -->
    <div class="absolute inset-0 overflow-hidden">
      <img
        v-if="playerStore.currentSong?.album?.picUrl"
        :src="playerStore.currentSong.album.picUrl + '?param=400y400'"
        alt=""
        class="bg-image h-full w-full object-cover scale-110"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-[#0a0a10]/95 via-[#09090f]/90 to-[#050508]" />
      <!-- 环境光效 -->
      <div class="ambient-glow" :class="{ active: playerStore.playing }" />
    </div>

    <!-- Header -->
    <header class="relative flex items-center justify-between px-6 py-4" style="-webkit-app-region: drag;">
      <button
        class="header-btn"
        style="-webkit-app-region: no-drag;"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div class="flex items-center gap-2">
        <span class="playing-dot" :class="{ active: playerStore.playing }" />
        <span class="text-xs font-medium tracking-wider text-white/60 uppercase">Now Playing</span>
      </div>
    </header>

    <!-- Main Content - 网易云布局：上下结构 -->
    <main class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <!-- 上半部分：左右布局 -->
      <div class="content-top flex flex-1 min-h-0">
        <!-- 左侧：唱片封面 -->
        <section class="cover-section flex items-center justify-center">
          <div class="vinyl-container">
            <div class="vinyl-glow" :class="{ active: playerStore.playing }" />
            <div class="vinyl-disc" :class="{ spinning: playerStore.playing }">
              <img
                v-if="playerStore.currentSong?.album?.picUrl"
                :src="playerStore.currentSong.album.picUrl + '?param=600y600'"
                alt="cover"
                class="disc-cover"
              />
              <div v-else class="disc-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <div class="disc-center-hole">
                <div class="disc-center-inner" />
              </div>
              <div class="disc-grooves" />
            </div>
            <div class="vinyl-reflection" />
          </div>
        </section>

        <!-- 右侧：歌词面板 -->
        <aside class="lyrics-section">
          <!-- 歌曲标题和艺术家 -->
          <div class="lyrics-header">
            <h1 class="lyrics-song-title">{{ playerStore.currentSong?.name || '未在播放' }}</h1>
            <p class="lyrics-song-artist">
              <template v-if="playerStore.currentSong?.artists?.length">
                <template v-for="(artist, idx) in playerStore.currentSong.artists" :key="artist.id">
                  <router-link :to="`/artist/${artist.id}`" class="artist-link">{{ artist.name }}</router-link>
                  <span v-if="idx < playerStore.currentSong.artists.length - 1" class="mx-1"> / </span>
                </template>
              </template>
              <span v-else>--</span>
            </p>
          </div>

          <!-- 歌词显示 -->
          <div class="lyrics-display-wrapper">
            <LyricsDisplay
              :lyrics="lyricsStore.lines"
              :current-index="lyricsStore.currentIndex"
              :current-line="lyricsStore.currentLine"
              :prev-line="lyricsStore.prevLine"
              :next-line="lyricsStore.nextLine"
              :mode="lyricsStore.effectiveMode"
              :font-size="lyricsStore.fontSize"
              :show-translation="lyricsStore.showTranslation"
              :show-romanized="lyricsStore.showRomanized"
              :loading="lyricsStore.loading"
              :error="lyricsStore.error"
              @line-click="handleLyricSeek"
            />
          </div>
        </aside>
      </div>

      <!-- 下半部分：播放控制区 -->
      <div class="controls-bottom">
        <!-- 进度条 -->
        <div class="progress-wrapper">
          <span class="time-current">{{ formatTime(playerStore.currentTime) }}</span>
          <div
            ref="progressBarEl"
            class="progress-track"
            @mousedown="onProgressDragStart"
            @touchstart.prevent="onProgressTouchStart"
            @mouseenter="isProgressHovered = true"
            @mouseleave="isProgressHovered = false"
            @mousemove="onProgressHoverMove"
          >
            <div class="progress-buffer" :style="bufferStyle" />
            <div class="progress-fill" :style="progressStyle" />
            <div
              class="progress-thumb"
              :class="{ visible: isDragging || isProgressHovered }"
              :style="progressThumbStyle"
            />
            <div
              v-if="isProgressHovered && !isDragging"
              class="progress-tooltip"
              :style="hoverTooltipStyle"
            >
              {{ formatTime(hoverTime) }}
            </div>
            <div
              v-if="isDragging"
              class="progress-tooltip dragging"
              :style="dragTooltipStyle"
            >
              {{ formatTime(dragTime) }}
            </div>
          </div>
          <span class="time-duration">{{ formatTime(playerStore.duration) }}</span>
        </div>

        <!-- 控制按钮 -->
        <div class="controls-bar">
          <div class="controls-left">
            <button class="ctrl-btn-icon" @click="playerStore.togglePlayMode" :title="playModeLabel">
              <span class="text-lg">{{ playModeIcon }}</span>
            </button>
            <button class="ctrl-btn-icon" @click="handleLike" :title="isLiked ? '取消喜欢' : '喜欢'">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="[isLiked ? 'text-coral' : '']" :fill="isLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          <div class="controls-center">
            <button class="ctrl-btn-icon" @click="playerStore.playPrev" title="上一首">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button class="play-btn-large" @click="playerStore.togglePlaying">
              <svg v-if="!playerStore.playing" xmlns="http://www.w3.org/2000/svg" class="play-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="pause-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>

            <button class="ctrl-btn-icon" @click="playerStore.playNext" title="下一首">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div class="controls-right">
            <button class="ctrl-btn-icon" @click="toggleDesktopLyrics" title="桌面歌词">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </button>

            <button class="ctrl-btn-icon" @click="showQueue = true" title="播放队列">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h10m-10 4h6" />
              </svg>
            </button>

            <button class="ctrl-btn-icon" @click="toggleMute" :title="playerStore.volume === 0 ? '取消静音' : '静音'">
              <svg v-if="playerStore.volume === 0" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 6l-4 4H4v4h4l4 4V6z" />
              </svg>
            </button>

            <div
              ref="volumeBarEl"
              class="volume-slider"
              @mousedown="onVolumeDragStart"
              @touchstart.prevent="onVolumeTouchStart"
              @mouseenter="isVolumeHovered = true"
              @mouseleave="isVolumeHovered = false"
            >
              <div class="volume-track-bg" />
              <div class="volume-fill" :style="volumeFillStyle" />
              <div
                class="volume-thumb"
                :class="{ visible: isVolumeDragging || isVolumeHovered }"
                :style="volumeThumbStyle"
              />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 播放队列弹窗 -->
    <PlayQueue
      v-if="showQueue"
      :playlist="playerStore.playlist"
      :current-index="playerStore.currentIndex"
      :play-next-list="playerStore.playNextList"
      :visible="showQueue"
      @close="showQueue = false"
      @play="(s, i) => { playerStore.currentIndex = i; playerStore.playSong(s) }"
      @remove="(i) => playerStore.removeFromPlaylist(i)"
      @clear-all="playerStore.clearPlaylist()"
      @reorder="(from, to) => playerStore.reorderPlaylist(from, to)"
      @remove-duplicates="handleRemoveDuplicates"
      @save-as-playlist="handleSaveAsPlaylist"
      @restore-queue="handleRestoreQueue"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useLyricsStore } from '@/stores/lyrics'
import { useUserStore } from '@/stores/user'
import { useAudio } from '@/composables/useAudio'
import { formatTime } from '@/utils/format'
import { parseLrc } from '@/utils/lyricsParser'
import { getLyric, getLyricV1 } from '@/api/song'
import { getLocalLyrics } from '@/api/local'
import { cacheManager } from '@/utils/db'
import { useSettingsStore } from '@/stores/settings'
import { logger } from '@/utils/logger'
import LyricsDisplay from '@/components/lyrics/LyricsDisplay.vue'
import PlayQueue from './PlayQueue.vue'
import { useLyricsSync } from '@/composables/useLyricsSync'

defineEmits<{
  close: []
}>()

const playerStore = usePlayerStore()
const lyricsStore = useLyricsStore()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const { seek, seekByProgress } = useAudio()

const { syncEngine, seekToIndex, setSeekPause } = useLyricsSync()

watch(
  () => playerStore.currentSong?.id,
  async (songId) => {
    if (!songId) {
      lyricsStore.resetForTrack(null)
      return
    }

    await loadLyrics(songId)
  },
  { immediate: true }
)

async function loadLyrics(songId: number) {
  lyricsStore.resetForTrack(songId)
  lyricsStore.setLoading(true)

  try {
    const currentSong = playerStore.currentSong
    if (!currentSong) return

    let lrc = ''
    let source: 'local' | 'online' | 'cache' = 'online'

    if (!currentSong._localTrackId) {
      try {
        const cached = await cacheManager.getLyric(songId)
        if (cached?.lyric && parseLrc(cached.lyric).length > 0) {
          lrc = cached.lyric
          source = 'cache'
          logger.debug('lyric', `命中 IDB 缓存: songId=${songId}`)
        }
      } catch (e) {
        logger.warn('lyric', 'IDB 缓存读取失败:', e)
      }
    }

    if (!lrc && currentSong._localTrackId) {
      const res: any = await getLocalLyrics(songId)
      const data = res?.body ?? res
      lrc = data?.lrc?.lyric || ''
      if (!lrc && data?.synced && typeof data.synced === 'string') {
        try {
          const syncedObj = JSON.parse(data.synced)
          if (syncedObj && typeof syncedObj === 'object') {
            const parts: string[] = []
            for (const [k, v] of Object.entries(syncedObj)) {
              if (/^\d{1,2}:\d{2}\.\d{2,3}$/.test(k) && v) {
                const [min, sec] = k.split(':')
                parts.push(`[${min.padStart(2, '0')}:${sec}]${v}`)
              }
            }
            if (parts.length > 0) lrc = parts.join('\n')
          }
        } catch (e) {
          logger.warn('lyric', 'synced JSON 解析失败:', e)
        }
      }
      if (!lrc) lrc = data?.plain || ''
      source = 'local'
    }

    if (!lrc && !currentSong._localTrackId) {
      let v1Tlyric: string | undefined
      let v1Romalrc: string | undefined
      if (settingsStore.enableEnhancedLyric) {
        try {
          const resV1: any = await getLyricV1(songId, { cp: true, tv: 1, lv: 1, rv: 1, yv: 1 })
          const v1Lrc = resV1?.lrc?.lyric || resV1?.klyric?.lyric || resV1?.yrc?.lyric || ''
          v1Tlyric = resV1?.tlyric?.lyric || undefined
          v1Romalrc = resV1?.romalrc?.lyric || resV1?.yrc?.lyric || undefined
          if (v1Lrc) {
            const parsed = parseLrc(v1Lrc)
            // v1 的 lrc 可能是纯逐字 JSON 格式，parseLrc 无法解析，返回空数组
            // 此时回退到普通 /lyric 接口
            if (parsed.length > 0) {
              let merged = parsed
              if (v1Tlyric) {
                const translated = parseLrc(v1Tlyric)
                merged = merged.map((line) => {
                  const matched = translated.find((t) => Math.abs(t.time - line.time) < 500)
                  return matched ? { ...line, translation: matched.text } : line
                })
              }
              if (v1Romalrc) {
                const roman = parseLrc(v1Romalrc)
                merged = merged.map((line) => {
                  const matched = roman.find((r) => Math.abs(r.time - line.time) < 500)
                  return matched ? { ...line, romanized: matched.text } : line
                })
              }
              lyricsStore.setLyrics({
                trackId: songId,
                trackName: currentSong.name,
                artists: currentSong.artists.map(a => a.name).join(' / '),
                source: 'online',
                rawText: v1Lrc,
                lines: merged,
              })
              return
            }
            logger.debug('lyric', `v1 歌词格式无法解析（${v1Lrc.length} 字符，0 行），回退到普通歌词`)
          }
        } catch (e) {
          logger.warn('lyric', '逐字歌词请求失败，回退到普通歌词:', e)
        }
      }

      const res: any = await getLyric(songId)
      lrc = res?.lrc?.lyric || ''
      const tlyric = res?.tlyric?.lyric || v1Tlyric
      const romalrc = v1Romalrc
      if (lrc) {
        await cacheManager.cacheLyric(songId, lrc, tlyric).catch(() => {})
      }
    }

    if (lrc) {
      let parsed = parseLrc(lrc)
      if (tlyric) {
        const translated = parseLrc(tlyric)
        parsed = parsed.map((line) => {
          const matched = translated.find((t) => Math.abs(t.time - line.time) < 500)
          return matched ? { ...line, translation: matched.text } : line
        })
      }
      if (romalrc) {
        const roman = parseLrc(romalrc)
        parsed = parsed.map((line) => {
          const matched = roman.find((r) => Math.abs(r.time - line.time) < 500)
          return matched ? { ...line, romanized: matched.text } : line
        })
      }
      lyricsStore.setLyrics({
        trackId: songId,
        trackName: currentSong.name,
        artists: currentSong.artists.map(a => a.name).join(' / '),
        source,
        rawText: lrc,
        lines: parsed,
      })
    } else {
      lyricsStore.setError('暂无歌词')
    }
  } catch (e) {
    logger.error('lyric', 'Failed to fetch lyric:', e)
    lyricsStore.setError('歌词加载失败')
  } finally {
    lyricsStore.setLoading(false)
  }
}

function handleLyricSeek(index: number) {
  setSeekPause()
  seekToIndex(index)
}

// UI State
const showQueue = ref(false)
const wasPlaying = ref(false)
const prevVolume = ref(0.8)

// Progress Bar State
const progressBarEl = ref<HTMLElement>()
let isDragging = false
let dragProgress = 0
let dragTime = 0
const isProgressHovered = ref(false)
const hoverProgress = ref(0)
const hoverTime = ref(0)
const bufferProgress = ref(0)
const displayProgress = computed(() =>
  isDragging ? dragProgress : playerStore.progress
)

// 动态样式（避免模板内联表达式解析问题）
const progressStyle = computed(() => ({ width: displayProgress.value * 100 + '%' }))
const progressThumbStyle = computed(() => ({ left: displayProgress.value * 100 + '%' }))
const bufferStyle = computed(() => ({ width: bufferProgress.value * '%' }))
const hoverTooltipStyle = computed(() => ({ left: (hoverProgress.value * 100) + '%' }))
const dragTooltipStyle = computed(() => ({ left: (dragProgress * 100) + '%' }))
const volumeFillStyle = computed(() => ({ width: (playerStore.volume * 100) + '%' }))
const volumeThumbStyle = computed(() => ({ left: (playerStore.volume * 100) + '%' }))

// Volume Bar State
const volumeBarEl = ref<HTMLElement>()
let isVolumeDragging = false
const isVolumeHovered = ref(false)

// Watch playing state for vinyl animation continuity
watch(() => playerStore.playing, (val) => {
  if (val) wasPlaying.value = true
})

// Computed
const isLiked = computed(() =>
  playerStore.currentSong ? userStore.isLiked(playerStore.currentSong.id) : false
)

const playModeIcon = computed(() => {
  const icons: Record<string, string> = {
    sequence: '\u{1F500}', loop: '\u{1F501}', random: '\u{1F3B2}',
    loopOne: '\u{1F502}', reversed: '\u23EE}'
  }
  return icons[playerStore.playMode]
})

const playModeLabel = computed(() => {
  const labels: Record<string, string> = {
    sequence: '顺序播放', loop: '列表循环', random: '随机播放',
    loopOne: '单曲循环', reversed: '倒序播放'
  }
  return labels[playerStore.playMode]
})

// Accent color derived from cover (placeholder)
const accentColor = computed(() => '#FF5A5F')

// === Actions ===
function toggleMute() {
  if (playerStore.volume > 0) {
    prevVolume.value = playerStore.volume
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(prevVolume.value)
  }
}

function handleLike() {
  if (playerStore.currentSong) {
    userStore.toggleLike(playerStore.currentSong.id)
  }
}

async function toggleDesktopLyrics() {
  if (window.electronAPI?.openLyricsWindow) {
    const isOpen = await window.electronAPI.isLyricsWindowOpen()
    if (isOpen) {
      await window.electronAPI.closeLyricsWindow()
    } else {
      await window.electronAPI.openLyricsWindow()
    }
  }
}

function handleRemoveDuplicates() {
  const removedCount = playerStore.removeDuplicates()
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} duplicate songs`)
  }
}

async function handleSaveAsPlaylist() {
  const playlistName = prompt('请输入歌单名称', `播放队列 ${new Date().toLocaleDateString()}`)
  if (!playlistName || !playlistName.trim()) return

  try {
    // 获取当前播放列表的歌曲 ID
    const trackIds = playerStore.playlist.map(song => song.id)

    if (trackIds.length === 0) {
      alert('播放列表为空')
      return
    }

    // 调用创建歌单 API
    const { createPlaylist, addTracksToPlaylist } = await import('@/api/playlist')
    const result = await createPlaylist(playlistName.trim())

    if (result && result.id) {
      // 添加歌曲到歌单
      await addTracksToPlaylist(result.id, trackIds)
      alert(`成功创建歌单「${playlistName}」，已添加 ${trackIds.length} 首歌曲`)
    }
  } catch (error) {
    console.error('Failed to save playlist:', error)
    alert('保存歌单失败，请重试')
  }
}

function handleRestoreQueue(playlist: any[], currentIndex: number) {
  if (confirm(`确定要恢复这个队列吗？当前队列将被替换。`)) {
    playerStore.setPlaylist(playlist, currentIndex)
    if (playlist.length > 0 && currentIndex >= 0 && currentIndex < playlist.length) {
      playerStore.playSong(playlist[currentIndex])
    }
  }
}

// === Progress Bar Drag Logic ===
function calcProgressFromEvent(e: MouseEvent | TouchEvent): number {
  if (!progressBarEl.value) return 0
  const rect = progressBarEl.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

function onProgressDragStart(e: MouseEvent) {
  isDragging = true
  document.addEventListener('mousemove', onProgressDragMove)
  document.addEventListener('mouseup', onProgressDragEnd)
  updateDrag(calcProgressFromEvent(e))
}

function onProgressTouchStart(e: TouchEvent) {
  isDragging = true
  document.addEventListener('touchmove', onProgressDragMove, { passive: false })
  document.addEventListener('touchend', onProgressDragEnd)
  updateDrag(calcProgressFromEvent(e))
}

function onProgressDragMove(e: Event) {
  if (!isDragging) return
  updateDrag(calcProgressFromEvent(e as MouseEvent | TouchEvent))
}

function onProgressDragEnd(e: MouseEvent | TouchEvent | Event) {
  if (!isDragging) return
  isDragging = false
  document.removeEventListener('mousemove', onProgressDragMove)
  document.removeEventListener('mouseup', onProgressDragEnd)
  document.removeEventListener('touchmove', onProgressDragMove)
  document.removeEventListener('touchend', onProgressDragEnd)
  // Seek to final position
  seekByProgress(dragProgress)
}

function updateDrag(progress: number) {
  dragProgress = progress
  dragTime = progress * playerStore.duration
}

// Progress hover (via @mousemove on element)
// Progress hover (via @mousemove on element)
function onProgressHoverMove(e: MouseEvent) {
  if (!progressBarEl.value) return
  const rect = progressBarEl.value.getBoundingClientRect()
  const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  hoverProgress.value = p
  hoverTime.value = p * playerStore.duration
}

// === Volume Bar Drag Logic ===
function calcVolumeFromEvent(e: MouseEvent | TouchEvent): number {
  if (!volumeBarEl.value) return playerStore.volume
  const rect = volumeBarEl.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

function onVolumeDragStart(e: MouseEvent) {
  isVolumeDragging = true
  document.addEventListener('mousemove', onVolumeDragMove)
  document.addEventListener('mouseup', onVolumeDragEnd)
  updateVolume(calcVolumeFromEvent(e))
}

function onVolumeTouchStart(e: TouchEvent) {
  isVolumeDragging = true
  document.addEventListener('touchmove', onVolumeDragMove, { passive: false })
  document.addEventListener('touchend', onVolumeDragEnd)
  updateVolume(calcVolumeFromEvent(e))
}

function onVolumeDragMove(e: Event) {
  if (!isVolumeDragging) return
  e.preventDefault()
  updateVolume(calcVolumeFromEvent(e as MouseEvent | TouchEvent))
}

function onVolumeDragEnd(_?: Event) {
  isVolumeDragging = false
  document.removeEventListener('mousemove', onVolumeDragMove)
  document.removeEventListener('mouseup', onVolumeDragEnd)
  document.removeEventListener('touchmove', onVolumeDragMove)
  document.removeEventListener('touchend', onVolumeDragEnd)
}

function updateVolume(vol: number) {
  playerStore.setVolume(vol)
}

// 组件卸载时清理所有残留的拖拽事件监听器
onUnmounted(() => {
  if (isDragging) isDragging = false
  if (isVolumeDragging) isVolumeDragging = false
  document.removeEventListener('mousemove', onProgressDragMove)
  document.removeEventListener('mouseup', onProgressDragEnd)
  document.removeEventListener('touchmove', onProgressDragMove)
  document.removeEventListener('touchend', onProgressDragEnd)
  document.removeEventListener('mousemove', onVolumeDragMove)
  document.removeEventListener('mouseup', onVolumeDragEnd)
  document.removeEventListener('touchmove', onVolumeDragMove)
  document.removeEventListener('touchend', onVolumeDragEnd)
})
</script>

<style scoped>
@reference "tailwindcss";

/* ===== Root Variables ===== */
.player-full {
  font-family: var(--font-sans);
  color: #F0F0F5;
}

/* ===== Background Image ===== */
.bg-image {
  filter: blur(80px) saturate(1.5) brightness(0.4);
  transform: scale(1.1);
  opacity: 0.6;
  transition: opacity 0.8s ease;
}

/* ===== Ambient Glow Effect ===== */
.ambient-glow {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 95, 0.08) 0%, transparent 70%);
  pointer-events: none;
  transition: opacity 0.6s ease;
  opacity: 0;
}

.ambient-glow.active {
  opacity: 1;
  animation: ambientPulse 4s ease-in-out infinite alternate;
}

@keyframes ambientPulse {
  0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
}

/* ===== Header ===== */
.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

/* Playing indicator dot */
.playing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #FF5A5F;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.playing-dot.active {
  opacity: 1;
  animation: dotBlink 2s ease-in-out infinite;
}

@keyframes dotBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ===== Vinyl Container ===== */
.vinyl-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* External glow ring */
.vinyl-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 95, 0.15) 0%, rgba(255, 90, 95, 0.05) 40%, transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.vinyl-glow.active {
  opacity: 1;
  animation: glowPulse 3s ease-in-out infinite alternate;
}

@keyframes glowPulse {
  0% { transform: translate(-50%, -50%) scale(0.98); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(1.06); opacity: 1; }
}

/* Main Disc */
.vinyl-disc {
  position: relative;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 120px rgba(255, 90, 95, 0.05);
  /* 动画始终生效，通过 play-state 控制暂停，避免暂停时 transform 回弹 */
  animation: vinylSpin 20s linear infinite;
  animation-play-state: paused;
}

.vinyl-disc.spinning {
  animation-play-state: running;
}

@keyframes vinylSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.disc-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #13131C 0%, #1a1a28 100%);
}

/* Center hole assembly */
.disc-center-hole {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #09090B;
  box-shadow:
    inset 0 2px 8px rgba(0, 0, 0, 0.6),
    0 0 0 4px rgba(15, 15, 20, 0.9),
    0 0 0 5px rgba(255, 255, 255, 0.04);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disc-center-inner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a2a38 0%, #1a1a26 100%);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

/* Vinyl groove texture overlay */
.disc-grooves {
  position: absolute;
  inset: 32px;
  border-radius: 50%;
  background: repeating-radial-gradient(
    circle at center,
    transparent 0px,
    transparent 2px,
    rgba(255, 255, 255, 0.02) 2.5px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 2;
}

/* Bottom reflection */
.vinyl-reflection {
  position: absolute;
  bottom: -35px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 40px;
  background: radial-gradient(ellipse at center, rgba(255, 90, 95, 0.08), transparent 70%);
  filter: blur(12px);
  pointer-events: none;
  opacity: 0.6;
}

/* ===== Main Content Layout - 网易云风格 ===== */
.content-top {
  padding: 0;
  gap: 0;
}

.cover-section {
  flex: 0 0 45%;
  padding: 40px 60px;
}

.lyrics-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 60px 80px 40px 40px;
  position: relative;
}

/* 歌词区域标题 */
.lyrics-header {
  margin-bottom: 24px;
  text-align: center;
}

.lyrics-song-title {
  font-size: 24px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.lyrics-song-artist {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.lyrics-song-artist .artist-link {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;
}

.lyrics-song-artist .artist-link:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* 歌词显示区域 */
.lyrics-display-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ===== Bottom Controls Area ===== */
.controls-bottom {
  flex-shrink: 0;
  padding: 0 60px 32px;
  background: transparent;
}

.bottom-song-info {
  text-align: center;
  margin-bottom: 12px;
}

.bottom-song-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px 0;
}

.bottom-song-artist {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.bottom-song-artist .artist-link {
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  transition: color 0.2s ease;
}

.bottom-song-artist .artist-link:hover {
  color: rgba(255, 255, 255, 0.75);
}

/* ===== Progress Section ===== */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.time-current,
.time-duration {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
  min-width: 40px;
}

.time-current {
  text-align: right;
}

.time-duration {
  text-align: left;
}

.progress-track {
  position: relative;
  flex: 1;
  height: 3px;
  cursor: pointer;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  transition: transform 0.2s ease;
  transform-origin: center;
}

.progress-track:hover {
  transform: scaleY(1.33);
}

.progress-buffer {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
  width: 0%;
  pointer-events: none;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 2px;
  background: #FF5A5F;
  transition: width 0.08s linear;
  pointer-events: none;
}

.progress-track:active .progress-fill {
  transition: none;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  z-index: 2;
}

.progress-thumb.visible {
  transform: translate(-50%, -50%) scale(1);
}

.progress-tooltip {
  position: absolute;
  top: -32px;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: rgba(30, 30, 42, 0.95);
  backdrop-filter: blur(12px);
  white-space: nowrap;
  pointer-events: none;
  z-index: 3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.progress-tooltip.dragging {
  background: rgba(255, 90, 95, 0.95);
}

/* ===== Controls Bar ===== */
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.controls-right {
  justify-content: flex-end;
}

.controls-center {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.ctrl-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-btn-icon:hover {
  color: rgba(255, 255, 255, 0.9);
}

/* Main Play Button */
.play-btn-large {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #FF5A5F;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255, 90, 95, 0.3);
  transition: all 0.2s ease;
}

.play-btn-large:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(255, 90, 95, 0.4);
}

.play-btn-large:active {
  transform: scale(0.98);
}

.play-icon,
.pause-icon {
  width: 20px;
  height: 20px;
}

.text-coral {
  color: #FF5A5F;
}

/* ===== Volume Control ===== */
.volume-slider {
  position: relative;
  width: 100px;
  height: 3px;
  cursor: pointer;
  border-radius: 2px;
}

.volume-track-bg {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.volume-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 2px;
  background: #FF5A5F;
  transition: width 0.05s linear;
  pointer-events: none;
}

.volume-slider:active .volume-fill {
  transition: none;
}

.volume-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.05s linear;
  pointer-events: none;
  z-index: 2;
}

.volume-thumb.visible {
  transform: translate(-50%, -50%) scale(1);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Responsive: Mobile / Tablet ===== */
@media (max-width: 900px) {
  .content-top {
    flex-direction: column;
    padding: 16px 24px 0;
  }

  .cover-section,
  .lyrics-section {
    max-width: 100%;
    padding: 0;
  }

  .lyrics-section {
    margin-top: 20px;
    max-height: 40vh;
  }

  .controls-bottom {
    padding: 16px 24px 24px;
  }

  .vinyl-disc {
    width: 220px;
    height: 220px;
  }

  .vinyl-glow {
    width: 260px;
    height: 260px;
  }

  .ambient-glow {
    width: 400px;
    height: 400px;
  }
}

@media (min-width: 1400px) {
  .content-top {
    padding: 32px 80px 0;
  }

  .controls-bottom {
    padding: 24px 100px 40px;
  }
}

@media (max-width: 480px) {
  .vinyl-disc {
    width: 180px;
    height: 180px;
  }

  .vinyl-glow {
    width: 220px;
    height: 220px;
  }

  .disc-center-hole {
    width: 48px;
    height: 48px;
  }

  .play-btn-main {
    width: 3.25rem;
    height: 3.25rem;
  }

  .ctrl-btn {
    width: 2.5rem;
    height: 2.5rem;
  }

  .controls-bottom {
    padding: 12px 20px 20px;
  }

  .controls-bar {
    flex-direction: column;
    gap: 12px;
  }

  .controls-left,
  .controls-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
