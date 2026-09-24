import { describe, it, expect } from 'vitest'
import {
  parseLyric,
  mergeLyricsWithTranslation,
  mergeLyricsWithRomanization,
  findCurrentLyricIndex,
  formatTime,
  hasTimeGap,
} from '../lyric'

describe('parseLyric', () => {
  it('解析单行单时间戳', () => {
    const result = parseLyric('[00:01.50]Hello')
    expect(result).toEqual([{ time: 1.5, text: 'Hello' }])
  })

  it('一行多个时间戳展开为多行并按时间排序', () => {
    const result = parseLyric('[01:10.00][00:01.50]Hello/你好')
    expect(result).toEqual([
      { time: 1.5, text: 'Hello', translatedText: '你好' },
      { time: 70, text: 'Hello', translatedText: '你好' },
    ])
  })

  it('两位毫秒按 1/100 秒解析（05 → 0.05s）', () => {
    const result = parseLyric('[00:01.05]Hi')
    expect(result[0]!.time).toBeCloseTo(1.05, 5)
  })

  it('翻译分割：无空格的 原文/译文 会拆分；"原文 / 译文" 因 lookbehind 限制不拆分（记录现状）', () => {
    const tight = parseLyric('[00:01.00]Hello/你好')
    expect(tight[0]!.text).toBe('Hello')
    expect(tight[0]!.translatedText).toBe('你好')

    const spaced = parseLyric('[00:01.00]Hello / 你好')
    expect(spaced[0]!.text).toBe('Hello / 你好')
    expect(spaced[0]!.translatedText).toBeUndefined()
  })

  it('逐字歌词解析出 words 并合成纯文本', () => {
    const result = parseLyric('[00:10.00]歌(00:10.00)词(00:11.50)')
    expect(result).toHaveLength(1)
    expect(result[0]!.text).toBe('歌词')
    expect(result[0]!.words).toEqual([
      { time: 10, text: '歌' },
      { time: 11.5, text: '词' },
    ])
  })
})

describe('mergeLyricsWithTranslation', () => {
  it('按 0.5s 容差合并译文，且不覆盖已有译文', () => {
    const original = [
      { time: 10, text: 'Hello' },
      { time: 12, text: 'World', translatedText: '已有' },
    ]
    const merged = mergeLyricsWithTranslation(original, '[00:10.20]你好\n[00:12.40]世界')
    expect(merged[0]!.translatedText).toBe('你好')
    expect(merged[1]!.translatedText).toBe('已有')
  })

  it('无翻译 LRC 时原样返回', () => {
    const original = [{ time: 10, text: 'Hello' }]
    expect(mergeLyricsWithTranslation(original)).toBe(original)
  })
})

describe('mergeLyricsWithRomanization', () => {
  it('合并音译歌词', () => {
    const original = [{ time: 10, text: '你好' }]
    const merged = mergeLyricsWithRomanization(original, '[00:10.00]ni hao')
    expect(merged[0]!.romanizedText).toBe('ni hao')
  })
})

describe('findCurrentLyricIndex', () => {
  const lyrics = [
    { time: 1, text: 'a' },
    { time: 5, text: 'b' },
    { time: 9, text: 'c' },
  ]
  it('空歌词返回 0', () => expect(findCurrentLyricIndex([], 10)).toBe(0))
  it('时间早于第一句返回 0', () => expect(findCurrentLyricIndex(lyrics, 0)).toBe(0))
  it('落在某句上返回该句索引', () => expect(findCurrentLyricIndex(lyrics, 5)).toBe(1))
  it('晚于最后一句返回最后一句索引', () => expect(findCurrentLyricIndex(lyrics, 100)).toBe(2))
})

describe('formatTime', () => {
  it('输出 mm:ss，showMs 时带两位毫秒', () => {
    expect(formatTime(65.5)).toBe('01:05')
    expect(formatTime(65.5, true)).toBe('01:05.50')
    expect(formatTime(5)).toBe('00:05')
  })
})

describe('hasTimeGap', () => {
  it('检测超过阈值的句间间隙', () => {
    const lyrics = [{ time: 1, text: 'a' }, { time: 20, text: 'b' }]
    expect(hasTimeGap(lyrics, 0)).toBe(true)
    expect(hasTimeGap(lyrics, 0, 30)).toBe(false)
    expect(hasTimeGap(lyrics, 1)).toBe(false)
    expect(hasTimeGap([], 0)).toBe(false)
  })
})
