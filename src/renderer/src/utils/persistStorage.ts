/**
 * 持久化节流存储（pinia-plugin-persistedstate 自定义 storage）
 *
 * 背景：插件对 store 的任意深层 mutation 都会 deepPick + JSON.stringify + localStorage.setItem。
 * 播放期间 currentTime 等瞬态字段高频变化，虽然其不在 pick 列表内（序列化结果不变），
 * 但默认 storage 每次都会同步写盘，造成每秒数十次 50KB+ 的 localStorage 写入。
 *
 * 策略：
 * - 去重：序列化结果与上次相同（瞬态字段变化）→ 直接跳过写盘
 * - 节流：500ms 合并写入（playlist 等真实变更也只落盘最终态）
 * - 兜底：pagehide / visibilitychange(hidden) 时同步 flush，避免关窗丢最后状态
 */

const WRITE_DELAY_MS = 500

interface StorageEntry {
  /** 最近一次已落盘内容 */
  last: string | null
  /** 待落盘内容（最新值） */
  pending: string | null
  timer: ReturnType<typeof setTimeout> | null
}

const entries = new Map<string, StorageEntry>()

function getEntry(key: string): StorageEntry {
  let entry = entries.get(key)
  if (!entry) {
    entry = { last: null, pending: null, timer: null }
    entries.set(key, entry)
  }
  return entry
}

function flushEntry(key: string, entry: StorageEntry): void {
  if (entry.timer !== null) {
    clearTimeout(entry.timer)
    entry.timer = null
  }
  if (entry.pending !== null) {
    try {
      localStorage.setItem(key, entry.pending)
    } catch {
      // 配额满等存储异常忽略（与原默认行为一致：序列化异常已在插件层吞掉）
    }
    entry.last = entry.pending
    entry.pending = null
  }
}

function flushAll(): void {
  for (const [key, entry] of entries) {
    flushEntry(key, entry)
  }
}

// 页面隐藏/关闭时把未落盘状态写出去（Electron 关窗、Web 刷新均会触发）
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll()
  })
}

export const throttledPersistStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(key)
  },
  setItem(key: string, value: string): void {
    const entry = getEntry(key)
    // 与最近已写入内容相同（仅瞬态字段变化，pick 未覆盖）→ 跳过
    if (value === entry.last && entry.pending === null) return
    // 与已排队的待写内容相同 → 跳过
    if (value === entry.pending) return
    entry.pending = value
    // 已有待写任务则只更新 pending，到期统一写最新值
    if (entry.timer !== null) return
    entry.timer = setTimeout(() => {
      entry.timer = null
      flushEntry(key, entry)
    }, WRITE_DELAY_MS)
  },
  removeItem(key: string): void {
    const entry = entries.get(key)
    if (entry) {
      if (entry.timer !== null) {
        clearTimeout(entry.timer)
        entry.timer = null
      }
      entry.pending = null
      entry.last = null
    }
    localStorage.removeItem(key)
  },
}
