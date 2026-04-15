<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-8"><LoadingSpinner /></div>
    <template v-else-if="user">
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

      <!-- 歌单 -->
      <section>
        <SectionHeader title="歌单" />
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
    </template>
    <div v-else class="py-8 text-center text-neutral-400">用户不存在</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUserDetail, getUserPlaylist, followUser } from '@/api/user'
import SectionHeader from '@/components/common/SectionHeader.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { showToast } from '@/composables/useToast'

const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const uid = ref(0)
const user = ref<any>(null)
const userFollows = ref(0)
const userFolloweds = ref(0)
const isFollowed = ref(false)
const playlists = ref<any[]>([])

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

onMounted(() => {
  uid.value = Number(route.params.uid)
  if (uid.value) fetchData(uid.value)
})

watch(() => route.params.uid, (newId) => {
  if (newId) {
    uid.value = Number(newId)
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
