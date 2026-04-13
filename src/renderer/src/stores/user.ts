import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  loginCellphone,
  loginEmail,
  loginAnonimous,
  loginQrCodeKey,
  loginQrCodeCreate,
  loginQrCodeCheck,
  getLoginStatus,
  refreshCookie,
  logout as apiLogout
} from '@/api/auth'
import { getUserPlaylist, getUserAccount, getLikeList, likeSong, likeSongV2 } from '@/api/user'
import { getPlaylistDetail } from '@/api/playlist'

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

  // ==================== Cookie 处理 ====================

  function setCookies(cookieStr: string): void {
    if (!cookieStr) return
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

  function getCookie(key: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`))
    if (match?.[1]) return match[1]
    return localStorage.getItem(`cookie-${key}`)
  }

  function removeCookie(key: string): void {
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    localStorage.removeItem(`cookie-${key}`)
  }

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
   * 获取用户账号信息（/user/account）
   */
  async function fetchUserAccount(): Promise<any> {
    try {
      const res: any = await getUserAccount()
      return res
    } catch {
      return null
    }
  }

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
        if (res.playlist[0]) {
          likedSongPlaylistId.value = res.playlist[0].id
        }
      }
    } catch {
      // Silent
    }
  }

  /**
   * 手机号+验证码登录
   */
  async function loginByPhone(phone: string, captcha: string) {
    try {
      const res: any = await loginCellphone({ phone, captcha })
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
      return { success: false, message: e?.response?.data?.message || e?.message || '登录失败' }
    }
  }

  /**
   * 手机号+密码登录
   */
  async function loginByPassword(phone: string, password: string, countrycode?: string) {
    try {
      const res: any = await loginCellphone({ phone, password, countrycode })
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
      return { success: false, message: e?.response?.data?.message || e?.message || '登录失败' }
    }
  }

  /**
   * 邮箱登录
   */
  async function loginByEmail(email: string, password: string) {
    try {
      const res: any = await loginEmail(email, password)
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
      return { success: false, message: e?.response?.data?.message || e?.message || '登录失败' }
    }
  }

  /**
   * 游客登录
   */
  async function loginAsAnonimous() {
    try {
      const res: any = await loginAnonimous()
      if (res?.cookie || res?.code === 200) {
        if (res.cookie) {
          handleLoginSuccess(res.cookie)
        }
        return { success: true }
      }
      return { success: false, message: res?.message || '游客登录失败' }
    } catch (e: any) {
      return { success: false, message: e?.message || '游客登录失败' }
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
   * 扫码登录 - 生成二维码图片（第二步）
   */
  async function getQrCodeImage(key: string): Promise<string | null> {
    try {
      const res: any = await loginQrCodeCreate(key, true)
      if (res?.code === 200) {
        return res.data?.qrimg || null
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
   * 登录成功的统一处理
   */
  function handleLoginSuccess(cookieStr: string): void {
    const cleanCookie = cookieStr.replaceAll(' HTTPOnly', '')
    setCookies(cleanCookie)
    cookie.value = cleanCookie
    loginMode.value = 'account'
  }

  /**
   * 直接导入 MUSIC_U Cookie（从浏览器复制）
   * 导入后自动获取用户信息（获取失败不影响登录状态）
   */
  async function importMusicUCookie(musicUValue: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 写入 localStorage（api/index.ts 拦截器从这里读取）
      localStorage.setItem('cookie-MUSIC_U', musicUValue)
      // ★ 文档要求：cookie 需要传入 os=pc 保证返回正常码率的 url
      localStorage.setItem('cookie-os', 'pc')
      // 同步到 cookie 状态
      cookie.value = `MUSIC_U=${musicUValue}`
      loginMode.value = 'account'

      // 尝试多种方式获取用户信息
      await fetchUserProfile()
      if (!profile.value) {
        // 备用：尝试 /user/account 接口
        const accountRes: any = await fetchUserAccount()
        if (accountRes?.account) {
          const acc = accountRes.account
          profile.value = {
            userId: acc.id,
            nickname: acc.userName || acc.nickname || '',
            avatarUrl: accountRes.profile?.avatarUrl || '',
            backgroundUrl: '',
            vipType: accountRes.profile?.vipType || 0
          }
        }
      }
      if (profile.value) {
        await fetchLikedPlaylist()
        return { success: true, message: `登录成功：${profile.value.nickname}` }
      }
      return { success: true, message: 'Cookie 已导入（用户信息将在下次请求时刷新）' }
    } catch (e: any) {
      console.warn('[User] importMusicUCookie 异常:', e.message)
      return { success: true, message: 'Cookie 已导入' }
    }
  }

  /**
   * 刷新 Cookie
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
   * 喜欢歌曲（旧版 /like）
   */
  async function likeSongById(songId: number, like = true): Promise<boolean> {
    try {
      const res: any = await likeSong(songId, like)
      if (res?.code === 200) {
        toggleLike(songId)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * 退出登录
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
    fetchUserAccount,
    fetchLikedPlaylist,
    loginByPhone,
    loginByPassword,
    loginByEmail,
    loginAsAnonimous,
    getQrCodeKey,
    getQrCodeImage,
    checkQrCodeStatus,
    handleLoginSuccess,
    importMusicUCookie,
    refreshLoginCookie,
    fetchUserPlaylists,
    fetchLikedSongIds,
    likeSongById,
    logout
  }
}, {
  persist: {
    pick: ['profile', 'cookie', 'likedSongIds', 'loginMode', 'likedSongPlaylistId', 'lastRefreshCookieDate']
  }
})
