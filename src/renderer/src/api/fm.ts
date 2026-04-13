import request from './index'

// 私人 FM
export const getPersonalFm = () => request.get('/personal_fm')

// 私人 FM 模式选择
export const getPersonalFmMode = (mode: string, submode?: string) =>
  request.get('/personal/fm/mode', { params: { mode, submode } })

// FM 垃圾桶
export const fmTrash = (id: number) =>
  request.get('/fm_trash', { params: { id } })
