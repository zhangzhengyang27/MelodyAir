<template>
  <div class="space-y-6">
    <div v-if="!userStore.isAccountLoggedIn" class="flex min-h-[40vh] items-center justify-center">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-[#1F1F2E]">
          <span class="text-4xl">🎵</span>
        </div>
        <h2 class="text-subtitle font-semibold">登录后查看</h2>
        <p class="mt-2 text-sm text-neutral-500">登录后即可查看你的个人音乐库</p>
        <RouterLink
          to="/login"
          class="mt-4 inline-block rounded-xl bg-[#FF5A5F] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
        >
          去登录
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <!-- User info -->
      <div class="flex items-center gap-4">
        <img
          :src="userStore.profile?.avatarUrl + '?param=200y200'"
          alt="avatar"
          class="h-16 w-16 rounded-full object-cover ring-2 ring-[#FFE8E3] dark:ring-[rgba(255,90,95,0.30)]"
        />
        <div>
          <h1 class="text-title">{{ userStore.profile?.nickname }}</h1>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C]">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Liked songs -->
      <section v-if="activeTab === 'liked'">
        <SongTable :songs="likedSongs" :loading="loading" @play="handlePlayLiked" />
      </section>

      <!-- My playlists -->
      <section v-if="activeTab === 'playlists'">
        <div class="mb-4 flex justify-end">
          <button
            class="rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#E0484D]"
            @click="showCreateDialog = true"
          >
            + 新建歌单
          </button>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div
            v-for="pl in playlists"
            :key="pl.id"
            class="group cursor-pointer"
            @click="$router.push(`/playlist/${pl.id}`)"
          >
            <CoverImage :src="pl.coverImgUrl" :alt="pl.name" size="md" playable />
            <p class="mt-2 line-clamp-2 text-sm">{{ pl.name }}</p>
            <p class="text-xs text-neutral-400">{{ pl.trackCount }}首</p>
          </div>
        </div>
      </section>

      <!-- Recent plays -->
      <section v-if="activeTab === 'recent'">
        <SongTable :songs="recentSongs" :loading="loading" @play="handlePlayRecent" />
      </section>

      <!-- Subscribed albums -->
      <section v-if="activeTab === 'albums'">
        <div v-if="subLoading" class="py-8"><LoadingSpinner /></div>
        <div v-else-if="subAlbums.length === 0" class="py-8 text-center text-neutral-400">暂无收藏的专辑</div>
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <div
            v-for="item in subAlbums"
            :key="item.id"
            class="cursor-pointer"
            @click="$router.push(`/album/${item.id}`)"
          >
            <CoverImage :src="item.picUrl" :alt="item.name" size="md" />
            <p class="mt-2 line-clamp-1 text-sm">{{ item.name }}</p>
            <p class="text-xs text-neutral-400">{{ item.artist?.name }}</p>
          </div>
        </div>
      </section>

      <!-- Subscribed artists -->
      <section v-if="activeTab === 'artists'">
        <div v-if="subLoading" class="py-8"><LoadingSpinner /></div>
        <div v-else-if="subArtists.length === 0" class="py-8 text-center text-neutral-400">暂无关注的歌手</div>
        <div v-else class="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          <div
            v-for="item in subArtists"
            :key="item.id"
            class="cursor-pointer text-center"
            @click="$router.push(`/artist/${item.id}`)"
          >
            <div class="mx-auto h-24 w-24 overflow-hidden rounded-full shadow-md">
              <img :src="item.picUrl || item.img1v1Url" :alt="item.name" class="h-full w-full object-cover" />
            </div>
            <p class="mt-2 line-clamp-1 text-sm">{{ item.name }}</p>
          </div>
        </div>
      </section>

      <!-- Subscribed MVs -->
      <section v-if="activeTab === 'mvs'">
        <div v-if="subLoading" class="py-8"><LoadingSpinner /></div>
        <div v-else-if="subMvs.length === 0" class="py-8 text-center text-neutral-400">暂无收藏的MV</div>
        <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div
            v-for="item in subMvs"
            :key="item.id"
            class="cursor-pointer"
            @click="$router.push(`/mv/${item.vid || item.id}`)"
          >
            <div class="overflow-hidden rounded-lg">
              <img :src="item.cover" :alt="item.name" class="h-32 w-full object-cover" />
            </div>
            <p class="mt-2 line-clamp-1 text-sm dark:text-[#A1A1B5]">{{ item.name }}</p>
            <p class="text-xs text-neutral-400">{{ item.artistName }}</p>
          </div>
        </div>
      </section>

      <!-- Create playlist dialog -->
      <div v-if="showCreateDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showCreateDialog = false">
        <div class="w-96 rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1F1F2E]">
          <h3 class="text-lg font-semibold">新建歌单</h3>
          <input
            v-model="newPlaylistName"
            class="mt-4 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm outline-none focus:border-[#FFB0A0] dark:border-white/10 dark:bg-[#13131C] dark:text-[#F0F0F5]"
            placeholder="歌单名称"
            @keyup.enter="handleCreatePlaylist"
          />
          <div class="mt-4 flex justify-end gap-3">
            <button class="rounded-xl px-4 py-2 text-sm text-neutral-600 dark:text-[#A1A1B5]" @click="showCreateDialog = false">取消</button>
            <button
              class="rounded-xl bg-[#FF5A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#E0484D] disabled:opacity-50"
              :disabled="!newPlaylistName.trim() || createLoading"
              @click="handleCreatePlaylist"
            >
              {{ createLoading ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getUserPlaylist, getLikeList } from '@/api/user'
import { getSongDetail } from '@/api/song'
import { getRecentSong } from '@/api/record'
import SongTable from '@/components/common/SongTable.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { usePlayer } from '@/composables/usePlayer'
import { showToast } from '@/composables/useToast'
import type { Song } from '@/stores/player'

const userStore = useUserStore()
const { playSongList } = usePlayer()

const loading = ref(false)
const subLoading = ref(false)
const activeTab = ref('liked')
const likedSongs = ref<Song[]>([])
const playlists = ref<any[]>([])
const recentSongs = ref<Song[]>([])
const subAlbums = ref<any[]>([])
const subArtists = ref<any[]>([])
const subMvs = ref<any[]>([])
const showCreateDialog = ref(false)
const newPlaylistName = ref('')
const createLoading = ref(false)

const tabs = [
  { label: '我喜欢的', value: 'liked' },
  { label: '我的歌单', value: 'playlists' },
  { label: '最近播放', value: 'recent' },
  { label: '收藏专辑', value: 'albums' },
  { label: '关注歌手', value: 'artists' },
  { label: '收藏MV', value: 'mvs' }
]

async function switchTab(tab: string) {
  activeTab.value = tab
  if (tab === 'albums' && subAlbums.value.length === 0) await fetchSubAlbums()
  if (tab === 'artists' && subArtists.value.length === 0) await fetchSubArtists()
  if (tab === 'mvs' && subMvs.value.length === 0) await fetchSubMvs()
}

async function fetchSubAlbums() {
  subLoading.value = true
  try {
    subAlbums.value = await userStore.fetchAlbumSublist()
  } finally {
    subLoading.value = false
  }
}

async function fetchSubArtists() {
  subLoading.value = true
  try {
    subArtists.value = await userStore.fetchArtistSublist()
  } finally {
    subLoading.value = false
  }
}

async function fetchSubMvs() {
  subLoading.value = true
  try {
    subMvs.value = await userStore.fetchMvSublist()
  } finally {
    subLoading.value = false
  }
}

onMounted(async () => {
  if (!userStore.isAccountLoggedIn) return
  if (!userStore.profile) {
    await userStore.fetchUserProfile()
    if (!userStore.profile) return
  }
  loading.value = true
  const uid = userStore.profile.userId

  try {
    const [playlistRes, likeRes, recentRes] = await Promise.allSettled([
      getUserPlaylist(uid),
      getLikeList(uid),
      getRecentSong()
    ])

    if (playlistRes.status === 'fulfilled') {
      playlists.value = (playlistRes.value as any)?.playlist || []
    }

    if (likeRes.status === 'fulfilled') {
      const ids = (likeRes.value as any)?.ids || []
      if (ids.length > 0) {
        const idsStr = ids.slice(0, 50).join(',')
        const songRes: any = await getSongDetail(idsStr)
        likedSongs.value = (songRes?.songs || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
          album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
          duration: s.dt || 0,
          fee: s.fee || 0
        }))
      }
    }

    if (recentRes.status === 'fulfilled') {
      recentSongs.value = ((recentRes.value as any)?.data?.list || []).map((item: any) => {
        const s = item.data
        return {
          id: s.id,
          name: s.name,
          artists: s.ar?.map((a: any) => ({ id: a.id, name: a.name })) || [],
          album: { id: s.al?.id || 0, name: s.al?.name || '', picUrl: s.al?.picUrl || '' },
          duration: s.dt || 0,
          fee: s.fee || 0
        }
      })
    }
  } finally {
    loading.value = false
  }
})

function handlePlayLiked(song: Song) {
  playSongList(likedSongs.value, likedSongs.value.findIndex(s => s.id === song.id))
}

function handlePlayRecent(song: Song) {
  playSongList(recentSongs.value, recentSongs.value.findIndex(s => s.id === song.id))
}

async function handleCreatePlaylist() {
  if (!newPlaylistName.value.trim()) return
  createLoading.value = true
  try {
    const id = await userStore.createNewPlaylist(newPlaylistName.value.trim())
    if (id) {
      showToast('歌单创建成功')
      showCreateDialog.value = false
      newPlaylistName.value = ''
      playlists.value = userStore.playlists as any[]
    } else {
      showToast('创建失败', { type: 'error' })
    }
  } finally {
    createLoading.value = false
  }
}
</script>
