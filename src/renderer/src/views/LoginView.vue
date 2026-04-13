<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center">
    <div class="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:bg-neutral-800">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF5F3] dark:bg-[rgba(196,58,63,0.2)]">
          <span class="text-3xl">🎵</span>
        </div>
        <h1 class="text-title">登录 Melody Air</h1>
        <p class="mt-2 text-sm text-neutral-500">发现你的专属音乐世界</p>
      </div>

      <!-- Tab switch -->
      <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-700">
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="loginMode === 'phone' ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-neutral-600 dark:text-[#FF7F66]' : 'text-neutral-500'"
          @click="loginMode = 'phone'"
        >
          手机号
        </button>
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="loginMode === 'qr' ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-neutral-600 dark:text-[#FF7F66]' : 'text-neutral-500'"
          @click="loginMode = 'qr'; startQrLogin()"
        >
          扫码登录
        </button>
      </div>

      <!-- Phone login -->
      <div v-if="loginMode === 'phone'" class="space-y-3">
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
            :class="countdown > 0 ? 'bg-neutral-100 text-neutral-400 dark:bg-neutral-700' : 'bg-[#FFF5F3] text-[#E0484D] hover:bg-[#FFE8E3] dark:bg-[rgba(196,58,63,0.2)] dark:text-[#FF7F66]'"
            :disabled="countdown > 0"
            @click="sendCaptcha"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </div>
        <button
          class="w-full rounded-xl bg-[#FF5A5F] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E0484D] disabled:opacity-50"
          :disabled="!phone || !captcha"
          @click="handlePhoneLogin"
        >
          登录
        </button>
      </div>

      <!-- QR Code login -->
      <div v-else class="flex flex-col items-center gap-4">
        <div
          class="flex h-48 w-48 items-center justify-center rounded-2xl border border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-700"
        >
          <img v-if="qrImg" :src="qrImg" alt="QR Code" class="h-44 w-44" />
          <div v-else class="text-center text-sm text-neutral-400">
            {{ qrStatus === 'loading' ? '加载中...' : '点击扫码登录' }}
          </div>
        </div>
        <p class="text-sm text-neutral-500">
          {{ qrStatusMessage }}
        </p>
      </div>

      <!-- Error message -->
      <p v-if="errorMsg" class="text-center text-sm text-[#FF5A5F]">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { loginCellphone, sendCaptcha as sendCaptchaApi, getQrKey, createQr, checkQr, getLoginStatus } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loginMode = ref<'phone' | 'qr'>('phone')
const phone = ref('')
const captcha = ref('')
const countdown = ref(0)
const errorMsg = ref('')

// QR code state
const qrImg = ref('')
const qrKey = ref('')
const qrStatus = ref<'idle' | 'loading' | 'waiting' | 'scanned' | 'success' | 'expired'>('idle')
let qrTimer: ReturnType<typeof setInterval> | null = null
let captchaTimer: ReturnType<typeof setInterval> | null = null

const qrStatusMessage = computed(() => {
  const messages: Record<string, string> = {
    idle: '点击上方切换到扫码登录',
    loading: '正在生成二维码...',
    waiting: '请使用网易云音乐APP扫码登录',
    scanned: '扫描成功，请在手机上确认',
    success: '登录成功！',
    expired: '二维码已过期，请刷新'
  }
  return messages[qrStatus.value] || ''
})

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
  try {
    const res: any = await loginCellphone(phone.value, captcha.value)
    if (res?.cookie || res?.code === 200) {
      // 保存 cookie 到 userStore 和 localStorage（API 拦截器从这里读取）
      if (res.cookie) {
        userStore.cookie = res.cookie
        localStorage.setItem('user', JSON.stringify({ cookie: res.cookie }))
      }
      await fetchUserProfile()
      router.push('/')
    } else {
      errorMsg.value = res?.message || '登录失败'
    }
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.msg || '登录失败'
  }
}

async function startQrLogin() {
  qrStatus.value = 'loading'
  errorMsg.value = ''
  try {
    const keyRes: any = await getQrKey()
    qrKey.value = keyRes?.data?.unikey || ''
    if (!qrKey.value) {
      errorMsg.value = '获取二维码 key 失败'
      qrStatus.value = 'idle'
      return
    }
    const qrRes: any = await createQr(qrKey.value)
    qrImg.value = qrRes?.data?.qrimg || ''
    qrStatus.value = 'waiting'

    // Poll for QR status
    if (qrTimer) clearInterval(qrTimer)
    qrTimer = setInterval(async () => {
      try {
        const checkRes: any = await checkQr(qrKey.value)
        console.log('[QR Check] Response:', checkRes)
        if (checkRes.code === 803) {
          // Authorized
          qrStatus.value = 'success'
          clearInterval(qrTimer!)
          qrTimer = null
          // 保存扫码登录返回的 cookie
          if (checkRes.cookie) {
            userStore.cookie = checkRes.cookie
            localStorage.setItem('user', JSON.stringify({ cookie: checkRes.cookie }))
          }
          await fetchUserProfile()
          router.push('/')
        } else if (checkRes.code === 802) {
          // Scanned, waiting for confirm
          qrStatus.value = 'scanned'
        } else if (checkRes.code === 800) {
          // Expired
          qrStatus.value = 'expired'
          clearInterval(qrTimer!)
          qrTimer = null
        }
      } catch (e) {
        console.error('[QR Check] Error:', e)
        // Continue polling
      }
    }, 2000)
  } catch (e: any) {
    errorMsg.value = '生成二维码失败'
    qrStatus.value = 'idle'
  }
}

async function fetchUserProfile() {
  try {
    // getLoginStatus 需要携带 cookie，但此时可能还没有
    // 直接从 loginCellphone 响应中获取的 profile 已在 handlePhoneLogin 中处理
    // 这里额外获取完整用户信息
    const res: any = await getLoginStatus()
    const profile = res?.data?.profile || res?.profile
    if (profile) {
      userStore.setProfile({
        userId: profile.userId,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        backgroundUrl: profile.backgroundUrl
      })
      // 同时将完整用户信息（含 cookie）写入 localStorage，供 API 拦截器使用
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      userData.profile = profile
      localStorage.setItem('user', JSON.stringify(userData))
    }
  } catch {
    // Ignore
  }
}

onUnmounted(() => {
  if (qrTimer) {
    clearInterval(qrTimer)
    qrTimer = null
  }
  if (captchaTimer) {
    clearInterval(captchaTimer)
    captchaTimer = null
  }
})
</script>

<style scoped>
.input-field {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid var(--color-neutral-200);
  background-color: var(--color-neutral-50);
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  outline: none;
  transition: background-color 0.15s, border-color 0.15s;
}

.input-field:focus {
  border-color: #FFB0A0;
  background-color: white;
}

.dark .input-field {
  border-color: var(--color-neutral-600);
  background-color: var(--color-neutral-700);
}

.dark .input-field:focus {
  border-color: #FF7F66;
}
</style>
