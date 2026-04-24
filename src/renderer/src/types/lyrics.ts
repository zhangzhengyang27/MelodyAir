export type LyricsDisplayMode = 'compact' | 'normal' | 'expanded'
export type LyricsSource = 'local' | 'online' | 'cache' | 'none'

export interface ParsedLyricWord {
  time: number
  text: string
}

export interface ParsedLyricLine {
  time: number
  text: string
  translation?: string
  romanized?: string
  raw?: string
  words?: ParsedLyricWord[]
}

export interface LyricsTrackMeta {
  trackId: number | null
  trackName: string
  artists: string
  album?: string
  source: LyricsSource
  updatedAt: number
}
