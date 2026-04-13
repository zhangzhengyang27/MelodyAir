import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export function useTheme() {
  const settingsStore = useSettingsStore()
  const isDark = ref(false)

  let mediaQuery: MediaQueryList | null = null
  const onSystemThemeChange = () => {
    if (settingsStore.theme === 'system') {
      applyTheme()
    }
  }

  function applyTheme() {
    const theme = settingsStore.theme
    if (theme === 'system') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark.value = theme === 'dark'
    }
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function toggleTheme() {
    if (isDark.value) {
      settingsStore.setTheme('light')
    } else {
      settingsStore.setTheme('dark')
    }
    applyTheme()
  }

  function setSystemTheme() {
    settingsStore.setTheme('system')
    applyTheme()
  }

  watch(() => settingsStore.theme, applyTheme)

  onMounted(() => {
    applyTheme()
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemThemeChange)
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', onSystemThemeChange)
    }
  })

  return { isDark, toggleTheme, setSystemTheme, applyTheme }
}
