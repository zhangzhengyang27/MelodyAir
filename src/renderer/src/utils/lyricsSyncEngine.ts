import type { ParsedLyricLine } from '../types/lyrics'

export interface LyricsSyncEngineOptions {
  offsetMs?: number
  toleranceMs?: number
}

export interface LyricsSyncResult {
  index: number
  line: ParsedLyricLine | null
  changed: boolean
}

export class LyricsSyncEngine {
  private lines: ParsedLyricLine[] = []
  private offsetMs = 0
  private toleranceMs = 120
  private currentIndex = -1

  constructor(options?: LyricsSyncEngineOptions) {
    if (typeof options?.offsetMs === 'number') this.offsetMs = options.offsetMs
    if (typeof options?.toleranceMs === 'number') this.toleranceMs = options.toleranceMs
  }

  setLines(lines: ParsedLyricLine[]) {
    this.lines = [...lines].sort((a, b) => a.time - b.time)
    this.currentIndex = -1
  }

  setOffsetMs(offsetMs: number) {
    this.offsetMs = offsetMs
  }

  getOffsetMs() {
    return this.offsetMs
  }

  reset() {
    this.currentIndex = -1
  }

  update(currentTimeSec: number): LyricsSyncResult {
    if (this.lines.length === 0) {
      this.currentIndex = -1
      return { index: -1, line: null, changed: false }
    }

    const targetMs = currentTimeSec * 1000 + this.offsetMs
    const nextIndex = this.findCurrentIndex(targetMs)
    const changed = nextIndex !== this.currentIndex
    this.currentIndex = nextIndex

    return {
      index: nextIndex,
      line: nextIndex >= 0 ? this.lines[nextIndex] ?? null : null,
      changed,
    }
  }

  seek(currentTimeSec: number): LyricsSyncResult {
    return this.update(currentTimeSec)
  }

  getCurrentIndex() {
    return this.currentIndex
  }

  getCurrentLine() {
    return this.currentIndex >= 0 ? this.lines[this.currentIndex] ?? null : null
  }

  getPrevLine() {
    const idx = this.currentIndex - 1
    return idx >= 0 ? this.lines[idx] ?? null : null
  }

  getNextLine() {
    const idx = this.currentIndex + 1
    return idx < this.lines.length ? this.lines[idx] ?? null : null
  }

  private findCurrentIndex(targetMs: number) {
    let left = 0
    let right = this.lines.length - 1
    let result = -1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const lineTime = this.lines[mid]!.time

      if (lineTime <= targetMs + this.toleranceMs) {
        result = mid
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return result
  }
}
