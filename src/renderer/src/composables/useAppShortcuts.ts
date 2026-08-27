import { onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'

/**
 * 应用内键盘快捷键
 * - Space: 播放/暂停
 * - ← / →: 上一首 / 下一首
 * - ↑ / ↓: 音量增 / 减
 * - M: 静音切换
 *
 * 注意：在输入框（input/textarea/contenteditable）中不触发
 */
export function useAppShortcuts() {
  const playerStore = usePlayerStore()

  function isTypingTarget(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement
    if (!target) return false
    const tag = target.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
  }

  function handleKeyDown(e: KeyboardEvent) {
    // 输入框中不触发
    if (isTypingTarget(e)) return
    // 有修饰键时不触发（避免与浏览器/系统快捷键冲突）
    if (e.ctrlKey || e.metaKey || e.altKey) return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        playerStore.togglePlaying()
        break
      case 'ArrowLeft':
        e.preventDefault()
        playerStore.playPrev()
        break
      case 'ArrowRight':
        e.preventDefault()
        playerStore.playNext()
        break
      case 'ArrowUp':
        e.preventDefault()
        playerStore.setVolume(Math.min(1, playerStore.volume + 0.05))
        break
      case 'ArrowDown':
        e.preventDefault()
        playerStore.setVolume(Math.max(0, playerStore.volume - 0.05))
        break
      case 'KeyM':
        e.preventDefault()
        playerStore.toggleMute()
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
}
