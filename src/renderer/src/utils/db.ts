import Dexie, { type Table } from 'dexie'

/**
 * 缓存的音频源数据
 */
export interface TrackSource {
  id: number
  /** 音频数据 (ArrayBuffer) */
  source: ArrayBuffer
  /** 创建时间（用于 LRU 淘汰） */
  createTime: number
  /** 数据大小(字节) */
  size: number
}

/**
 * 歌曲详情缓存
 */
export interface TrackDetail {
  id: number | string
  /** 完整的歌曲信息 JSON */
  detail: unknown
  /** 最后更新时间 */
  updateTime: number
}

/**
 * 歌词数据缓存
 */
export interface LyricCache {
  id: number | string
  /** 原始歌词文本 */
  lyric: string
  /** 翻译歌词文本 */
  tlyric?: string
  /** 解析后的歌词对象（可选，用于加速渲染） */
  parsedLyric?: LyricLine[]
  updateTime: number
}

/**
 * 单行歌词数据结构
 */
export interface LyricLine {
  time: number
  text: string
  translatedText?: string
}

/**
 * 专辑信息缓存
 */
export interface AlbumCache {
  id: number | string
  album: unknown
  cover?: ArrayBuffer
  updateTime: number
}

/**
 * MelodyAir 数据库类
 * 基于 Dexie.js 封装的 IndexedDB 数据库
 * 借鉴 YesPlayMusic 的 db.js 设计
 */
class MelodyAirDatabase extends Dexie {
  trackSources!: Table<TrackSource>
  trackDetails!: Table<TrackDetail>
  lyrics!: Table<LyricCache>
  albums!: Table<AlbumCache>

  constructor() {
    super('MelodyAirDB')

    // 定义数据库表和索引
    this.version(1).stores({
      trackSources: '&id, createTime',        // 主键id + 创建时间索引（用于LRU）
      trackDetail: '&id, updateTime',
      lyric: '&id, updateTime',
      album: '&id, updateTime'
    })
  }
}

// 全局单例实例
const db = new MelodyAirDatabase()

/**
 * 缓存管理器
 * 提供统一的缓存读写接口和自动清理策略
 */
export class CacheManager {
  private maxCacheSize: number = 500 * 1024 * 1024 // 默认 500MB

  /**
   * 设置最大缓存大小
   */
  setMaxCacheSize(sizeMB: number): void {
    this.maxCacheSize = sizeMB * 1024 * 1024
  }

  /**
   * 获取当前缓存使用量
   */
  async getCacheSize(): Promise<number> {
    const sources = await db.trackSources.toArray()
    return sources.reduce((total, item) => total + item.size, 0)
  }

  /**
   * 缓存音频源数据
   */
  async cacheTrackSource(id: number, source: ArrayBuffer): Promise<void> {
    await db.trackSources.put({
      id,
      source,
      createTime: Date.now(),
      size: source.byteLength
    })

    // 自动检查并清理超出限制的缓存
    await this.cleanupIfNeeded()
  }

  /**
   * 获取缓存的音频源
   */
  async getTrackSource(id: number): Promise<ArrayBuffer | null> {
    const cached = await db.trackSources.get(id)
    if (cached) {
      // 更新访问时间（用于LRU）
      await db.trackSources.update(id, { createTime: Date.now() })
      return cached.source
    }
    return null
  }

  /**
   * 删除音频源缓存
   */
  async removeTrackSource(id: number): Promise<void> {
    await db.trackSources.delete(id)
  }

  /**
   * 缓存歌曲详情
   */
  async cacheTrackDetail(id: number | string, detail: unknown): Promise<void> {
    await db.trackDetail.put({
      id,
      detail,
      updateTime: Date.now()
    })
  }

  /**
   * 获取歌曲详情缓存
   */
  async getTrackDetail(id: number | string): Promise<unknown | null> {
    const cached = await db.trackDetail.get(id)
    return cached?.detail ?? null
  }

  /**
   * 缓存歌词
   */
  async cacheLyric(
    id: number | string,
    lyric: string,
    tlyric?: string,
    parsedLyric?: LyricLine[]
  ): Promise<void> {
    await db.lyrics.put({
      id,
      lyric,
      tlyric,
      parsedLyric,
      updateTime: Date.now()
    })
  }

  /**
   * 获取缓存的歌词
   */
  async getLyric(id: number | string): Promise<LyricCache | null> {
    const cached = await db.lyrics.get(id)
    return cached ?? null
  }

  /**
   * 缓存专辑信息
   */
  async cacheAlbum(id: number | string, album: unknown, cover?: ArrayBuffer): Promise<void> {
    await db.albums.put({
      id,
      album,
      cover,
      updateTime: Date.now()
    })
  }

  /**
   * 获取缓存的专辑信息
   */
  async getAlbum(id: number | string): Promise<AlbumCache | null> {
    const cached = await db.albums.get(id)
    return cached ?? null
  }

  /**
   * 清理所有缓存
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      db.trackSources.clear(),
      db.trackDetail.clear(),
      db.lyrics.clear(),
      db.albums.clear()
    ])
  }

  /**
   * 仅清理音频缓存（保留较大的空间）
   */
  async clearTrackSources(): Promise<void> {
    await db.trackSources.clear()
  }

  /**
   * LRU 策略自动清理
   * 当缓存超出限制时，按创建时间删除最旧的数据
   */
  private async cleanupIfNeeded(): Promise<void> {
    const currentSize = await this.getCacheSize()

    if (currentSize > this.maxCacheSize) {
      console.log(`[Cache] Cache limit exceeded (${currentSize} > ${this.maxCacheSize}), cleaning up...`)

      // 按 createTime 升序排列（最旧的在前）
      let allSources = await db.trackSources.orderBy('createTime').toArray()

      let totalSize = currentSize

      while (totalSize > this.maxCacheSize * 0.8 && allSources.length > 0) {
        const oldest = allSources.shift()!
        if (oldest) {
          await db.trackSources.delete(oldest.id)
          totalSize -= oldest.size
          console.log(`[Cache] Removed track ${oldest.id}, freed ${this.formatBytes(oldest.size)}`)
        }
      }
    }
  }

  /**
   * 格式化字节数为可读字符串
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// 导出单例实例
export const cacheManager = new CacheManager()

/**
 * 辅助函数：将 Blob 转换为 ArrayBuffer
 */
export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer()
}

/**
 * 辅助函数：将 ArrayBuffer 转换为 Blob URL（用于播放）
 */
export function arrayBufferToBlobUrl(buffer: ArrayBuffer, mimeType = 'audio/mpeg'): string {
  const blob = new Blob([buffer], { type: mimeType })
  return URL.createObjectURL(blob)
}
