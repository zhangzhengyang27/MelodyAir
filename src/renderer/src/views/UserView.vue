<template>
  <div class="space-y-6">
    <SkeletonDetail v-if="loading" :rows="8" />
    <template v-else-if="user">
      <!-- 返回按钮 -->
      <button
        class="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-[#FF5A5F] dark:text-[#A1A1B5] dark:hover:bg-white/6"
        @click="$router.back()"
      >
        <ArrowLeft class="h-5 w-5" />
      </button>

      <!-- 用户信息 -->
      <div class="flex items-center gap-4">
        <img :src="user.avatarUrl + '?param=200y200'" alt="" class="h-20 w-20 rounded-full object-cover" />
        <div>
          <h1 class="text-title">{{ user.nickname }}</h1>
          <div class="mt-2 flex gap-4 text-sm text-neutral-500">
            <span>{{ userFollows }} 关注</span>
            <span>{{ userFolloweds }} 粉丝</span>
          </div>
          <p v-if="user.signature" class="mt-1 text-xs text-neutral-400 line-clamp-2">{{ user.signature }}</p>
        </div>
      </div>

      <!-- 关注按钮 -->
      <button
        v-if="userStore.isAccountLoggedIn && userStore.profile?.userId !== uid"
        class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
        :class="isFollowed ? 'bg-neutral-100 text-neutral-600 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]' : 'bg-[#FF5A5F] text-white hover:bg-[#E0484D]'"
        @click="handleFollow"
      >
        {{ isFollowed ? '已关注' : '关注' }}
      </button>

      <!-- Tab 切换 -->
      <div class="flex gap-1 border-b border-neutral-200 dark:border-white/10">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="relative px-4 py-2 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'text-[#FF5A5F]' : 'text-neutral-500 hover:text-neutral-700 dark:text-[#A1A1B5] dark:hover:text-[#F0F0F5]'"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span v-if="activeTab === tab.value" class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#FF5A5F]" />
        </button>
      </div>

      <!-- 歌单 -->
      <section v-if="activeTab === 'playlists'">
        <div v-if="playlists.length === 0" class="py-8 text-center text-neutral-400">暂无歌单</div>
        <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div
            v-for="pl in playlists"
            :key="pl.id"
            class="cursor-pointer"
            @click="$router.push(`/playlist/${pl.id}`)"
          >
            <CoverImage :src="pl.coverImgUrl" :alt="pl.name" size="md" playable />
            <p class="mt-2 line-clamp-2 text-sm">{{ pl.name }}</p>
          </div>
        </div>
      </section>

      <!-- 听歌排行 -->
      <section v-if="activeTab === 'record'">
        <div class="mb-4 flex items-center gap-2">
          <button
            v-for="opt in recordTypeOptions"
            :key="opt.value"
            class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            :class="recordType === opt.value ? 'bg-[#FF5A5F] text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-[#1F1F2E] dark:text-[#A1A1B5]'"
            @click="recordType = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <div v-if="recordLoading" class="space-y-2">
          <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />
        </div>
        <div v-else-if="recordSongs.length === 0" class="py-8 text-center text-neutral-400">暂无听歌记录</div>
        <div v-else class="space-y-1">
          <div
            v-for="(item, index) in recordSongs"
            :key="item.song.id"
            class="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-white/5"
            @click="handlePlayRecord(item.song)"
          >
            <span class="w-6 text-center text-sm font-bold" :class="index < 3 ? 'text-[#FF5A5F]' : 'text-neutral-400'">{{ index + 1 }}</span>
            <img :src="item.song.al?.picUrl + '?param=80y80'" :alt="item.song.name" class="h-10 w-10 rounded-md object-cover" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ item.song.name }}</p>
              <p class="truncate text-xs text-neutral-400">{{ item.song.ar?.map((a: any) => a.name).join(' / ') }}</p>
            </div>
            <span class="text-xs text-neutral-400">{{ item.playCount }} 次</span>
          </div>
        </div>
      </section>
    </template>
    <div v-else class="py-8 text-center text-neutral-400">用户不存在</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { getUserDetail, getUserPlaylist, followUser, getUserRecord } from '@/api/user'
import CoverImage from '@/components/common/CoverImage.vue'
import SkeletonDetail from '@/components/common/skeleton/SkeletonDetail.vue'
import { showToast } from '@/composables/useToast'
import { usePlayer } from '@/composables/usePlayer'
import type { Song } from '@/stores/player'

const route = useRoute()
const userStore = useUserStore()
const { playSongList } = usePlayer()

const loading = ref(false)
const uid = ref(0)
const user = ref<any>(null)
const userFollows = ref(0)
const userFolloweds = ref(0)
const isFollowed = ref(false)
const playlists = ref<any[]>([])

const activeTab = ref<'playlists' | 'record'>('playlists')
const tabs = [
  { label: '歌单', value: 'playlists' as const },
  { label: '听歌排行', value: 'record' as const },
]

// 听歌排行
const recordType = ref<0 | 1>(1) // 1=最近一周, 0=所有时间
const recordTypeOptions = [
  { label: '最近一周', value: 1 as const },
  { label: '所有时间', value: 0 as const },
]
const recordLoading = ref(false)
const recordSongs = ref<{ playCount: number; song: any }[]>([])

async function fetchData(id: number) {
  loading.value = true
  try {
    const [detailRes, playlistRes] = await Promise.allSettled([
      getUserDetail(id),
      getUserPlaylist(id)
    ])
    if (detailRes.status === 'fulfilled') {
      const d = (detailRes.value as any)
      user.value = d?.profile || d
      userFollows.value = d?.profile?.follows || 0
      userFolloweds.value = d?.profile?.followeds || 0
      isFollowed.value = d?.profile?.followed || false
    }
    if (playlistRes.status === 'fulfilled') {
      playlists.value = (playlistRes.value as any)?.playlist || []
    }
  } finally {
    loading.value = false
  }
}

async function fetchRecord() {
  if (!uid.value) return
  recordLoading.value = true
  try {
    const res: any = await getUserRecord(uid.value, recordType.value)
    const data = recordType.value === 1 ? res?.weekData : res?.allData
    recordSongs.value = (data || []).slice(0, 50)
  } catch {
    recordSongs.value = []
  } finally {
    recordLoading.value = false
  }
}

// 切换排行类型时重新获取
watch(recordType, fetchRecord)
// 切换到排行 tab 时懒加载
watch(activeTab, (tab) => {
  if (tab === 'record' && recordSongs.value.length === 0 && !recordLoading.value) {
    fetchRecord()
  }
})

function handlePlayRecord(songData: any) {
  const song: Song = {
    id: songData.id,
    name: songData.name,
    artists: (songData.ar || []).map((a: any) => ({ id: a.id, name: a.name })),
    album: { id: songData.al?.id || 0, name: songData.al?.name || '', picUrl: songData.al?.picUrl || '' },
    duration: songData.dt || 0,
    fee: songData.fee || 0,
  }
  // 用排行列表作为播放队列
  const queue = recordSongs.value.map((item) => ({
    id: item.song.id,
    name: item.song.name,
    artists: (item.song.ar || []).map((a: any) => ({ id: a.id, name: a.name })),
    album: { id: item.song.al?.id || 0, name: item.song.al?.name || '', picUrl: item.song.al?.picUrl || '' },
    duration: item.song.dt || 0,
    fee: item.song.fee || 0,
  }))
  const index = queue.findIndex((s) => s.id === song.id)
  playSongList(queue, index >= 0 ? index : 0)
}

onMounted(() => {
  uid.value = Number(route.params.uid)
  if (uid.value) fetchData(uid.value)
})

watch(() => route.params.uid, (newId) => {
  if (newId) {
    uid.value = Number(newId)
    activeTab.value = 'playlists'
    recordSongs.value = []
    fetchData(uid.value)
  }
})

async function handleFollow() {
  if (!userStore.isAccountLoggedIn) {
    showToast('请先登录')
    return
  }
  try {
    await followUser(uid.value, isFollowed.value ? 0 : 1)
    isFollowed.value = !isFollowed.value
    showToast(isFollowed.value ? '已关注' : '已取消关注')
  } catch {
    showToast('操作失败', { type: 'error' })
  }
}
</script>
