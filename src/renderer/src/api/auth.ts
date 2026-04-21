import request from './index'
import { BROWSER_UA } from '@/constants'
import type { LoginResponse, QrCodeKeyResponse, QrCodeCreateResponse, QrCodeCheckResponse, LoginStatusResponse, ApiResponse } from '@/types/api'

// 手机号登录（支持密码/验证码）
export const loginCellphone = (params: { phone: string; password?: string; captcha?: string; countrycode?: string; md5_password?: string }): Promise<LoginResponse> =>
  request.post('/login/cellphone', null, { params: { ...params, timestamp: Date.now(), ua: BROWSER_UA } })

// 邮箱登录
export const loginEmail = (email: string, password: string, md5_password?: string): Promise<LoginResponse> =>
  request.get('/login', { params: { email, password, md5_password, timestamp: Date.now(), ua: BROWSER_UA } })

// 游客登录
export const loginAnonimous = (): Promise<LoginResponse> =>
  request.get('/register/anonimous', { params: { timestamp: Date.now(), ua: BROWSER_UA } })

// 二维码 key 生成接口
export const loginQrCodeKey = (): Promise<QrCodeKeyResponse> =>
  request.get('/login/qr/key', { params: { timestamp: Date.now(), ua: BROWSER_UA } })

// 二维码生成接口（创建二维码图片）
export const loginQrCodeCreate = (key: string, qrimg = true): Promise<QrCodeCreateResponse> =>
  request.get('/login/qr/create', { params: { key, qrimg, platform: 'web', timestamp: Date.now(), ua: BROWSER_UA } })

// 二维码检测扫码状态接口
export const loginQrCodeCheck = (key: string): Promise<QrCodeCheckResponse> =>
  request.get('/login/qr/check', { params: { key, timestamp: Date.now(), ua: BROWSER_UA } })

// 登录状态
export const getLoginStatus = (): Promise<LoginStatusResponse> => request.get('/login/status')

// 刷新登录
export const refreshCookie = (): Promise<ApiResponse> => request.get('/login/refresh', { params: { timestamp: Date.now() } })

// 退出登录
export const logout = (): Promise<ApiResponse> => request.get('/logout')

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
