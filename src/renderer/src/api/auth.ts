import request from './index'

// 手机号登录（POST + body）
export const loginCellphone = (phone: string, captcha: string) =>
  request.post('/login/cellphone', { phone, captcha })

// 发送验证码（POST + query，与后端 @Query() 对齐）
export const sendCaptcha = (phone: string) =>
  request.post('/captcha/sent', null, { params: { phone } })

// 二维码 key 生成接口（GET）
export const loginQrCodeKey = () =>
  request.get('/login/qr/key', { params: { timestamp: Date.now() } })

// 二维码检测扫码状态接口（GET）
// 轮询此接口可获取二维码扫码状态:
// 800=二维码过期, 801=等待扫码, 802=待确认, 803=授权登录成功(803状态码下会返回cookies)
export const loginQrCodeCheck = (key: string) =>
  request.get('/login/qr/check', { params: { key, timestamp: Date.now() } })

// 登录状态（GET）
export const getLoginStatus = () => request.get('/login/status')

// 刷新登录（POST）
export const refreshCookie = () => request.post('/login/refresh', {})

// 退出登录（POST）
export const logout = () => request.post('/logout', {})
