import { computed } from 'vue'
import router from '@/router'
import { useSettingsStore } from '@/stores/settings'
import { logger } from '@/utils/logger'

export interface DesktopNotificationPayload {
  title: string
  body: string
  tag?: string
  silent?: boolean
  icon?: string
  onClickRoute?: string
}

export function useDesktopNotification() {
  const settingsStore = useSettingsStore()

  const isSupported = computed(() => typeof window !== 'undefined' && 'Notification' in window)

  async function ensurePermission(): Promise<NotificationPermission> {
    if (!isSupported.value) return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    return await Notification.requestPermission()
  }

  async function notify(payload: DesktopNotificationPayload): Promise<boolean> {
    if (!settingsStore.enableDesktopNotification) return false
    if (!isSupported.value) return false

    const permission = await ensurePermission()
    if (permission !== 'granted') {
      logger.warn('notification', 'Notification permission not granted')
      return false
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        silent: payload.silent ?? false,
        icon: payload.icon,
      })

      const onClickRoute = payload.onClickRoute
      if (onClickRoute) {
        notification.onclick = () => {
          window.focus()
          // 用 router 跳转而非改 hash：Web 端是 history 模式（非 hash 路由），
          // 直接写 location.hash 不会触发 vue-router 导航，只会污染地址栏
          void router.push(onClickRoute)
        }
      }

      return true
    } catch (error) {
      logger.error('notification', 'Failed to show desktop notification:', error)
      return false
    }
  }

  return {
    isSupported,
    notify,
  }
}
