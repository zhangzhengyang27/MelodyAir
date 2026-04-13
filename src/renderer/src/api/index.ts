import axios from 'axios'
import { useSettingsStore } from '@/stores/settings'

const request = axios.create({
  timeout: 15000,
  withCredentials: true,
  // Will be set dynamically in request interceptor
})

// Dynamic base URL from settings
request.interceptors.request.use(
  (config) => {
    const settingsStore = useSettingsStore()
    if (settingsStore.apiBase) {
      config.baseURL = settingsStore.apiBase
    }
    // Inject cookie for auth if available
    const userCookie = localStorage.getItem('user')
    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie)
        if (userData?.cookie) {
          config.headers.Cookie = userData.cookie
        }
      } catch {
        // Ignore parse errors
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error.message)
    return Promise.reject(error)
  }
)

export default request
