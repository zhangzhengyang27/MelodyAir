// 歌词解析类型定义

export interface ParsedLyricLine {
  /** 时间戳（毫秒） */
  time: number
  /** 歌词文本 */
  text: string
  /** 翻译文本 */
  translation?: string
  /** 罗马音/音译文本 */
  romanized?: string
}

/** LRC 解析结果 */
export interface ParsedLrc {
  metadata?: Record<string, string>
  lines: ParsedLyricLine[]
}

/** 歌词同步引擎配置 */
export interface LyricsSyncConfig {
  offsetMs?: number
  toleranceMs?: number
}

/** 歌词同步结果 */
export interface LyricsSyncResult {
  index: number
  changed: boolean
}
