import type { ParsedLyricLine, LyricsSyncConfig, LyricsSyncResult } from '@/types/lyrics'

export class LyricsSyncEngine {
  private lines: ParsedLyricLine[] = []
  private currentIndex = -1
  private offsetMs: number
  private toleranceMs: number

  constructor(config: LyricsSyncConfig = {}) {
    this.offsetMs = config.offsetMs ?? 0
    this.toleranceMs = config.toleranceMs ?? 100
  }

  setLines(lines: ParsedLyricLine[]) {
    this.lines = lines
  }

  setOffsetMs(offsetMs: number) {
    this.offsetMs = offsetMs
  }

  reset() {
    this.currentIndex = -1
  }

  update(currentTimeMs: number): LyricsSyncResult {
    if (!this.lines.length) {
      return { index: -1, changed: false }
    }

    const adjustedTime = currentTimeMs + this.offsetMs

    // 二分查找当前行
    let left = 0
    let right = this.lines.length - 1
    let targetIndex = -1

    // 找到最后一个小于等于当前时间的行
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const lineTime = this.lines[mid].time

      if (lineTime <= adjustedTime) {
        targetIndex = mid
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    // 检查是否需要容差匹配
    if (targetIndex >= 0 && targetIndex < this.lines.length - 1) {
      const nextLineTime = this.lines[targetIndex + 1].time
      // 如果下一行时间也在容差范围内，继续往后找
      while (
        targetIndex < this.lines.length - 1 &&
        Math.abs(this.lines[targetIndex + 1].time - adjustedTime) < this.toleranceMs
      ) {
        targetIndex++
      }
    }

    const changed = targetIndex !== this.currentIndex
    this.currentIndex = targetIndex

    return { index: targetIndex, changed }
  }
}
