import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginCellphone, getQrKey, getLoginStatus, logout as apiLogout } from '@/api/auth'
import { getPlaylistDetail } from '@/api/playlist'
import { getUserPlaylist } from '@/api/user'

export interface UserProfile {
  userId: number
  nickname: string
  avatarUrl: string
  backgroundUrl?: string
}

export interface Playlist {
  id: number
  name: string
  coverImgUrl: string
  trackCount: number
  playCount: number
}

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(null)
  const playlists = ref<Playlist[]>([])
  const likedSongIds = ref<number[]>([])
  const cookie = ref('')

  const loggedIn = computed(() => !!profile.value)

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

  async function checkLoginStatus() {
    try {
      const res: any = await getLoginStatus()
      if (res?.data?.profile) {
        profile.value = {
          userId: res.data.profile.userId,
          nickname: res.data.profile.nickname,
          avatarUrl: res.data.profile.avatarUrl,
          backgroundUrl: res.data.profile.backgroundUrl
        }
        fetchUserPlaylists()
        fetchLikedSongIds()
      }
    } catch {
      // Not logged in
    }
  }

  async function loginByPhone(phone: string, captcha: string) {
    try {
      const res: any = await loginCellphone(phone, captcha)
      if (res?.cookie) {
        cookie.value = res.cookie
      }
      if (res?.profile || res?.code === 200) {
        await checkLoginStatus()
        return { success: true }
      }
      return { success: false, message: res?.message || '登录失败' }
    } catch (e: any) {
      return { success: false, message: e?.message || '登录失败' }
    }
  }

  async function loginByQr() {
    try {
      const keyRes: any = await getQrKey()
      const key = keyRes?.data?.unikey
      if (!key) return { success: false, message: '获取二维码失败' }
      return { success: true, key }
    } catch (e: any) {
      return { success: false, message: e?.message || '二维码登录失败' }
    }
  }

  async function loginByCookie(cookieStr: string) {
    try {
      cookie.value = cookieStr
      await checkLoginStatus()
      if (profile.value) {
        return { success: true }
      }
      return { success: false, message: 'Cookie 无效' }
    } catch {
      return { success: false, message: 'Cookie 登录失败' }
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
    } catch {
      // Silent fail
    }
  }

  async function fetchLikedSongIds() {
    if (!profile.value) return
    try {
      const res: any = await getPlaylistDetail(0)
      const ids = (res?.playlist?.trackIds || []).map((t: any) => t.id)
      likedSongIds.value = ids
    } catch {
      // Silent fail
    }
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {
      // Silent
    }
    profile.value = null
    playlists.value = []
    likedSongIds.value = []
    cookie.value = ''
  }

  return {
    profile,
    playlists,
    likedSongIds,
    cookie,
    loggedIn,
    isLiked,
    toggleLike,
    setProfile,
    loginByPhone,
    loginByQr,
    loginByCookie,
    fetchUserPlaylists,
    fetchLikedSongIds,
    logout
  }
}, {
  persist: {
    pick: ['profile', 'cookie', 'likedSongIds']
  }
})
