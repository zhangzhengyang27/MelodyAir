import request from './index'

// 私人 FM
export const getPersonalFm = () => request.get('/personal/fm')

// FM 垃圾桶
export const fmTrash = (id: number) =>
  request.get('/fm/trash', { params: { id } })
