<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center">
    <div class="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:bg-[#171722] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF5F3] dark:bg-[rgba(255,90,95,0.15)]">
          <Music class="h-7 w-7" />
        </div>
        <h1 class="text-title">登录 Melody Air</h1>
        <p class="mt-2 text-sm text-neutral-500">发现你的专属音乐世界</p>
      </div>

      <!-- 手机验证码登录 -->
      <div class="space-y-3">
        <input
          v-model="phone"
          type="tel"
          placeholder="手机号"
          maxlength="11"
          class="input-field"
        />
        <div class="flex gap-2">
          <input
            v-model="captcha"
            type="text"
            placeholder="验证码"
            maxlength="6"
            class="input-field flex-1"
          />
          <button
            class="shrink-0 rounded-xl px-4 text-sm font-medium transition-colors"
            :class="countdown > 0 ? 'bg-neutral-100 text-neutral-400 dark:bg-[#1F1F2E] dark:text-[#6B6B80]' : 'bg-[#FFF5F3] text-[#E0484D] hover:bg-[#FFE8E3] dark:bg-[rgba(255,90,95,0.15)] dark:text-[#FF7F66]'"
            :disabled="countdown > 0"
            @click="sendCaptcha"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </div>
        <button
          class="w-full rounded-xl bg-[#FF5A5F] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E0484D] disabled:opacity-50"
          :disabled="!phone || !captcha || processing"
          @click="handlePhoneLogin"
        >
          {{ processing ? '登录中...' : '登录' }}
        </button>
      </div>

      <!-- Error message -->
      <p v-if="errorMsg" class="text-center text-sm text-[#FF5A5F]">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendCaptcha as sendCaptchaApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { Music } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const phone = ref('')
const captcha = ref('')
const countdown = ref(0)
const errorMsg = ref('')
const processing = ref(false)

let captchaTimer: ReturnType<typeof setInterval> | null = null

async function sendCaptcha() {
  if (!phone.value || countdown.value > 0) return
  errorMsg.value = ''
  try {
    await sendCaptchaApi(phone.value)
    countdown.value = 60
    captchaTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(captchaTimer!)
        captchaTimer = null
      }
    }, 1000)
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || '发送验证码失败'
  }
}

async function handlePhoneLogin() {
  if (!phone.value || !captcha.value) return
  errorMsg.value = ''
  processing.value = true
  try {
    const result = await userStore.loginByPhone(phone.value, captcha.value)
    if (result.success) {
      router.push('/library')
    } else {
      errorMsg.value = result.message || '登录失败'
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '登录失败'
  } finally {
    processing.value = false
  }
}

onUnmounted(() => {
  if (captchaTimer) {
    clearInterval(captchaTimer)
    captchaTimer = null
  }
})
</script>

<style scoped>
.input-field {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background-color: #fafafa;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;
  color: #1a1a2e;
}

.input-field:focus {
  border-color: #FFB0A0;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(255, 176, 160, 0.15);
}

.dark .input-field {
  border-color: rgba(255, 255, 255, 0.10);
  background-color: #13131C;
  color: #F0F0F5;
}

.dark .input-field:focus {
  border-color: rgba(255, 127, 102, 0.55);
  box-shadow: 0 0 0 3px rgba(255, 90, 95, 0.15);
}
</style>
