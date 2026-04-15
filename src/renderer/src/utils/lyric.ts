/**
 * 单行歌词数据结构
 */
export interface LyricLine {
  time: number
  text: string
  translatedText?: string
  /** 逐字歌词时间戳（可选） */
  words?: { time: number; text: string }[]
}

/** Parse LRC format lyrics (支持翻译和逐字歌词) */
export function parseLyric(lrc: string): LyricLine[] {
  const lines = lrc.split('\n')
  const result: LyricLine[] = []

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
  // 逐字歌词格式：歌(00:00.50)词(00:01.00)
  const wordRegex = /([^\[\(]+)\((\d{2}):(\d{2})\.(\d{2,3})\)/g

  for (const line of lines) {
    const times: number[] = []
    let match: RegExpExecArray | null

    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1])
      const sec = parseInt(match[2])
      const ms = parseInt(match[3].padEnd(3, '0'))
      times.push(min * 60 + sec + ms / 1000)
    }

    const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim()

    // 处理翻译文本（格式：原文 / 翻译文）
    let mainText = text
    let translatedText: string | undefined

    if (text.includes(' / ') || text.includes('/')) {
      const parts = text.split(/(?<!\s)\/(?!\\s)/)
      if (parts.length === 2) {
        mainText = parts[0]?.trim() ?? text
        translatedText = parts[1]?.trim()
      }
    }

    // 检测逐字歌词格式
    const words: { time: number; text: string }[] = []
    let wordMatch: RegExpExecArray | null
    let cleanText = ''
    const wordTimeRegex = /([^\(\)]+)\((\d{2}):(\d{2})\.(\d{2,3})\)/g

    while ((wordMatch = wordTimeRegex.exec(mainText)) !== null) {
      const wordText = wordMatch[1]
      const wordMin = parseInt(wordMatch[2])
      const wordSec = parseInt(wordMatch[3])
      const wordMs = parseInt(wordMatch[4].padEnd(3, '0'))
      const wordTime = wordMin * 60 + wordSec + wordMs / 1000
      words.push({ time: wordTime, text: wordText })
      cleanText += wordText
    }

    // 如果有逐字时间戳，使用解析后的纯文本
    const finalText = words.length > 0 ? cleanText : mainText

    for (const time of times) {
      if (finalText) {
        result.push({
          time,
          text: finalText,
          translatedText,
          words: words.length > 0 ? words : undefined
        })
      }
    }
  }

  return result.sort((a, b) => a.time - b.time)
}

/** 合并原始歌词和翻译歌词 */
export function mergeLyricsWithTranslation(
  originalLyrics: LyricLine[],
  translationLRC?: string
): LyricLine[] {
  if (!translationLRC) return originalLyrics

  const translations = parseLyric(translationLRC)

  return originalLyrics.map((line) => {
    const translation = translations.find(
      (t) => Math.abs(t.time - line.time) < 0.5 // 允许 0.5 秒的时间差
    )

    if (translation && !line.translatedText) {
      return { ...line, translatedText: translation.text }
    }

    return line
  })
}

/** Find current lyric index by time (二分查找，O(log n)) */
export function findCurrentLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (lyrics.length === 0) return 0
  let low = 0, high = lyrics.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (lyrics[mid]!.time <= currentTime) low = mid + 1
    else high = mid - 1
  }
  return Math.max(0, high)
}

/**
 * 格式化时间显示（mm:ss 或 mm:ss.ms）
 */
export function formatTime(seconds: number, showMs = false): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)

  if (showMs) {
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

/**
 * 检查两行歌词之间是否有时间间隙（用于检测器乐间奏等）
 */
export function hasTimeGap(lyrics: LyricLine[], index: number, threshold = 10): boolean {
  if (index < 0 || index >= lyrics.length - 1) return false
  return lyrics[index + 1]!.time - lyrics[index]!.time > threshold
}
