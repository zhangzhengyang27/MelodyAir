<template>
  <div class="space-y-6">
    <h1 class="text-title">播客</h1>

    <div v-if="loading" class="py-8"><LoadingSpinner /></div>

    <template v-else>
      <!-- Banner -->
      <section v-if="banners.length > 0" class="relative overflow-hidden rounded-2xl">
        <div class="flex transition-transform duration-500" :style="{ transform: `translateX(-${bannerIndex * 100}%)` }">
          <div v-for="banner in banners" :key="banner.id" class="w-full shrink-0">
            <img :src="banner.pic" :alt="banner.typeTitle" class="h-48 w-full object-cover" />
          </div>
        </div>
        <div v-if="banners.length > 1" class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          <button
            v-for="(_, idx) in banners"
            :key="idx"
            class="h-1.5 w-1.5 rounded-full transition-colors"
            :class="bannerIndex === idx ? 'bg-white' : 'bg-white/50'"
            @click="bannerIndex = idx"
          />
        </div>
      </section>

      <!-- 分类导航 -->
      <section v-if="categories.length > 0">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in [{ id: 0, name: '推荐' }, ...categories]"
            :key="cat.id"
            class="rounded-full px-4 py-1.5 text-sm transition-colors"
            :class="activeCategory === cat.id
              ? 'bg-coral-500 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/8 dark:text-[#A1A1B5] dark:hover:bg-white/12'"
            @click="selectCategory(cat.id)"
          >
            {{ cat.name }}
          </button>
        </div>
      </section>

      <!-- 推荐电台 -->
      <section v-if="activeCategory === 0 && recommendRadios.length > 0">
        <SectionHeader title="推荐电台" />
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <div
            v-for="radio in recommendRadios"
            :key="radio.id"
            class="group cursor-pointer"
            @click="$router.push(`/dj/${radio.id}`)"
          >
            <CoverImage :src="radio.picUrl" :alt="radio.name" size="md" playable />
            <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ radio.name }}</p>
            <p v-if="radio.dj" class="mt-0.5 text-xs text-neutral-400">{{ radio.dj.brand }}</p>
          </div>
        </div>
      </section>

      <!-- 分类下的热门电台 -->
      <section v-if="activeCategory !== 0 && categoryRadios.length > 0">
        <SectionHeader :title="activeCategoryName + ' · 热门电台'" />
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <div
            v-for="radio in categoryRadios"
            :key="radio.id"
            class="group cursor-pointer"
            @click="$router.push(`/dj/${radio.id}`)"
          >
            <CoverImage :src="radio.picUrl" :alt="radio.name" size="md" playable />
            <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ radio.name }}</p>
            <p class="mt-0.5 text-xs text-neutral-400">{{ formatPlayCount(radio.programCount) }}个节目</p>
          </div>
        </div>
      </section>

      <!-- 热门电台榜（推荐 tab 下展示） -->
      <section v-if="activeCategory === 0 && hotRadios.length > 0">
        <SectionHeader title="热门电台" />
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <div
            v-for="radio in hotRadios"
            :key="radio.id"
            class="group cursor-pointer"
            @click="$router.push(`/dj/${radio.id}`)"
          >
            <CoverImage :src="radio.picUrl" :alt="radio.name" size="md" playable />
            <p class="mt-2 line-clamp-2 text-sm dark:text-[#A1A1B5]">{{ radio.name }}</p>
            <p class="mt-0.5 text-xs text-neutral-400">{{ formatPlayCount(radio.programCount) }}个节目</p>
          </div>
        </div>
      </section>

      <!-- 推荐节目 -->
      <section v-if="activeCategory === 0 && recommendPrograms.length > 0">
        <SectionHeader title="推荐节目" />
        <div class="space-y-2">
          <div
            v-for="prog in recommendPrograms"
            :key="prog.id"
            class="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-neutral-50 dark:hover:bg-white/4"
          >
            <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              <img :src="prog.coverUrl + '?param=100y100'" alt="" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium dark:text-[#F0F0F5]">{{ prog.name }}</p>
              <p class="truncate text-xs text-neutral-400">{{ prog.radio?.name }}</p>
            </div>
            <span class="shrink-0 text-xs text-neutral-400">{{ formatDuration(prog.duration) }}</span>
          </div>
        </div>
      </section>

      <!-- 节目榜单 -->
      <section v-if="activeCategory === 0 && toplistPrograms.length > 0">
        <SectionHeader title="节目榜单" />
        <div class="space-y-2">
          <div
            v-for="(prog, idx) in toplistPrograms"
            :key="prog.id"
            class="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-neutral-50 dark:hover:bg-white/4"
          >
            <span class="w-6 text-center text-sm font-bold" :class="idx < 3 ? 'text-[#FF5A5F]' : 'text-neutral-400'">{{ idx + 1 }}</span>
            <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
              <img :src="prog.coverUrl + '?param=100y100'" alt="" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium dark:text-[#F0F0F5]">{{ prog.name }}</p>
              <p class="truncate text-xs text-neutral-400">{{ prog.radio?.name }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 空状态 -->
      <div
        v-if="activeCategory === 0 && recommendRadios.length === 0 && hotRadios.length === 0 && recommendPrograms.length === 0"
        class="py-12 text-center text-neutral-400 dark:text-[#6B6B80]"
      >
        暂无播客数据
      </div>
      <div
        v-if="activeCategory !== 0 && categoryRadios.length === 0"
        class="py-12 text-center text-neutral-400 dark:text-[#6B6B80]"
      >
        该分类暂无电台
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  getDjCatelist,
  getDjRecommend,
  getDjPersonalizeRecommend,
  getDjRadioHot,
  getDjHot,
  getDjBanner,
  getProgramRecommend,
  getProgramToplist
} from '@/api/dj'
import CoverImage from '@/components/common/CoverImage.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { formatPlayCount, formatDuration } from '@/utils/format'

const loading = ref(false)
const categories = ref<any[]>([])
const activeCategory = ref(0)
const bannerIndex = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null

const banners = ref<any[]>([])
const recommendRadios = ref<any[]>([])
const hotRadios = ref<any[]>([])
const recommendPrograms = ref<any[]>([])
const toplistPrograms = ref<any[]>([])
const categoryRadios = ref<any[]>([])

const activeCategoryName = computed(() => {
  if (activeCategory.value === 0) return '推荐'
  return categories.value.find(c => c.id === activeCategory.value)?.name || ''
})

onMounted(async () => {
  loading.value = true
  try {
    const [catRes, recRes, personalRes, hotRes, progRes, bannerRes, toplistRes] = await Promise.allSettled([
      getDjCatelist(),
      getDjRecommend(),
      getDjPersonalizeRecommend(12),
      getDjHot({ limit: 12 }),
      getProgramRecommend(),
      getDjBanner(),
      getProgramToplist(20)
    ])

    if (catRes.status === 'fulfilled') {
      categories.value = (catRes.value as any)?.categories || []
    }
    if (recRes.status === 'fulfilled') {
      recommendRadios.value = (recRes.value as any)?.djRadios || []
    }
    if (personalRes.status === 'fulfilled') {
      const personal = (personalRes.value as any)?.data || []
      if (recommendRadios.value.length === 0 && personal.length > 0) {
        recommendRadios.value = personal
      }
    }
    if (hotRes.status === 'fulfilled') {
      hotRadios.value = (hotRes.value as any)?.djRadios || []
    }
    if (progRes.status === 'fulfilled') {
      recommendPrograms.value = (progRes.value as any)?.programs || []
    }
    if (bannerRes.status === 'fulfilled') {
      banners.value = (bannerRes.value as any)?.data || []
    }
    if (toplistRes.status === 'fulfilled') {
      toplistPrograms.value = (toplistRes.value as any)?.list || (toplistRes.value as any)?.programs || []
    }

    // Banner 自动轮播
    if (banners.value.length > 1) {
      bannerTimer = setInterval(() => {
        bannerIndex.value = (bannerIndex.value + 1) % banners.value.length
      }, 5000)
    }
  } catch (err) {
    console.error('加载播客数据失败:', err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (bannerTimer) {
    clearInterval(bannerTimer)
    bannerTimer = null
  }
})

async function selectCategory(id: number) {
  activeCategory.value = id
  if (id === 0) return

  categoryRadios.value = []
  try {
    const res: any = await getDjRadioHot({ cateId: id, limit: 30 })
    categoryRadios.value = res?.djRadios || res?.radios || []
  } catch (err) {
    console.error('加载分类电台失败:', err)
  }
}
</script>
