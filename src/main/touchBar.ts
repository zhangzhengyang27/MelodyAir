import { TouchBar, BrowserWindow } from 'electron'

// Touch Bar 相关全局变量
let touchBar: TouchBar | null = null
let touchBarLikeButton: Electron.TouchBarButton | null = null
let touchBarPlayPauseButton: Electron.TouchBarButton | null = null
let touchBarPrevButton: Electron.TouchBarButton | null = null
let touchBarNextButton: Electron.TouchBarButton | null = null
let touchBarLyricLabel: Electron.TouchBarLabel | null = null
let mainWindow: BrowserWindow | null = null

function sendPlayerAction(action: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player:action', action)
  }
}

// 设置 Touch Bar（仅 macOS）
export function createTouchBar(window: BrowserWindow): TouchBar | null {
  if (process.platform !== 'darwin' || !TouchBar) return null

  console.log('[TouchBar] createTouchBar called')
  mainWindow = window

  const { TouchBarButton, TouchBarLabel, TouchBarSpacer } = TouchBar

  // 创建上一首按钮
  touchBarPrevButton = new TouchBarButton({
    label: '⏮',
    click: () => {
      console.log('[TouchBar] Previous button clicked')
      sendPlayerAction('prev')
    }
  })

  // 创建播放/暂停按钮
  touchBarPlayPauseButton = new TouchBarButton({
    label: '▶️',
    click: () => {
      console.log('[TouchBar] Play/Pause button clicked')
      sendPlayerAction('toggle')
    }
  })

  // 创建下一首按钮
  touchBarNextButton = new TouchBarButton({
    label: '⏭',
    click: () => {
      console.log('[TouchBar] Next button clicked')
      sendPlayerAction('next')
    }
  })

  // 创建收藏按钮
  touchBarLikeButton = new TouchBarButton({
    label: '🤍',
    click: () => {
      console.log('[TouchBar] Like button clicked')
      sendPlayerAction('toggleLike')
    }
  })

  // 创建歌词标签（纯文本效果，无按钮样式）
  touchBarLyricLabel = new TouchBarLabel({
    label: '     暂无歌词     ',
    textColor: '#FFFFFF'
  })

  // 创建 Touch Bar
  touchBar = new TouchBar({
    items: [
      touchBarPrevButton,
      touchBarPlayPauseButton,
      touchBarNextButton,
      touchBarLikeButton,
      new TouchBarSpacer({ size: 'flexible' }),
      touchBarLyricLabel,
      new TouchBarSpacer({ size: 'flexible' })
    ]
  })

  console.log('[TouchBar] TouchBar created')
  window.setTouchBar(touchBar)
  return touchBar
}

// 更新 Touch Bar 的歌词
export function updateTouchBarLyrics(lyric: string, hasLyrics: boolean): void {
  if (process.platform !== 'darwin' || !touchBarLyricLabel) return

  console.log('[TouchBar] updateTouchBarLyrics called, hasLyrics:', hasLyrics, 'text:', lyric)

  const displayText = hasLyrics ? (lyric || '♪') : '暂无歌词'

  // 限制文本长度以避免 Touch Bar 显示问题
  const maxLength = 40
  const truncatedText = displayText.length > maxLength
    ? displayText.substring(0, maxLength - 3) + '...'
    : displayText

  // 在文本前后添加空格，让歌词更突出
  touchBarLyricLabel.label = `     ${truncatedText}     `
}

// 更新播放/暂停按钮
export function updateTouchBarPlayState(isPlaying: boolean): void {
  if (process.platform !== 'darwin' || !touchBarPlayPauseButton) return

  console.log('[TouchBar] updateTouchBarPlayState called, isPlaying:', isPlaying)
  touchBarPlayPauseButton.label = isPlaying ? '⏸' : '▶️'
}

// 更新收藏按钮
export function updateTouchBarLikeState(isLiked: boolean): void {
  if (process.platform !== 'darwin' || !touchBarLikeButton) return

  console.log('[TouchBar] updateTouchBarLikeState called, isLiked:', isLiked)
  touchBarLikeButton.label = isLiked ? '❤️' : '🤍'
}

export function getTouchBar(): TouchBar | null {
  return touchBar
}
