<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold">{{ title }}</h3>
        <span class="text-xs text-neutral-400">共 {{ total }} 条评论</span>
      </div>
      <div class="flex gap-2">
        <button
          v-for="t in tabs"
          :key="t.value"
          class="rounded-full px-3 py-1 text-xs transition-colors"
          :class="activeTab === t.value
            ? 'bg-[#FF5A5F] text-white'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'"
          @click="activeTab = t.value; fetchComments()"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Input -->
    <div v-if="userStore.loggedIn" class="flex gap-3">
      <img
        :src="userStore.profile?.avatarUrl + '?param=50y50'"
        class="h-9 w-9 shrink-0 rounded-full object-cover"
        alt="avatar"
      />
      <div class="flex-1">
        <textarea
          v-model="commentText"
          :placeholder="replyTo ? `回复 @${replyTo.nickname}...` : '写下你的评论...'"
          class="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none transition-colors focus:border-[#FFB0A0] dark:border-neutral-600 dark:bg-neutral-700 dark:focus:border-[#FF7F66]"
          rows="2"
        />
        <div class="mt-2 flex justify-end">
          <button
            class="rounded-full bg-[#FF5A5F] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#E0484D] disabled:opacity-50"
            :disabled="!commentText.trim()"
            @click="submitComment"
          >
            发送
          </button>
        </div>
      </div>
    </div>
    <div v-else class="rounded-xl bg-neutral-50 p-4 text-center text-sm text-neutral-400 dark:bg-neutral-800">
      <RouterLink to="/login" class="text-[#FF5A5F] hover:underline">登录</RouterLink> 后即可评论
    </div>

    <!-- Comments list -->
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    <div v-else-if="comments.length === 0" class="py-8 text-center text-sm text-neutral-400">
      暂无评论，快来抢沙发~
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="comment in comments"
        :key="comment.commentId"
        class="flex gap-3"
      >
        <img
          :src="comment.user.avatarUrl + '?param=50y50'"
          :alt="comment.user.nickname"
          class="h-9 w-9 shrink-0 rounded-full object-cover"
        />
        <div class="flex-1">
          <p class="text-sm">
            <span class="font-medium text-[#FF5A5F]">{{ comment.user.nickname }}</span>
          </p>
          <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{{ comment.content }}</p>
          <div class="mt-1.5 flex items-center gap-4 text-xs text-neutral-400">
            <span>{{ formatCommentTime(comment.time) }}</span>
            <button class="flex items-center gap-1 hover:text-[#FF5A5F]" @click="handleLike(comment)">
              👍 {{ comment.likedCount }}
            </button>
            <button class="hover:text-[#FF5A5F]" @click="setReply(comment)">回复</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Load more -->
    <div v-if="hasMore" class="flex justify-center py-2">
      <button
        class="text-xs text-[#FF5A5F] hover:underline"
        @click="loadMore"
      >
        加载更多
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getCommentHot, getCommentNew, sendComment, likeComment } from '@/api/comment'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

interface CommentUser {
  userId: number
  nickname: string
  avatarUrl: string
}

interface Comment {
  commentId: number
  user: CommentUser
  content: string
  time: number
  likedCount: number
  liked: boolean
}

const props = defineProps<{
  type: number // 0: song, 1: mv, 2: playlist, 3: album, 4: dj
  id: number
  title?: string
}>()

const userStore = useUserStore()
const comments = ref<Comment[]>([])
const total = ref(0)
const loading = ref(false)
const activeTab = ref(0) // 0: hot, 1: new
const commentText = ref('')
const replyTo = ref<{ commentId: number; nickname: string } | null>(null)
const page = ref(1)
const hasMore = ref(false)

const tabs = [
  { label: '热门', value: 0 },
  { label: '最新', value: 1 }
]

onMounted(() => {
  fetchComments()
})

async function fetchComments() {
  loading.value = true
  page.value = 1
  comments.value = []
  try {
    const typeMap: Record<number, string> = { 0: 'music', 1: 'mv', 2: 'playlist', 3: 'album', 4: 'dj' }
    const typeStr = typeMap[props.type] || 'music'
    const fetcher = activeTab.value === 0 ? getCommentHot : getCommentNew
    const res: any = await fetcher(props.id, typeStr, 20, (page.value - 1) * 20)
    total.value = res?.total || 0
    comments.value = (res?.hotComments || res?.comments || []).map(mapComment)
    hasMore.value = res?.more || false
  } catch {
    // Silent
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  page.value++
  try {
    const typeMap: Record<number, string> = { 0: 'music', 1: 'mv', 2: 'playlist', 3: 'album', 4: 'dj' }
    const typeStr = typeMap[props.type] || 'music'
    const fetcher = activeTab.value === 0 ? getCommentHot : getCommentNew
    const res: any = await fetcher(props.id, typeStr, 20, (page.value - 1) * 20)
    const newComments = (res?.hotComments || res?.comments || []).map(mapComment)
    comments.value.push(...newComments)
    hasMore.value = res?.more || false
  } catch {
    // Silent
  }
}

async function submitComment() {
  if (!commentText.value.trim()) return
  try {
    await sendComment(1, props.type, props.id, commentText.value.trim(), replyTo.value?.commentId)
    commentText.value = ''
    replyTo.value = null
    fetchComments()
  } catch {
    // Silent
  }
}

async function handleLike(comment: Comment) {
  try {
    const typeMap: Record<number, string> = { 0: 'music', 1: 'mv', 2: 'playlist', 3: 'album', 4: 'dj' }
    const typeStr = typeMap[props.type] || 'music'
    await likeComment(props.id, comment.commentId, comment.liked ? 0 : 1, typeStr)
    comment.liked = !comment.liked
    comment.likedCount += comment.liked ? 1 : -1
  } catch {
    // Silent
  }
}

function setReply(comment: Comment) {
  replyTo.value = { commentId: comment.commentId, nickname: comment.user.nickname }
}

function mapComment(c: any): Comment {
  return {
    commentId: c.commentId,
    user: {
      userId: c.user?.userId || 0,
      nickname: c.user?.nickname || '',
      avatarUrl: c.user?.avatarUrl || ''
    },
    content: c.content,
    time: c.time,
    likedCount: c.likedCount || 0,
    liked: c.liked || false
  }
}

function formatCommentTime(time: number): string {
  const now = Date.now()
  const diff = now - time
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>
