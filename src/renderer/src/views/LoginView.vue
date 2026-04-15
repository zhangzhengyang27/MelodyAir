<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center">
    <div class="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] dark:bg-[#171722] dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),0_0_1px_rgba(255,255,255,0.05)]">
      <div class="text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF5F3] dark:bg-[rgba(255,90,95,0.15)]">
          <span class="text-3xl">🎵</span>
        </div>
        <h1 class="text-title">登录 Melody Air</h1>
        <p class="mt-2 text-sm text-neutral-500">发现你的专属音乐世界</p>
      </div>

      <!-- Tab switch -->
      <div class="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-[#13131C]">
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="loginMode === 'phone' ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
          @click="loginMode = 'phone'"
        >
          手机号
        </button>
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="loginMode === 'email' ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
          @click="loginMode = 'email'"
        >
          邮箱
        </button>
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="loginMode === 'qr' ? 'bg-white text-[#FF5A5F] shadow-sm dark:bg-[#1F1F2E] dark:text-[#FF7F66]' : 'text-neutral-500 dark:text-[#A1A1B5]'"
          @click="switchToQrMode"
        >
          扫码
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
            placeholder="验证码 / 密码"
            maxlength="20"
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

      <!-- Email login -->
      <div v-else-if="loginMode === 'email'" class="space-y-3">
        <input
          v-model="email"
          type="email"
          placeholder="163网易邮箱"
          class="input-field"
        />
        <input
          v-model="emailPassword"
          type="password"
          placeholder="密码"
          class="input-field"
        />
        <button
          class="w-full rounded-xl bg-[#FF5A5F] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E0484D] disabled:opacity-50"
          :disabled="!email || !emailPassword || processing"
          @click="handleEmailLogin"
        >
          {{ processing ? '登录中...' : '登录' }}
        </button>
      </div>

      <!-- QR Code login（参照 YPM loginAccount.vue） -->
      <div v-else-if="loginMode === 'qr'" class="flex flex-col items-center gap-4">
        <div
          class="qr-code-container"
          @click="getQrCodeKey"
        >
          <img v-if="qrCodeSvg" :src="qrCodeSvg" alt="QR Code" class="h-48 w-48" />
          <div v-else class="flex h-48 w-48 items-center justify-center text-sm text-neutral-400">
            {{ qrCodeInformation === '正在生成二维码...' ? '加载中...' : '点击获取二维码' }}
          </div>
        </div>
        <p class="qr-code-info">
          {{ qrCodeInformation }}
        </p>
      </div>

      <!-- Register -->
      <div v-else-if="loginMode === 'register'" class="space-y-3">
        <input
          v-model="regPhone"
          type="tel"
          placeholder="手机号"
          maxlength="11"
          class="input-field"
        />
        <div class="flex gap-2">
          <input
            v-model="regCaptcha"
            type="text"
            placeholder="验证码"
            maxlength="6"
            class="input-field flex-1"
          />
          <button
            class="shrink-0 rounded-xl px-4 text-sm font-medium transition-colors"
            :class="regCountdown > 0 ? 'bg-neutral-100 text-neutral-400 dark:bg-[#1F1F2E] dark:text-[#6B6B80]' : 'bg-[#FFF5F3] text-[#E0484D] hover:bg-[#FFE8E3] dark:bg-[rgba(255,90,95,0.15)] dark:text-[#FF7F66]'"
            :disabled="regCountdown > 0"
            @click="sendRegCaptcha"
          >
            {{ regCountdown > 0 ? `${regCountdown}s` : '获取验证码' }}
          </button>
        </div>
        <input
          v-model="regPassword"
          type="password"
          placeholder="设置密码"
          class="input-field"
        />
        <input
          v-model="regNickname"
          type="text"
          placeholder="昵称"
          maxlength="20"
          class="input-field"
        />
        <button
          class="w-full rounded-xl bg-[#FF5A5F] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E0484D] disabled:opacity-50"
          :disabled="!regPhone || !regCaptcha || !regPassword || !regNickname || processing"
          @click="handleRegister"
        >
          {{ processing ? '注册中...' : '注册' }}
        </button>
      </div>

      <!-- Other login methods -->
      <div class="other-login">
        <a v-show="loginMode === 'qr'" @click="loginMode = 'phone'">手机号登录</a>
        <span v-show="loginMode === 'phone'">|</span>
        <a v-show="loginMode === 'phone'" @click="switchToQrMode">二维码登录</a>
        <span v-show="loginMode !== 'register'">|</span>
        <a v-show="loginMode !== 'register'" @click="loginMode = 'register'">注册</a>
        <a v-show="loginMode === 'register'" @click="loginMode = 'phone'">返回登录</a>
      </div>

      <!-- Error message -->
      <p v-if="errorMsg" class="text-center text-sm text-[#FF5A5F]">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendCaptcha as sendCaptchaApi, registerCellphone } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loginMode = ref<'phone' | 'qr' | 'email' | 'register'>('phone')
const phone = ref('')
const captcha = ref('')
const email = ref('')
const emailPassword = ref('')
const countdown = ref(0)
const errorMsg = ref('')
const processing = ref(false)

// 注册表单
const regPhone = ref('')
const regCaptcha = ref('')
const regPassword = ref('')
const regNickname = ref('')
const regCountdown = ref(0)
let regCaptchaTimer: ReturnType<typeof setInterval> | null = null

// QR code state（参照 YPM loginAccount.vue）
const qrCodeKey = ref('')
const qrCodeSvg = ref('')
const qrCodeCheckInterval = ref<ReturnType<typeof setInterval> | null>(null)
const qrCodeInformation = ref('打开网易云音乐APP扫码登录')

let captchaTimer: ReturnType<typeof setInterval> | null = null

// ==================== 手机号登录 =====================

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
    // 如果 captcha 长度 <=6 且为纯数字，视为验证码登录；否则视为密码登录
    let result
    if (/^\d{1,6}$/.test(captcha.value)) {
      result = await userStore.loginByPhone(phone.value, captcha.value)
    } else {
      result = await userStore.loginByPassword(phone.value, captcha.value)
    }
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

// ==================== 邮箱登录 =====================

async function handleEmailLogin() {
  if (!email.value || !emailPassword.value) return
  errorMsg.value = ''
  processing.value = true
  try {
    const result = await userStore.loginByEmail(email.value, emailPassword.value)
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

// ==================== 扫码登录（参照 YPM loginAccount.vue）====================

function switchToQrMode() {
  loginMode.value = 'qr'
  getQrCodeKey()
}

function stopQrPolling() {
  if (qrCodeCheckInterval.value) {
    clearInterval(qrCodeCheckInterval.value)
    qrCodeCheckInterval.value = null
  }
}

/**
 * 获取二维码 Key 并注册会话（两步）
 * Step1: /login/qr/key  → 获取 unikey
 * Step2: /login/qr/create → 注册会话 + 获取二维码内容
 */
async function getQrCodeKey() {
  qrCodeInformation.value = '正在生成二维码...'
  qrCodeSvg.value = ''
  errorMsg.value = ''
  stopQrPolling()

  // Step 1: 获取 unikey
  const key = await userStore.getQrCodeKey()
  if (!key) {
    errorMsg.value = '获取二维码 key 失败'
    qrCodeInformation.value = '获取二维码失败，点击重试'
    return
  }
  qrCodeKey.value = key

  // Step 2: 注册会话（必须！否则服务端不知道该 key，扫码后无法回调）
  const qrimgBase64 = await userStore.getQrCodeImage(key)
  if (!qrimgBase64) {
    errorMsg.value = '生成二维码失败，点击重试'
    return
  }

  // 使用服务端返回的二维码图片（优先使用 base64 图片，兼容性更好）
  qrCodeSvg.value = qrimgBase64

  // 启动轮询
  checkQrCodeLogin()
}

/**
 * 轮询检测扫码状态
 * 参照 YPM loginAccount.vue: checkQrCodeLogin()
 * - 1秒间隔（YPM 也是 1000ms）
 * - 800 过期 → 自动重新生成
 * - 801 等待 → 提示文字
 * - 802 已扫码 → 提示文字
 * - 803 成功 → 清除轮询 + 处理登录
 */
function checkQrCodeLogin() {
  // 清除旧的轮询
  if (qrCodeCheckInterval.value) {
    clearInterval(qrCodeCheckInterval.value)
  }

  qrCodeCheckInterval.value = setInterval(async () => {
    if (!qrCodeKey.value) return

    const result = await userStore.checkQrCodeStatus(qrCodeKey.value)

    if (result.code === 800) {
      // ★ 二维码过期 → 自动重新生成（参照 YPM: this.getQrCodeKey()）
      qrCodeInformation.value = '二维码已失效，请重新扫码'
      getQrCodeKey()
    } else if (result.code === 802) {
      qrCodeInformation.value = '扫描成功，请在手机上确认登录'
    } else if (result.code === 801) {
      qrCodeInformation.value = '打开网易云音乐APP扫码登录'
    } else if (result.code === 803) {
      // ★ 授权登录成功
      if (qrCodeCheckInterval.value) {
        clearInterval(qrCodeCheckInterval.value)
        qrCodeCheckInterval.value = null
      }
      qrCodeInformation.value = '登录成功，请稍等...'

      // ★ 处理登录成功（参照 YPM: result.code = 200; result.cookie = result.cookie.replaceAll(' HTTPOnly', '')）
      if (result.cookie) {
        userStore.handleLoginSuccess(result.cookie)
      }

      // ★ 获取用户资料和歌单（参照 YPM: fetchUserProfile + fetchLikedPlaylist）
      try {
        await userStore.fetchUserProfile()
        await userStore.fetchLikedPlaylist()
      } catch (e) {
        console.error('[QR Login] Failed to fetch user data:', e)
      }

      router.push('/library')
    }
    // 其他状态码继续轮询
  }, 1000)
}

// ==================== 注册 =====================

async function sendRegCaptcha() {
  if (!regPhone.value || regCountdown.value > 0) return
  errorMsg.value = ''
  try {
    await sendCaptchaApi(regPhone.value)
    regCountdown.value = 60
    regCaptchaTimer = setInterval(() => {
      regCountdown.value--
      if (regCountdown.value <= 0) {
        clearInterval(regCaptchaTimer!)
        regCaptchaTimer = null
      }
    }, 1000)
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || '发送验证码失败'
  }
}

async function handleRegister() {
  if (!regPhone.value || !regCaptcha.value || !regPassword.value || !regNickname.value) return
  errorMsg.value = ''
  processing.value = true
  try {
    const res: any = await registerCellphone(regCaptcha.value, regPhone.value, regPassword.value, regNickname.value)
    if (res?.code === 200) {
      if (res.cookie) {
        userStore.handleLoginSuccess(res.cookie)
      }
      await userStore.fetchUserProfile()
      await userStore.fetchLikedPlaylist()
      router.push('/library')
    } else {
      errorMsg.value = res?.message || '注册失败'
    }
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.message || '注册失败'
  } finally {
    processing.value = false
  }
}

// ==================== 生命周期 =====================

// 监听登录模式切换：离开扫码 tab 时停止轮询
watch(loginMode, (mode) => {
  if (mode !== 'qr') {
    stopQrPolling()
  }
})

onMounted(() => {
  // 默认不启动扫码轮询，等用户点击"扫码"tab 时再启动
})

onUnmounted(() => {
  if (qrCodeCheckInterval.value) {
    clearInterval(qrCodeCheckInterval.value)
    qrCodeCheckInterval.value = null
  }
  if (captchaTimer) {
    clearInterval(captchaTimer)
    captchaTimer = null
  }
  if (regCaptchaTimer) {
    clearInterval(regCaptchaTimer)
    regCaptchaTimer = null
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

/* 参照 YPM qr-code-container 样式 */
.qr-code-container {
  background-color: rgba(51, 94, 234, 0.06);
  padding: 24px 24px 21px 24px;
  border-radius: 1.25rem;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.qr-code-container:hover {
  background-color: rgba(51, 94, 234, 0.1);
}

.dark .qr-code-container {
  background-color: rgba(51, 94, 234, 0.1);
}

.qr-code-info {
  color: var(--color-text, #666);
  text-align: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.other-login {
  margin-top: 8px;
  font-size: 13px;
  text-align: center;
  color: #666;
  opacity: 0.68;
}

.dark .other-login {
  color: #A1A1B5;
}

.other-login a {
  padding: 0 8px;
  cursor: pointer;
}

.other-login a:hover {
  color: #335eea;
}
</style>
