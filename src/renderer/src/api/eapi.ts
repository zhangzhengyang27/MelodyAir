import request from './index'
import type { ApiResponse, EapiDecryptResult } from '@/types/api'

/**
 * eapi 解密结果
 */
export interface EapiDecryptResult {
  code: number
  data: {
    /** 解密后的 URL（仅请求解密） */
    url?: string
    /** 解密后的数据对象 */
    data?: Record<string, unknown>
  } | Record<string, unknown>
}

/**
 * 解密 eapi 请求或响应
 * @param hexString 十六进制字符串
 * @param isReq true=请求解密，false=响应解密（默认 true）
 */
export const decryptEapi = (hexString: string, isReq = true): Promise<ApiResponse> =>
  request.post('/eapi/decrypt', { hexString, isReq })

/**
 * 解密 eapi 响应（hex → JSON）
 */
export const decryptEapiResponse = (hexString: string) =>
  decryptEapi(hexString, false)

/**
 * 解密 eapi 请求（hex → { url, data }）
 */
export const decryptEapiRequest = (hexString: string) =>
  decryptEapi(hexString, true)
