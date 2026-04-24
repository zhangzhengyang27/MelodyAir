import type { ParsedLyricLine, ParsedLyricWord } from '../types/lyrics'

export function parseLrc(rawText: string): ParsedLyricLine[] {
  const result: ParsedLyricLine[] = []
  const lines = rawText.split(/\r?\n/)
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g

  for (const row of lines) {
    timeRegex.lastIndex = 0
    const times: number[] = []
    let match: RegExpExecArray | null

    while ((match = timeRegex.exec(row)) !== null) {
      const min = Number(match[1])
      const sec = Number(match[2])
      const ms = Number((match[3] ?? '0').padEnd(3, '0'))
      times.push(min * 60 * 1000 + sec * 1000 + ms)
    }

    if (!times.length) continue

    const rawTextWithoutTime = row.replace(timeRegex, '').trim()
    const { text, translation } = splitTranslation(rawTextWithoutTime)
    const { cleanText, words } = parseWordTiming(text)

    for (const time of times) {
      result.push({
        time,
        text: cleanText || text,
        translation,
        raw: row,
        words: words.length > 0 ? words : undefined,
      })
    }
  }

  return result.sort((a, b) => a.time - b.time)
}

function splitTranslation(text: string): { text: string; translation?: string } {
  const parts = text.split(/\s+\/\s+/)
  if (parts.length >= 2) {
    return {
      text: parts[0]?.trim() ?? text,
      translation: parts.slice(1).join(' / ').trim() || undefined,
    }
  }

  return { text }
}

function parseWordTiming(text: string): { cleanText: string; words: ParsedLyricWord[] } {
  const wordRegex = /([^()]+)\((\d{2}):(\d{2})(?:\.(\d{2,3}))?\)/g
  const words: ParsedLyricWord[] = []
  let cleanText = ''
  let match: RegExpExecArray | null

  while ((match = wordRegex.exec(text)) !== null) {
    const wordText = match[1]?.trim() ?? ''
    const min = Number(match[2])
    const sec = Number(match[3])
    const ms = Number((match[4] ?? '0').padEnd(3, '0'))
    words.push({
      text: wordText,
      time: min * 60 * 1000 + sec * 1000 + ms,
    })
    cleanText += wordText
  }

  return {
    cleanText: words.length > 0 ? cleanText : text,
    words,
  }
}

export function mergeLyricsWithTranslation(
  originalLyrics: ParsedLyricLine[],
  translationLrc?: string,
): ParsedLyricLine[] {
  if (!translationLrc) return originalLyrics

  const translations = parseLrc(translationLrc)
  return originalLyrics.map((line) => {
    const translation = translations.find((t) => Math.abs(t.time - line.time) < 500)
    if (translation && !line.translation) {
      return { ...line, translation: translation.text }
    }
    return line
  })
}

export function mergeLyricsWithRomanization(
  originalLyrics: ParsedLyricLine[],
  romanizationLrc?: string,
): ParsedLyricLine[] {
  if (!romanizationLrc) return originalLyrics

  const romanizations = parseLrc(romanizationLrc)
  return originalLyrics.map((line) => {
    const romanization = romanizations.find((r) => Math.abs(r.time - line.time) < 500)
    if (romanization && !line.romanized) {
      return { ...line, romanized: romanization.text }
    }
    return line
  })
}
