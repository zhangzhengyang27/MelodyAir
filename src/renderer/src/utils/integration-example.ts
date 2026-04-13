/**
 * MelodyAir 组件使用示例
 *
 * 本文件展示了如何将 YesPlayMusic 的优秀功能集成到 MelodyAir 项目中
 */

// ==================== 1. 播放器 Store 使用 ====================

// import { usePlayerStore } from '@/stores/player'
//
// const playerStore = usePlayerStore()
//
// // 设置播放列表并播放
// playerStore.setPlaylist(songsArray, 0)
//
// // 添加歌曲到播放列表
// playerStore.addToPlaylist(singleSong)
//
// // 切换播放模式（顺序 -> 列表循环 -> 单曲循环 -> 随机 -> 倒序）
// playerStore.togglePlayMode()
//
// // 添加到"下一首播放"
// playerStore.addToPlayNext(song)
//
// // 私人FM模式
// await playerStore.enablePersonalFM(fmTrack, nextTrack)
// playerStore.disablePersonalFM()
//
// // 音量控制
// playerStore.setVolume(0.5)        // 设置音量 0-1
// playerStore.toggleMute()          // 切换静音

// ==================== 2. 缓存系统使用 ====================

// import { cacheManager } from '@/utils/db'
//
// // 缓存音频源数据
// const audioBuffer = await fetch(songUrl).then(res => res.arrayBuffer())
// await cacheManager.cacheTrackSource(song.id, audioBuffer)
//
// // 获取缓存的音频源
// const cachedAudio = await cacheManager.getTrackSource(song.id)
// if (cachedAudio) {
//   const blobUrl = arrayBufferToBlobUrl(cachedAudio)
//   player.play(blobUrl)
// }
//
// // 缓存歌词
// await cacheManager.cacheLyric(song.id, lyricText, translationText)
//
// // 获取缓存的歌曲详情
// const detail = await cacheManager.getTrackDetail(song.id)

// ==================== 3. 歌词解析使用 ====================

// import { parseLyric, mergeLyricsWithTranslation, findCurrentLyricIndex } from '@/utils/lyric'
//
// // 解析 LRC 格式歌词
// const lyrics = parseLyric(lrcText)
// // 返回: [{ time: 12.34, text: '歌词内容' }, ...]
//
// // 合并翻译歌词
// const merged = mergeLyricsWithTranslation(lyrics, translationLRC)
// // 返回: [{ time: 12.34, text: '原文', translatedText: '译文' }, ...]
//
// // 查找当前应该高亮的行
// const currentIndex = findCurrentLyricIndex(lyrics, currentTime)

// ==================== 4. 歌曲列表组件使用 ====================

// <!-- TrackList.vue -->
// <template>
//   <TrackList
//     :songs="playlist"
//     :current-song-id="playerStore.currentSong?.id"
//     :is-playing="playerStore.playing"
//     @play="handlePlay"
//     @add-to-next="handleAddToNext"
//   />
// </template>
//
// function handlePlay(song: Song, index: number): void {
//   playerStore.setPlaylist(playlist, index)
// }

// ==================== 5. 歌词面板使用 ====================

// <!-- LyricsPanel.vue -->
// <template>
//   <LyricsPanel
//     :lyrics="parsedLyrics"
//     :current-time="playerStore.currentTime"
//     :show-translation="settings.showTranslation"
//     :background-url="currentSong?.album?.picUrl"
//     :background-type="settings.lyricsBackground"
//     :font-size="settings.lyricFontSize"
//     @seek="(time) => playerStore.seek(time)"
//   />
// </template>

// ==================== 6. 播放器 UI 组件组合 ====================

// <!-- PlayerBar.vue (底部播放栏) -->
// <template>
//   <div class="player-bar">
//     <!-- 歌曲信息 -->
//     <div class="song-info">
//       <img :src="currentSong?.album.picUrl" />
//       <div>
//         <span>{{ currentSong?.name }}</span>
//         <span>{{ currentSong?.artists?.[0]?.name }}</span>
//       </div>
//     </div>
//
//     <!-- 播放控制 + 进度条 -->
//     <div class="controls">
//       <button @click="playPrev">⏮</button>
//       <button @click="togglePlay">{{ playing ? '⏸' : '▶' }}</button>
//       <button @click="playNext">⏭</button>
//
//       <ProgressBar
//         :progress="playerStore.progress"
//         :current-time="playerStore.currentTime"
//         :duration="playerStore.duration"
//         @seek="(time) => playerStore.seek(time)"
//       />
//     </div>
//
//     <!-- 音量 + 额外控制 -->
//     <div class="extra-controls">
//       <VolumeControl
//         :volume="playerStore.volume"
//         :muted="playerStore.muted"
//         @update:volume="playerStore.setVolume"
//         @update:muted="playerStore.toggleMute"
//       />
//       <button @click="showQueue = true">📋</button>
//       <button @click="showLyrics = true">🎤</button>
//     </div>
//   </div>
//
//   <!-- 播放队列面板 -->
//   <PlayQueue
//     :visible="showQueue"
//     :playlist="playerStore.playlist"
//     :current-index="playerStore.currentIndex"
//     :play-next-list="playerStore.playNextList"
//     @close="showQueue = false"
//     @play="(s, i) => playerStore.setPlaylist(playerStore.playlist, i)"
//     @remove="(i) => playerStore.removeFromPlaylist(i)"
//     @clear-all="playerStore.clearPlaylist"
//   />
// </template>

// ==================== 7. Electron IPC 集成示例 ====================
//
// // 在 App.vue 或主布局组件中初始化：
//
// import { usePlayerStore } from '@/stores/player'
//
// const playerStore = usePlayerStore()
//
// onMounted(() => {
//   // 监听来自主进程的播放操作（全局快捷键、托盘菜单等）
//   if (window.electronAPI?.onPlayerAction) {
//     window.electronAPI.onPlayerAction((action) => {
//       switch (action) {
//         case 'toggle':
//           playerStore.togglePlaying()
//           break
//         case 'next':
//           playerStore.playNext()
//           break
//         case 'prev':
//           playerStore.playPrev()
//           break
//       }
//     })
//   }
//
//   // 监听播放状态变化，同步到主进程（托盘、任务栏等）
//   watch(
//     () => [playerStore.playing, playerStore.currentSong],
//     ([playing, song]) => {
//       if (window.electronAPI?.sendIpcEvent && song) {
//         window.electronAPI.sendIpcEvent('player:updatePlayState', playing)
//       }
//     },
//     { deep: true }
//   )
// })

export {}
