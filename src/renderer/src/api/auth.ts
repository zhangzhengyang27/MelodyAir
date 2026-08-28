import request from './index'
import { BROWSER_UA } from '@/constants'
import type { LoginResponse, LoginStatusResponse, ApiResponse } from '@/types/api'

// 手机验证码登录
export const loginCellphone = (params: { phone: string; captcha: string; countrycode?: string }): Promise<LoginResponse> =>
  request.post('/login/cellphone', null, { params: { ...params, timestamp: Date.now(), ua: BROWSER_UA } })

// 游客登录
export const loginAnonimous = (): Promise<LoginResponse> =>
  request.get('/register/anonimous', { params: { timestamp: Date.now(), ua: BROWSER_UA } })

// 登录状态
export const getLoginStatus = (): Promise<LoginStatusResponse> => request.get('/login/status')

// 刷新登录
export const refreshCookie = (): Promise<ApiResponse> => request.get('/login/refresh', { params: { timestamp: Date.now() } })

// 退出登录
export const logout = (): Promise<ApiResponse> => request.get('/logout')

// 发送验证码
export const sendCaptcha = (phone: string, ctcode = 86) =>
  request.post('/captcha/sent', null, { params: { phone, ctcode, timestamp: Date.now(), ua: BROWSER_UA } })
