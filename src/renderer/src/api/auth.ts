import request from './index'

// 手机号登录（POST + body）
export const loginCellphone = (phone: string, captcha: string) =>
  request.post('/login/cellphone', { phone, captcha })

// 发送验证码（POST + body）
export const sendCaptcha = (phone: string) =>
  request.post('/captcha/sent', { cellphone: phone })

// 二维码登录 - 获取 key（GET）
export const getQrKey = () => request.get('/login/qr/key')

// 二维码登录 - 生成二维码（GET）
export const createQr = (key: string, qrimg = true) =>
  request.get('/login/qr/create', { params: { key, qrimg } })

// 二维码登录 - 检查扫码状态（GET）
export const checkQr = (key: string) =>
  request.get('/login/qr/check', { params: { key } })

// 登录状态（GET）
export const getLoginStatus = () => request.get('/login/status')

// 退出登录（POST）
export const logout = () => request.post('/logout', {})
