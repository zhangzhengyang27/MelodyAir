import request from './index'

/**
 * 模拟浏览器 UA，避免被网易云盾识别为机器人环境
 * 文档: 接口支持手动传入 ua 参数,修改 user-agent
 */
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// 手机号登录（支持密码/验证码）
export const loginCellphone = (params: { phone: string; password?: string; captcha?: string; countrycode?: string; md5_password?: string }) =>
  request.post('/login/cellphone', null, { params: { ...params, timestamp: Date.now(), ua: BROWSER_UA } })

// 邮箱登录
export const loginEmail = (email: string, password: string, md5_password?: string) =>
  request.get('/login', { params: { email, password, md5_password, timestamp: Date.now(), ua: BROWSER_UA } })

// 游客登录
export const loginAnonimous = () =>
  request.get('/register/anonimous', { params: { timestamp: Date.now(), ua: BROWSER_UA } })

// 二维码 key 生成接口
export const loginQrCodeKey = () =>
  request.get('/login/qr/key', { params: { timestamp: Date.now(), ua: BROWSER_UA } })

// 二维码生成接口（创建二维码图片）
export const loginQrCodeCreate = (key: string, qrimg = true) =>
  request.get('/login/qr/create', { params: { key, qrimg, platform: 'web', timestamp: Date.now(), ua: BROWSER_UA } })

// 二维码检测扫码状态接口
export const loginQrCodeCheck = (key: string) =>
  request.get('/login/qr/check', { params: { key, timestamp: Date.now(), ua: BROWSER_UA } })

// 登录状态
export const getLoginStatus = () => request.get('/login/status')

// 刷新登录
export const refreshCookie = () => request.get('/login/refresh', { params: { timestamp: Date.now() } })

// 退出登录
export const logout = () => request.get('/logout')

// 发送验证码
export const sendCaptcha = (phone: string, ctcode = 86) =>
  request.post('/captcha/sent', null, { params: { phone, ctcode, timestamp: Date.now(), ua: BROWSER_UA } })

// 验证验证码
export const verifyCaptcha = (phone: string, captcha: string, ctcode = 86) =>
  request.post('/captcha/verify', null, { params: { phone, captcha, ctcode, timestamp: Date.now(), ua: BROWSER_UA } })

// 注册（修改密码）
export const registerCellphone = (captcha: string, phone: string, password: string, nickname: string, countrycode = 86) =>
  request.get('/register/cellphone', { params: { captcha, phone, password, nickname, countrycode, timestamp: Date.now(), ua: BROWSER_UA } })

// 检测手机号是否已注册
export const checkCellphoneExistence = (phone: string, countrycode = 86) =>
  request.get('/cellphone/existence/check', { params: { phone, countrycode } })

// 初始化昵称
export const activateInitProfile = (nickname: string) =>
  request.get('/activate/init/profile', { params: { nickname } })

// 重复昵称检测
export const checkNickname = (nickname: string) =>
  request.get('/nickname/check', { params: { nickname } })
