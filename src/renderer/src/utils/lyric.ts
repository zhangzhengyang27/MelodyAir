/**
 * 单行歌词数据结构
 */
export interface LyricLine {
  time: number
  text: string
  translatedText?: string
}

/** Parse LRC format lyrics (支持翻译) */
export function parseLyric(lrc: string): LyricLine[] {
  const lines = lrc.split('\n')
  const result: LyricLine[] = []

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

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

    for (const time of times) {
      if (mainText) {
        result.push({ time, text: mainText, translatedText })
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

/** Find current lyric index by time */
export function findCurrentLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) {
      return i
    }
  }
  return 0
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
