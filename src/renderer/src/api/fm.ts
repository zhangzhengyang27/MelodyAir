import request from './index'
import type { ApiResponse, FmTrack } from '@/types/api'

// 私人 FM
export const getPersonalFm = (): Promise<ApiResponse<{ data: FmTrack[] }>> => request.get('/personal_fm')

// 私人 FM 模式选择
export const getPersonalFmMode = (mode: string, submode?: string): Promise<ApiResponse> =>
  request.get('/personal/fm/mode', { params: { mode, submode } })

// FM 垃圾桶
export const fmTrash = (id: number): Promise<ApiResponse> =>
  request.get('/fm_trash', { params: { id } })
