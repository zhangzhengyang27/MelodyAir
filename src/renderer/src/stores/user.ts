import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  loginCellphone,
  loginAnonimous,
  getLoginStatus,
  refreshCookie,
  logout as apiLogout
} from '@/api/auth'
import { getUserPlaylist, getUserAccount, getLikeList, likeSong } from '@/api/user'
import { getPlaylistDetail, subscribePlaylist, createPlaylist, deletePlaylist, playlistTracks, updatePlaylist, getPlaylistDetailDynamic } from '@/api/playlist'
import { subAlbum, getAlbumSublist, getAlbumDetailDynamic } from '@/api/album'
import { subArtist, getArtistSublist, getArtistDetailDynamic } from '@/api/artist'
import { subMv, getMvSublist, getMvDetail } from '@/api/mv'
import { userDefaults, migrateWithDefaults } from './defaults'
import { mapPlaylist, mapUserProfile } from '@/utils/mappers'
import { parseAndStoreCookies } from '@/api/cookie'
import { logger } from '@/utils/logger'
import { throttledPersistStorage } from '@/utils/persistStorage'
import type { UserProfile, Playlist } from '@/types/api'
import type {
  LoginResponse,
  LoginStatusResponse,
} from '@/types/api'

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
    const wasLiked = likedSongIds.value.includes(songId)
    // 乐观更新本地状态
    if (wasLiked) {
      const idx = likedSongIds.value.indexOf(songId)
      if (idx >= 0) likedSongIds.value.splice(idx, 1)
    } else {
      likedSongIds.value.push(songId)
    }

    // Update Touch Bar / 托盘 like state
    if (window.electronAPI?.sendIpcEvent) {
      window.electronAPI.sendIpcEvent('player:updateLikeState', !wasLiked)
    }

    // 异步同步到服务器（未登录时跳过）
    if (isAccountLoggedIn.value) {
      likeSong(songId, !wasLiked).catch((e) => {
        logger.warn('User', `toggleLike 同步失败 songId=${songId}, like=${!wasLiked}`, e)
        // 回滚本地状态
        if (wasLiked) {
          if (!likedSongIds.value.includes(songId)) likedSongIds.value.push(songId)
        } else {
          const idx = likedSongIds.value.indexOf(songId)
          if (idx >= 0) likedSongIds.value.splice(idx, 1)
        }
        if (window.electronAPI?.sendIpcEvent) {
          window.electronAPI.sendIpcEvent('player:updateLikeState', wasLiked)
        }
      })
    }
  }

  function setProfile(p: UserProfile | null) {
    profile.value = p
  }

  // ==================== Cookie 处理 ====================

  function setCookies(cookieStr: string): void {
    if (!cookieStr) return
    parseAndStoreCookies(cookieStr)
  }

  // ==================== 登录流程 ====================

  async function checkLoginStatus() {
    try {
      const res: LoginStatusResponse = await getLoginStatus()
      // /login/status 是少数带 data 包裹的接口：{ code, data: { account, profile } }
      const remoteProfile = res?.data?.profile
      if (remoteProfile) {
        profile.value = mapUserProfile(remoteProfile as unknown as Record<string, unknown>)
        fetchUserPlaylists()
        fetchLikedSongIds()
      } else if (profile.value) {
        // 原本已登录但服务端返回空 profile，说明 cookie 已过期，清除本地登录态
        logger.warn('User', '登录态已过期（checkLoginStatus 返回空 profile），清除本地用户信息')
        clearLocalAuth()
      }
    } catch {
      // 网络错误等情况不清除，避免误判
    }
  }

  async function fetchUserProfile(): Promise<void> {
    try {
      const res: LoginStatusResponse = await getLoginStatus()
      const remoteProfile = res?.data?.profile
      if (remoteProfile) {
        profile.value = mapUserProfile(remoteProfile as unknown as Record<string, unknown>)
      } else if (profile.value) {
        // 原本已登录但验证后无 profile，说明 cookie 已过期
        logger.warn('User', '登录态已过期（fetchUserProfile 返回空 profile），清除本地用户信息')
        clearLocalAuth()
      }
    } catch {
      // 网络错误不清除，避免误判
    }
  }

  /**
   * 清除本地登录态（profile / cookie / 歌单 / 喜欢列表等），不调用后端登出接口。
   * 用于检测到 cookie 过期时，避免页面继续显示已过期的用户头像和昵称。
   */
  function clearLocalAuth() {
    profile.value = null
    playlists.value = []
    likedSongIds.value = []
    cookie.value = ''
    loginMode.value = null
    likedSongPlaylistId.value = 0
    localStorage.removeItem('cookie-MUSIC_U')
    localStorage.removeItem('cookie-__csrf')
  }

  /**
   * 获取用户账号信息（/user/account）
   */
  async function fetchUserAccount() {
    try {
      return await getUserAccount()
    } catch {
      return null
    }
  }

  async function fetchLikedPlaylist(): Promise<void> {
    if (!profile.value) return
    try {
      const res = await getUserPlaylist(profile.value.userId)
      if (res?.playlist) {
        playlists.value = res.playlist.map(p => mapPlaylist(p as unknown as Record<string, unknown>))
        if (res.playlist[0]) {
          likedSongPlaylistId.value = res.playlist[0].id
        }
      }
    } catch {
      // 静默失败
    }
  }

  /**
   * 手机号+验证码登录
   */
  async function loginByPhone(phone: string, captcha: string) {
    try {
      const res: LoginResponse = await loginCellphone({ phone, captcha })
      if (res?.cookie || res?.code === 200) {
        if (res.cookie) handleLoginSuccess(res.cookie)
        await fetchUserProfile()
        await fetchLikedPlaylist()
        return { success: true }
      }
      return { success: false, message: res?.message || '登录失败' }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { success: false, message: msg || '登录失败' }
    }
  }

  /**
   * 游客登录
   */
  async function loginAsAnonimous() {
    try {
      const res: LoginResponse = await loginAnonimous()
      if (res?.cookie || res?.code === 200) {
        if (res.cookie) handleLoginSuccess(res.cookie)
        return { success: true }
      }
      return { success: false, message: res?.message || '游客登录失败' }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { success: false, message: msg || '游客登录失败' }
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
   */
  async function importMusicUCookie(musicUValue: string): Promise<{ success: boolean; message?: string }> {
    try {
      localStorage.setItem('cookie-MUSIC_U', musicUValue)
      localStorage.setItem('cookie-os', 'pc')
      cookie.value = `MUSIC_U=${musicUValue}`
      loginMode.value = 'account'

      await fetchUserProfile()
      if (!profile.value) {
        const accountRes = await fetchUserAccount()
        if (accountRes?.account) {
          profile.value = mapUserProfile(accountRes.account as unknown as Record<string, unknown>)
        }
      }
      if (profile.value) {
        await fetchLikedPlaylist()
        return { success: true, message: `登录成功：${profile.value.nickname}` }
      }
      return { success: true, message: 'Cookie 已导入（用户信息将在下次请求时刷新）' }
    } catch (e: unknown) {
      logger.warn('User', `importMusicUCookie 异常: ${e instanceof Error ? e.message : e}`)
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
      // 忽略
    }
  }

  async function fetchUserPlaylists() {
    if (!profile.value) return
    try {
      const res = await getUserPlaylist(profile.value.userId)
      playlists.value = (res?.playlist || []).map(p =>
        mapPlaylist(p as unknown as Record<string, unknown>)
      )
      if (res?.playlist?.[0]) {
        likedSongPlaylistId.value = res.playlist[0].id
      }
    } catch {
      // 静默失败
    }
  }

  async function fetchLikedSongIds() {
    if (!profile.value) return
    try {
      const res = await getLikeList(profile.value.userId)
      likedSongIds.value = res?.ids || []
    } catch {
      // 静默失败
    }
  }

  /**
   * 喜欢歌曲（旧版 /like）
   */
  async function likeSongById(songId: number, like = true): Promise<boolean> {
    try {
      const res = await likeSong(songId, like)
      if (res?.code === 200) {
        toggleLike(songId)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // ==================== 收藏系统 ====================

  /** 收藏/取消收藏专辑 */
  async function toggleSubAlbum(id: number): Promise<boolean> {
    try {
      const res = await getAlbumDetailDynamic(id)
      const isSubbed = res?.isSub ?? false
      const subRes = await subAlbum(id, isSubbed ? 0 : 1)
      return subRes?.code === 200
    } catch { return false }
  }

  /** 收藏/取消收藏歌手 */
  async function toggleSubArtist(id: number): Promise<boolean> {
    try {
      const res = await getArtistDetailDynamic(id)
      const isSubbed = res?.isSub ?? false
      const subRes = await subArtist(id, isSubbed ? 2 : 1)
      return subRes?.code === 200
    } catch { return false }
  }

  /** 收藏/取消收藏 MV */
  async function toggleSubMv(id: number): Promise<boolean> {
    try {
      // 优先用 MV 详情接口的 subed 字段判断（动态、准确），
      // 避免 sublist 仅返回 25 条导致超过 25 个收藏后误判方向
      let isSubbed: boolean | undefined
      try {
        const detail = await getMvDetail(id)
        isSubbed = (detail as unknown as { subed?: boolean })?.subed
      } catch {
        // 详情接口失败时走列表兜底
      }
      if (isSubbed === undefined) {
        const listRes = await getMvSublist()
        const dataList = listRes?.data ?? []
        isSubbed = Array.isArray(dataList) && dataList.some(
          (item: unknown) => item && typeof item === 'object' &&
          ('vid' in item ? (item as { vid: number }).vid === id :
           'id' in item ? (item as { id: number }).id === id : false)
        )
      }
      const subRes = await subMv(id, isSubbed ? 2 : 1)
      return subRes?.code === 200
    } catch { return false }
  }

  /** 收藏/取消收藏歌单 */
  async function toggleSubscribePlaylist(id: number): Promise<boolean> {
    try {
      const res = await getPlaylistDetailDynamic(id)
      const isSubbed = res?.subscribed ?? false
      const subRes = await subscribePlaylist(id, isSubbed ? 2 : 1)
      return subRes?.code === 200
    } catch { return false }
  }

  /** 获取已收藏专辑列表 */
  async function fetchAlbumSublist(limit = 25, offset = 0) {
    try {
      const res = await getAlbumSublist(limit, offset)
      return res?.data || []
    } catch { return [] }
  }

  /** 获取已收藏歌手列表 */
  async function fetchArtistSublist(limit = 25, offset = 0) {
    try {
      const res = await getArtistSublist(limit, offset)
      return res?.data || []
    } catch { return [] }
  }

  /** 获取已收藏 MV 列表 */
  async function fetchMvSublist() {
    try {
      const res = await getMvSublist()
      return res?.data || []
    } catch { return [] }
  }

  // ==================== 歌单管理 ====================

  /** 新建歌单 */
  async function createNewPlaylist(name: string, privacy?: string): Promise<number | null> {
    try {
      const res = await createPlaylist(name, privacy)
      if (res?.code === 200 || res?.id) {
        await fetchUserPlaylists()
        return res.id || (res.playlist?.id) || null
      }
      return null
    } catch { return null }
  }

  /** 删除歌单 */
  async function deletePlaylistById(id: string): Promise<boolean> {
    try {
      const res = await deletePlaylist(id)
      if (res?.code === 200) {
        await fetchUserPlaylists()
        return true
      }
      return false
    } catch { return false }
  }

  /** 添加歌曲到歌单 */
  async function addTrackToPlaylist(pid: number, trackIds: number[]): Promise<boolean> {
    try {
      const res = await playlistTracks('add', pid, trackIds.join(','))
      return res?.code === 200
    } catch { return false }
  }

  /** 从歌单移除歌曲 */
  async function removeTrackFromPlaylist(pid: number, trackIds: number[]): Promise<boolean> {
    try {
      const res = await playlistTracks('del', pid, trackIds.join(','))
      return res?.code === 200
    } catch { return false }
  }

  /** 更新歌单信息 */
  async function updatePlaylistInfo(params: { id: number; name: string; desc: string; tags: string }): Promise<boolean> {
    try {
      const res = await updatePlaylist(params)
      if (res?.code === 200) {
        await fetchUserPlaylists()
        return true
      }
      return false
    } catch { return false }
  }

  /**
   * 退出登录
   */
  async function logout() {
    try {
      await apiLogout()
    } catch {
      // 静默
    }
    clearLocalAuth()
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
    checkLoginStatus,
    fetchUserProfile,
    fetchUserAccount,
    fetchLikedPlaylist,
    loginByPhone,
    loginAsAnonimous,
    handleLoginSuccess,
    importMusicUCookie,
    refreshLoginCookie,
    fetchUserPlaylists,
    fetchLikedSongIds,
    likeSongById,
    logout,
    // 收藏系统
    toggleSubAlbum,
    toggleSubArtist,
    toggleSubMv,
    toggleSubscribePlaylist,
    fetchAlbumSublist,
    fetchArtistSublist,
    fetchMvSublist,
    // 歌单管理
    createNewPlaylist,
    deletePlaylistById,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    updatePlaylistInfo,
  }
}, {
  persist: {
    storage: throttledPersistStorage,
    pick: ['profile', 'cookie', 'likedSongIds', 'loginMode', 'likedSongPlaylistId', 'lastRefreshCookieDate'],
    afterHydrate: (ctx) => {
      try {
        const state = ctx.store.$state as Record<string, unknown>
        const merged = migrateWithDefaults(userDefaults, {
          profile: state.profile,
          cookie: state.cookie,
          likedSongIds: state.likedSongIds,
          loginMode: state.loginMode,
          likedSongPlaylistId: state.likedSongPlaylistId,
          lastRefreshCookieDate: state.lastRefreshCookieDate,
        })
        Object.assign(ctx.store.$state, merged)
      } catch {
        // 迁移失败时保持当前值
      }
    }
  }
})
