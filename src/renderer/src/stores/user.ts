import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  loginCellphone,
  loginQrCodeKey,
  loginQrCodeCheck,
  getLoginStatus,
  refreshCookie,
  logout as apiLogout
} from '@/api/auth'
import { getUserPlaylist } from '@/api/user'
import { getPlaylistDetail } from '@/api/playlist'
import { getLikeList } from '@/api/user'

export interface UserProfile {
  userId: number
  nickname: string
  avatarUrl: string
  backgroundUrl?: string
  vipType?: number
}

export interface Playlist {
  id: number
  name: string
  coverImgUrl: string
  trackCount: number
  playCount: number
}

export type LoginMode = 'account' | null

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(null)
  const playlists = ref<Playlist[]>([])
  const likedSongIds = ref<number[]>([])
  const cookie = ref('')
  const loginMode = ref<LoginMode>(null)
  const likedSongPlaylistId = ref<number>(0)
  const lastRefreshCookieDate = ref<number>(0)

  const loggedIn = computed(() => !!profile.value)

  // ★ YPM 风格的 cookie 判断：MUSIC_U 存在即为账号登录
  const isAccountLoggedIn = computed(() => {
    return loginMode.value === 'account' && !!cookie.value
  })

  function isLiked(songId: number): boolean {
    return likedSongIds.value.includes(songId)
  }

  function toggleLike(songId: number) {
    const idx = likedSongIds.value.indexOf(songId)
    if (idx >= 0) {
      likedSongIds.value.splice(idx, 1)
    } else {
      likedSongIds.value.push(songId)
    }
  }

  function setProfile(p: UserProfile | null) {
    profile.value = p
  }

  // ==================== Cookie 处理（参照 YPM setCookies）====================

  /**
   * 将 cookie 字符串拆分写入 document.cookie 和 localStorage
   * 参照 YPM utils/auth.js: setCookies()
   * YPM 的 cookie 格式：key=value;;key=value;;... （用 ;; 分隔）
   * 但 NCM API 返回的 cookie 可能也用 ; 分隔，这里兼容两种
   */
  function setCookies(cookieStr: string): void {
    if (!cookieStr) return
    // 兼容 ;; 和 ; 分隔
    const cookies = cookieStr.split(/;;|;(?![a-zA-Z])/)
    for (const c of cookies) {
      const trimmed = c.trim()
      if (!trimmed) continue
      try {
        document.cookie = trimmed
        const cookieKeyValue = trimmed.split(';')[0]!.split('=')
        if (cookieKeyValue[0] && cookieKeyValue[1] !== undefined) {
          localStorage.setItem(`cookie-${cookieKeyValue[0].trim()}`, cookieKeyValue[1])
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * 从 localStorage 读取单个 cookie 值
   */
  function getCookie(key: string): string | null {
    // 先从 document.cookie 读取
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`))
    if (match?.[1]) return match[1]
    // fallback 到 localStorage
    return localStorage.getItem(`cookie-${key}`)
  }

  /**
   * 移除单个 cookie
   */
  function removeCookie(key: string): void {
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    localStorage.removeItem(`cookie-${key}`)
  }

  /**
   * 是否已登录（通过 MUSIC_U cookie 判断）
   */
  function isLoggedIn(): boolean {
    return getCookie('MUSIC_U') !== null
  }

  // ==================== 登录流程 =====================

  async function checkLoginStatus() {
    try {
      const res: any = await getLoginStatus()
      if (res?.data?.profile) {
        profile.value = {
          userId: res.data.profile.userId,
          nickname: res.data.profile.nickname,
          avatarUrl: res.data.profile.avatarUrl,
          backgroundUrl: res.data.profile.backgroundUrl,
          vipType: res.data.profile.vipType
        }
        fetchUserPlaylists()
        fetchLikedSongIds()
      }
    } catch {
      // Not logged in
    }
  }

  /**
   * 获取用户资料（参照 YPM fetchUserProfile）
   */
  async function fetchUserProfile(): Promise<void> {
    try {
      const res: any = await getLoginStatus()
      if (res?.code === 200 && res?.profile) {
        profile.value = {
          userId: res.profile.userId,
          nickname: res.profile.nickname,
          avatarUrl: res.profile.avatarUrl,
          backgroundUrl: res.profile.backgroundUrl,
          vipType: res.profile.vipType
        }
      } else if (res?.data?.profile) {
        profile.value = {
          userId: res.data.profile.userId,
          nickname: res.data.profile.nickname,
          avatarUrl: res.data.profile.avatarUrl,
          backgroundUrl: res.data.profile.backgroundUrl,
          vipType: res.data.profile.vipType
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * 获取用户歌单（参照 YPM fetchLikedPlaylist）
   */
  async function fetchLikedPlaylist(): Promise<void> {
    if (!profile.value) return
    try {
      const res: any = await getUserPlaylist(profile.value.userId)
      if (res?.playlist) {
        playlists.value = res.playlist.map((p: any) => ({
          id: p.id,
          name: p.name,
          coverImgUrl: p.coverImgUrl,
          trackCount: p.trackCount,
          playCount: p.playCount
        }))
        // 更新"喜欢的歌曲"歌单 ID（第一个歌单即为"我喜欢的音乐"）
        if (res.playlist[0]) {
          likedSongPlaylistId.value = res.playlist[0].id
        }
      }
    } catch {
      // Silent
    }
  }

  /**
   * 手机号登录
   */
  async function loginByPhone(phone: string, captcha: string) {
    try {
      const res: any = await loginCellphone(phone, captcha)
      if (res?.cookie || res?.code === 200) {
        if (res.cookie) {
          handleLoginSuccess(res.cookie)
        }
        await fetchUserProfile()
        await fetchLikedPlaylist()
        return { success: true }
      }
      return { success: false, message: res?.message || '登录失败' }
    } catch (e: any) {
      return { success: false, message: e?.message || '登录失败' }
    }
  }

  /**
   * 扫码登录 - 获取二维码 Key（第一步）
   */
  async function getQrCodeKey(): Promise<string | null> {
    try {
      const res: any = await loginQrCodeKey()
      if (res?.code === 200) {
        return res.data?.unikey || null
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * 扫码登录 - 检查扫码状态（轮询用）
   */
  async function checkQrCodeStatus(key: string): Promise<{ code: number; cookie?: string; message?: string }> {
    try {
      const res: any = await loginQrCodeCheck(key)
      return {
        code: res?.code ?? -1,
        cookie: res?.cookie,
        message: res?.message || res?.msg
      }
    } catch {
      return { code: -1 }
    }
  }

  /**
   * 登录成功的统一处理（参照 YPM handleLoginResponse）
   */
  function handleLoginSuccess(cookieStr: string): void {
    // 1. 清理 HTTPOnly 标记（Electron 端不需要）
    const cleanCookie = cookieStr.replaceAll(' HTTPOnly', '')
    // 2. 保存 cookie（YPM 风格：拆分写入）
    setCookies(cleanCookie)
    // 3. 同时保存整串 cookie 到 Pinia（供持久化）
    cookie.value = cleanCookie
    // 4. 标记登录模式
    loginMode.value = 'account'
  }

  /**
   * 刷新 Cookie（参照 YPM dailyTask）
   */
  async function refreshLoginCookie(): Promise<void> {
    if (!isAccountLoggedIn.value) return
    const today = new Date().getDate()
    if (lastRefreshCookieDate.value === today) return

    try {
      await refreshCookie()
      lastRefreshCookieDate.value = today
    } catch {
      // Ignore
    }
  }

  async function fetchUserPlaylists() {
    if (!profile.value) return
    try {
      const res: any = await getUserPlaylist(profile.value.userId)
      playlists.value = (res?.playlist || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        coverImgUrl: p.coverImgUrl,
        trackCount: p.trackCount,
        playCount: p.playCount
      }))
      // 更新"喜欢的歌曲"歌单 ID
      if (res?.playlist?.[0]) {
        likedSongPlaylistId.value = res.playlist[0].id
      }
    } catch {
      // Silent fail
    }
  }

  async function fetchLikedSongIds() {
    if (!profile.value) return
    try {
      const res: any = await getLikeList(profile.value.userId)
      const ids = res?.ids || []
      likedSongIds.value = ids
    } catch {
      // Silent fail
    }
  }

  /**
   * 退出登录（参照 YPM doLogout）
   */
  async function logout() {
    try {
      await apiLogout()
    } catch {
      // Silent
    }
    removeCookie('MUSIC_U')
    removeCookie('__csrf')
    profile.value = null
    playlists.value = []
    likedSongIds.value = []
    cookie.value = ''
    loginMode.value = null
    likedSongPlaylistId.value = 0
  }

  return {
    profile,
    playlists,
    likedSongIds,
    cookie,
    loginMode,
    likedSongPlaylistId,
    lastRefreshCookieDate,
    loggedIn,
    isAccountLoggedIn,
    isLiked,
    toggleLike,
    setProfile,
    setCookies,
    getCookie,
    removeCookie,
    isLoggedIn,
    checkLoginStatus,
    fetchUserProfile,
    fetchLikedPlaylist,
    loginByPhone,
    getQrCodeKey,
    checkQrCodeStatus,
    handleLoginSuccess,
    refreshLoginCookie,
    fetchUserPlaylists,
    fetchLikedSongIds,
    logout
  }
}, {
  persist: {
    pick: ['profile', 'cookie', 'likedSongIds', 'loginMode', 'likedSongPlaylistId', 'lastRefreshCookieDate']
  }
})
