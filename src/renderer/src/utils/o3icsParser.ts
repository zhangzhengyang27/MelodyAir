import type { ParsedLrc, ParsedLyricLine } from '@/types/o3ics'

/**
 * 解析 LRC 格式歌词
 * 支持：
 * - [mm:ss.xx] 或 [mm:ss.xxx] 格式的时间戳
 * - 逐字歌词格式 [mm:ss.xx](xxx)
 * - 元数据标签 [ti:xxx], [ar:xxx], [al:xxx], [by:xxx]
 */
export function parseLrc(lrcText: string): ParsedLyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') {
    return []
  }

  const lines: ParsedLyricLine[] = []
  const rawLines = lrcText.split('\n')

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    // 跳过元数据标签
    if (/^\[(ti|ar|al|by|offset|length):/.test(trimmed)) {
      continue
    }

    // 匹配时间戳: [mm:ss.xx] 或 [mm:ss.xxx] 或 [mm:ss]
    const timeMatch = trimmed.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/)
    if (!timeMatch) continue

    const minutes = parseInt(timeMatch[1], 10)
    const seconds = parseInt(timeMatch[2], 10)
    const centiseconds = timeMatch[3]
      ? timeMatch[3].padEnd(3, '0').slice(0, 3)
      : '000'
    const timeMs = minutes * 60 * 1000 + seconds * 1000 + parseInt(centiseconds, 10)

    // 提取歌词文本（去除所有时间戳）
    const text = trimmed
      .replace(/\[\d{1,2}:\d{2}(?:\.\d{2,3})?\]/g, '')
      .trim()

    if (text) {
      lines.push({ time: timeMs, text })
    }
  }

  // 按时间排序
  lines.sort((a, b) => a.time - b.time)

  return lines
}

/**
 * 将 ParsedLyricLine 数组转回 LRC 格式文本
 */
export function toLrc(lines: ParsedLyricLine[]): string {
  return lines
    .map((line) => {
      const minutes = Math.floor(line.time / 60000)
      const seconds = Math.floor((line.time % 60000) / 1000)
      const centiseconds = String(line.time % 1000).padStart(3, '0')
      const timeStr = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${centiseconds}]`
      let text = timeStr + line.text
      if (line.translation) {
        text += line.translation
      }
      return text
    })
    .join('\n')
}
