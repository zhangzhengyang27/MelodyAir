import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  cookie: { value: null as string | null },
  apiBase: { value: 'http://test-api' },
  logout: vi.fn(),
}))

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ apiBase: h.apiBase.value }),
}))
vi.mock('@/api/cookie', () => ({
  getCookieString: () => h.cookie.value,
}))
vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ logout: h.logout }),
}))

import request from '../index'

interface InterceptorHandler {
  fulfilled: (input: any) => any
  rejected?: (error: any) => any
}
const reqHandlers = (request.interceptors as any).request.handlers as InterceptorHandler[]
const resHandlers = (request.interceptors as any).response.handlers as InterceptorHandler[]
const onRequest = (config: Record<string, unknown>) => reqHandlers[0]!.fulfilled(config)
const onResponse = (response: unknown) => resHandlers[0]!.fulfilled(response)
const onResponseError = (error: unknown) => resHandlers[0]!.rejected!(error)

beforeEach(() => {
  h.cookie.value = null
  h.logout.mockClear()
})

describe('请求拦截器', () => {
  it('baseURL 动态取自 settings store', async () => {
    const cfg = await onRequest({ url: '/playlist/hot', method: 'get' })
    expect(cfg.baseURL).toBe('http://test-api')
  })

  it('GET 且命中登录白名单时把 cookie 注入 params', async () => {
    h.cookie.value = 'MUSIC_U=tok'
    const cfg = await onRequest({ url: '/likelist', method: 'get', params: { limit: 10 } })
    expect(cfg.params).toEqual({ limit: 10, cookie: 'MUSIC_U=tok' })
  })

  it('未命中登录白名单的接口不注入 cookie', async () => {
    h.cookie.value = 'MUSIC_U=tok'
    const cfg = await onRequest({ url: '/playlist/hot', method: 'get', params: {} })
    expect(cfg.params).toEqual({})
  })

  it('POST 命中白名单时把 cookie 合并进请求体', async () => {
    h.cookie.value = 'MUSIC_U=tok'
    const cfg = await onRequest({ url: '/like', method: 'post', data: { id: 1 } })
    expect(cfg.data).toEqual({ id: 1, cookie: 'MUSIC_U=tok' })
  })

  it('白名单接口在无 cookie 时直接拦截（ACCOUNT_REQUIRED）', async () => {
    await expect(onRequest({ url: '/personal_fm', method: 'get' })).rejects.toMatchObject({
      message: 'ACCOUNT_REQUIRED',
    })
  })

  it('登录相关接口即使有 cookie 也不注入', async () => {
    h.cookie.value = 'MUSIC_U=tok'
    const login = await onRequest({ url: '/login', method: 'post', data: { username: 'a' } })
    expect(login.data).toEqual({ username: 'a' })
    const qr = await onRequest({ url: '/login/qr/create', method: 'get', params: {} })
    expect(qr.params).toEqual({})
  })
})

describe('响应拦截器', () => {
  it('成功响应直接返回 response.data', async () => {
    const data = await onResponse({ data: { code: 200, songs: [] } })
    expect(data).toEqual({ code: 200, songs: [] })
  })

  it('body.code=301 时触发登出并抛出过期错误', async () => {
    await expect(
      onResponse({ data: { code: 301 }, config: { method: 'get', url: '/login/status' } })
    ).rejects.toThrow('Token expired, please login again')
    expect(h.logout).toHaveBeenCalledTimes(1)
  })

  it('HTTP 429 重写为可读限流文案并打上 isRateLimited', async () => {
    const err: Record<string, any> = {
      response: { status: 429, config: { url: '/login/cellphone' }, data: {} },
    }
    await expect(onResponseError(err)).rejects.toBe(err)
    expect(err.isRateLimited).toBe(true)
    expect(err.message).toBe('操作过于频繁，请稍后再试')
  })

  it('旧后端 400 消息含 status 301 时同样触发登出', async () => {
    const err = {
      response: {
        status: 400,
        config: { url: '/user/account' },
        data: { message: 'login failed, status 301' },
      },
    }
    await expect(onResponseError(err)).rejects.toBe(err)
    expect(h.logout).toHaveBeenCalledTimes(1)
  })
})
