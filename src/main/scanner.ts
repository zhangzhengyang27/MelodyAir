import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import { createReadStream } from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// 支持的音频格式
const SUPPORTED_FORMATS = ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.wma']

// 并发解析元数据的并发数
const PARSE_CONCURRENCY = 8

// 简易日志（主进程）
const log = {
  error: (msg: string, ...args: unknown[]) => console.error(`[scanner] ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[scanner] ${msg}`, ...args),
  info: (msg: string, ...args: unknown[]) => console.log(`[scanner] ${msg}`, ...args),
}

export interface ScanProgress {
  status: 'scanning' | 'parsing' | 'completed' | 'error'
  currentFile: string
  scannedCount: number
  totalCount: number
  parsedCount: number
  errorCount: number
}

export interface AudioFileMetadata {
  filePath: string
  fileName: string
  fileSize: number
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  year?: number
  genre?: string[]
  duration?: number
  bitrate?: number
  sampleRate?: number
  format?: string
  trackNumber?: number
  diskNumber?: number
  coverData?: Buffer
  coverMimeType?: string
  error?: string
}

export interface ScanResult {
  files: AudioFileMetadata[]
  totalFiles: number
  successCount: number
  errorCount: number
  duration: number
}

let currentScanAborted = false

/**
 * 递归扫描目录，查找音频文件
 */
async function scanDirectory(dirPath: string, onProgress?: (file: string) => void): Promise<string[]> {
  const audioFiles: string[] = []

  async function scan(dir: string): Promise<void> {
    if (currentScanAborted) return

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (currentScanAborted) break

        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          // 跳过隐藏文件夹和系统文件夹
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scan(fullPath)
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (SUPPORTED_FORMATS.includes(ext)) {
            audioFiles.push(fullPath)
            onProgress?.(fullPath)
          }
        }
      }
    } catch (error) {
      log.error(`Error scanning directory ${dir}:`, error)
    }
  }

  await scan(dirPath)
  return audioFiles
}

/**
 * 解析音频文件元数据
 */
async function parseAudioFile(filePath: string): Promise<AudioFileMetadata> {
  const fileName = path.basename(filePath)
  const stats = await fs.stat(filePath)

  const result: AudioFileMetadata = {
    filePath,
    fileName,
    fileSize: stats.size
  }

  try {
    const mm = await import('music-metadata')
    const metadata = await mm.parseFile(filePath, { duration: true })

    // 基本信息
    result.title = metadata.common.title
    result.artist = metadata.common.artist
    result.album = metadata.common.album
    result.albumArtist = metadata.common.albumartist
    result.year = metadata.common.year
    result.genre = metadata.common.genre
    result.trackNumber = metadata.common.track.no
    result.diskNumber = metadata.common.disk.no

    // 音频信息
    result.duration = metadata.format.duration
    result.bitrate = metadata.format.bitrate
    result.sampleRate = metadata.format.sampleRate
    result.format = metadata.format.container

    // 封面
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0]
      result.coverData = picture.data
      result.coverMimeType = picture.format
    }

    // 如果没有标题，使用文件名
    if (!result.title) {
      result.title = path.parse(fileName).name
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return result
}

/**
 * 注册扫描相关的 IPC 处理器
 */
export function registerScanHandlers(mainWindow: BrowserWindow | null): void {
  // 选择扫描目录
  ipcMain.handle('scan:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择音乐文件夹'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // 开始扫描
  ipcMain.handle('scan:start', async (_event, dirPath: string) => {
    currentScanAborted = false
    const startTime = Date.now()

    try {
      // 第一阶段：扫描文件
      const audioFiles: string[] = []

      await scanDirectory(dirPath, (file) => {
        audioFiles.push(file)
        mainWindow?.webContents.send('scan:progress', {
          status: 'scanning',
          currentFile: file,
          scannedCount: audioFiles.length,
          totalCount: audioFiles.length,
          parsedCount: 0,
          errorCount: 0
        } as ScanProgress)
      })

      if (currentScanAborted) {
        return {
          files: [],
          totalFiles: 0,
          successCount: 0,
          errorCount: 0,
          duration: Date.now() - startTime
        }
      }

      // 第二阶段：并发解析元数据（并发池，避免一次性创建过多 Promise）
      const results: AudioFileMetadata[] = new Array(audioFiles.length)
      let successCount = 0
      let errorCount = 0
      let parsedCount = 0
      let lastProgressSend = 0

      const parseWithPool = async (files: string[]): Promise<void> => {
        let nextIndex = 0

        const worker = async (): Promise<void> => {
          while (nextIndex < files.length) {
            if (currentScanAborted) return
            const i = nextIndex++
            const filePath = files[i]
            try {
              const metadata = await parseAudioFile(filePath)
              results[i] = metadata
              if (metadata.error) {
                errorCount++
              } else {
                successCount++
              }
            } catch (e) {
              results[i] = {
                filePath,
                fileName: path.basename(filePath),
                fileSize: 0,
                error: e instanceof Error ? e.message : 'Unknown error'
              }
              errorCount++
            }
            parsedCount++

            // 每解析 10 个或超过 500ms 发送一次进度
            const now = Date.now()
            if (parsedCount % 10 === 0 || now - lastProgressSend > 500 || parsedCount === files.length) {
              lastProgressSend = now
              mainWindow?.webContents.send('scan:progress', {
                status: 'parsing',
                currentFile: filePath,
                scannedCount: files.length,
                totalCount: files.length,
                parsedCount,
                errorCount
              } as ScanProgress)
            }
          }
        };

        const workers = Array.from(
          { length: Math.min(PARSE_CONCURRENCY, files.length) },
          () => worker()
        )
        await Promise.all(workers)
      };

      await parseWithPool(audioFiles)

      const scanResult: ScanResult = {
        files: results,
        totalFiles: audioFiles.length,
        successCount,
        errorCount,
        duration: Date.now() - startTime
      }

      mainWindow?.webContents.send('scan:progress', {
        status: 'completed',
        currentFile: '',
        scannedCount: audioFiles.length,
        totalCount: audioFiles.length,
        parsedCount: results.length,
        errorCount
      } as ScanProgress)

      return scanResult
    } catch (error) {
      mainWindow?.webContents.send('scan:progress', {
        status: 'error',
        currentFile: '',
        scannedCount: 0,
        totalCount: 0,
        parsedCount: 0,
        errorCount: 1
      } as ScanProgress)

      throw error
    }
  })

  // 中止扫描
  ipcMain.handle('scan:abort', async () => {
    currentScanAborted = true
    return true
  })

  // 提取封面
  ipcMain.handle('scan:extractCover', async (_event, filePath: string) => {
    try {
      const mm = await import('music-metadata')
      const metadata = await mm.parseFile(filePath)
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0]
        return {
          data: picture.data.toString('base64'),
          mimeType: picture.format
        }
      }
      return null
    } catch (error) {
      log.error('Failed to extract cover:', error)
      return null
    }
  })

  // 计算文件校验和（流式读取，避免大文件内存溢出）
  ipcMain.handle('scan:calculateChecksum', async (_event, filePath: string) => {
    return new Promise<string | null>((resolve) => {
      try {
        const hash = crypto.createHash('md5')
        const stream = createReadStream(filePath)
        stream.on('data', (chunk: Buffer) => hash.update(chunk))
        stream.on('end', () => resolve(hash.digest('hex')))
        stream.on('error', (error) => {
          log.error('Failed to calculate checksum:', error)
          resolve(null)
        })
      } catch (error) {
        log.error('Failed to calculate checksum:', error)
        resolve(null)
      }
    })
  })

  // 保存封面图片
  ipcMain.handle('scan:saveCover', async (_event, coverData: string, fileName: string) => {
    try {
      const { app } = require('electron')
      const userDataPath = app.getPath('userData')
      const coversDir = path.join(userDataPath, 'covers')

      // 确保目录存在
      await fs.mkdir(coversDir, { recursive: true })

      // 保存文件
      const coverPath = path.join(coversDir, fileName)
      const buffer = Buffer.from(coverData, 'base64')
      await fs.writeFile(coverPath, buffer)

      return coverPath
    } catch (error) {
      log.error('Failed to save cover:', error)
      return null
    }
  })
}
