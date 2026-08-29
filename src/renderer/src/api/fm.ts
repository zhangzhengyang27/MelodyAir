import request from './index'
import type { ApiResponse, FmTrack } from '@/types/api'
import { logger } from '@/utils/logger'

// 私人 FM（部分后端仅注册 /personal/fm，/personal_fm 会 404）
export const getPersonalFm = (): Promise<ApiResponse<{ data: FmTrack[] }>> => request.get('/personal/fm')

// 私人 FM 模式选择
export const getPersonalFmMode = (mode: string, submode?: string): Promise<ApiResponse> =>
  request.get('/personal/fm/mode', { params: { mode, submode } })

// FM 垃圾桶（部分后端未提供 /fm_trash：404 时静默降级，仅本地移除、不向服务端上报）
export const fmTrash = async (id: number): Promise<ApiResponse> => {
  try {
    return await request.get('/fm_trash', { params: { id } })
  } catch (e: any) {
    if (e?.response?.status === 404) {
      logger.warn('api', '当前后端不支持 /fm_trash，已降级为仅本地移除')
      return { code: 200 } as ApiResponse
    }
    throw e
  }
}
