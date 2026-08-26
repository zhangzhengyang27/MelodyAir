<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-10 text-center dark:border-white/10 dark:bg-white/[0.02]">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF5F3] dark:bg-[rgba(255,90,95,0.12)]">
      <component :is="icon" class="h-7 w-7 text-[#FF5A5F]" />
    </div>
    <h3 class="text-base font-semibold">{{ title }}</h3>
    <p class="mt-1.5 max-w-xs text-sm text-neutral-400">{{ description }}</p>
    <button
      class="mt-5 flex items-center gap-2 rounded-full bg-[#FF5A5F] px-6 py-2.5 text-sm font-medium text-white shadow-[0_2px_12px_rgba(255,90,95,0.3)] transition-all hover:bg-[#E0484D] hover:shadow-[0_4px_16px_rgba(255,90,95,0.4)]"
      @click="handleLogin"
    >
      <LogIn class="h-4 w-4" />
      {{ buttonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LogIn, Heart, type LucideIcon } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  buttonText?: string
  icon?: LucideIcon
  redirect?: string
}>(), {
  title: '登录后解锁更多功能',
  description: '登录 MelodyAir，享受个性化推荐、歌单同步、收藏等完整体验',
  buttonText: '立即登录',
  icon: Heart,
  redirect: ''
})

const router = useRouter()

function handleLogin() {
  const redirect = props.redirect || window.location.hash.slice(1)
  router.push({ name: 'login', query: { redirect } })
}
</script>
