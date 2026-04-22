import { computed } from 'vue'
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

      if (payload.onClickRoute) {
        notification.onclick = () => {
          window.focus()
          window.location.hash = payload.onClickRoute
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
