import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => {
  const makeSong = (id: number, name: string) => ({
    id,
    name,
    artists: [{ id, name: `artist-${id}` }],
    album: { id, name: `album-${id}`, picUrl: `pic-${id}` },
    duration: 200000,
  })
  return {
    makeSong,
    getAudioSource: vi.fn(),
    cacheAudioSource: vi.fn(),
    preloadNextTrack: vi.fn(),
    releaseStaleBlobUrls: vi.fn(),
    releaseAllBlobUrls: vi.fn(),
    audioPlay: vi.fn(),
    audioStop: vi.fn(),
    audioSeek: vi.fn(),
    settings: { apiBase: '', playbackSpeed: 1, fadeDuration: 300, enableEnhancedLyric: false },
    logout: vi.fn(),
    fmTrash: vi.fn(),
  }
})

vi.mock('@/stores/settings', () => ({ useSettingsStore: () => h.settings }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ likedSongIds: [], logout: h.logout }) }))
vi.mock('@/stores/lyrics', () => ({
  useLyricsStore: () => ({
    hasLyrics: false,
    isDraggingProgress: false,
    isSyncSuppressed: () => false,
    setCurrentIndex: vi.fn(),
    lines: [],
    currentLine: null,
    prevLine: null,
    nextLine: null,
  }),
}))
vi.mock('@/stores/defaults', () => ({
  playerDefaults: {},
  migrateWithDefaults: (_d: unknown, state: Record<string, unknown>) => state,
}))
vi.mock('@/utils/windowRole', () => ({ isMainWindow: () => false }))
vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/composables/useToast', () => ({ showToast: vi.fn() }))
vi.mock('@/utils/storage', () => ({
  getStorage: (_key: string, defaultValue: unknown) => defaultValue,
  setStorage: vi.fn(),
}))
vi.mock('@/utils/persistStorage', () => ({
  throttledPersistStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}))
vi.mock('@/utils/o3icsSyncEngine', () => ({
  LyricsSyncEngine: class {
    setLines() {}
    reset() {}
    update() {
      return { changed: false, index: -1 }
    }
  },
}))
vi.mock('@/utils/audioAdapter', () => ({
  getAudioAdapter: () => ({
    on: vi.fn(),
    play: h.audioPlay,
    stop: h.audioStop,
    seek: h.audioSeek,
    toggle: vi.fn(),
    pause: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    setPlaybackRate: vi.fn(),
    setFadeDuration: vi.fn(),
  }),
}))
vi.mock('@/composables/usePlayerCache', () => ({
  usePlayerCache: () => ({
    getAudioSource: h.getAudioSource,
    cacheAudioSource: h.cacheAudioSource,
    preloadNextTrack: h.preloadNextTrack,
    releaseStaleBlobUrls: h.releaseStaleBlobUrls,
    releaseAllBlobUrls: h.releaseAllBlobUrls,
  }),
}))
vi.mock('@/composables/useScrobble', () => ({
  useScrobble: () => ({
    resetScrobbleState: vi.fn(),
    accumulatePlayedTime: vi.fn(),
    checkAndSubmitScrobble: vi.fn(),
    submitScrobbleNowPlaying: vi.fn(),
  }),
}))
vi.mock('@/composables/useMediaSession', () => ({
  useMediaSession: () => ({
    updateMediaSession: vi.fn(),
    updateMediaSessionPlaybackState: vi.fn(),
  }),
}))
vi.mock('@/composables/usePlaybackProgress', () => ({
  usePlaybackProgress: () => ({
    savePlaybackProgress: vi.fn(),
    getSavedPlaybackProgress: vi.fn(() => 0),
  }),
}))
vi.mock('@/api/fm', () => ({ fmTrash: h.fmTrash }))

import { usePlayerStore } from '../player'

/** playSong 是未 await 的异步流程，用一个宏任务 tick 等它跑完 */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  h.getAudioSource.mockResolvedValue('http://audio/test.mp3')
})

describe('播放列表管理', () => {
  it('setPlaylist 设置队列并从指定索引开始播放', async () => {
    const store = usePlayerStore()
    const a = h.makeSong(1, 'A')
    const b = h.makeSong(2, 'B')
    store.setPlaylist([a, b], 0)
    await flush()
    expect(store.playlist).toHaveLength(2)
    expect(store.currentIndex).toBe(0)
    expect(store.shuffledList).toHaveLength(2)
    expect(h.getAudioSource).toHaveBeenCalledWith(1, true)
    expect(h.audioPlay).toHaveBeenCalledWith('http://audio/test.mp3', 1, false)
    expect(document.title).toBe('MelodyAir - A')
  })

  it('setPlaylist 索引越界时收敛到合法范围', () => {
    const store = usePlayerStore()
    const a = h.makeSong(1, 'A')
    store.setPlaylist([a], 5)
    expect(store.currentIndex).toBe(0)
    store.setPlaylist([], 0)
    expect(store.currentIndex).toBe(-1)
  })

  it('addToPlaylist 新歌追加并立即播放，重复添加只跳转不重复', async () => {
    const store = usePlayerStore()
    const a = h.makeSong(1, 'A')
    const b = h.makeSong(2, 'B')
    store.setPlaylist([a], 0)
    await flush()
    h.getAudioSource.mockClear()

    store.addToPlaylist(b)
    await flush()
    expect(store.playlist).toHaveLength(2)
    expect(store.currentIndex).toBe(1)
    expect(h.getAudioSource).toHaveBeenCalledWith(2, true)

    store.addToPlaylist(a)
    await flush()
    expect(store.playlist).toHaveLength(2)
    expect(store.currentIndex).toBe(0)
    expect(h.getAudioSource).toHaveBeenLastCalledWith(1, true)
  })

  it('removeFromPlaylist 删除当前歌曲时自动播放下一首', async () => {
    const store = usePlayerStore()
    const songs = [1, 2, 3].map((i) => h.makeSong(i, `S${i}`))
    store.setPlaylist(songs, 0)
    await flush()

    store.removeFromPlaylist(2) // 当前之后的歌：索引不变
    expect(store.currentIndex).toBe(0)

    h.getAudioSource.mockClear()
    store.removeFromPlaylist(0) // 删除当前歌曲 → 播放原第二首(id=2)
    await flush()
    expect(store.playlist).toHaveLength(1)
    expect(store.currentIndex).toBe(0)
    expect(h.getAudioSource).toHaveBeenCalledWith(2, true)
  })

  it('removeFromPlaylist 删空队列时重置状态并停止播放', async () => {
    const store = usePlayerStore()
    const a = h.makeSong(1, 'A')
    store.setPlaylist([a], 0)
    await flush()
    store.removeFromPlaylist(0)
    expect(store.currentIndex).toBe(-1)
    expect(store.playing).toBe(false)
    expect(h.audioStop).toHaveBeenCalled()
  })

  it('reorderPlaylist 拖动歌曲时正确维护 currentIndex', async () => {
    const store = usePlayerStore()
    const songs = [1, 2, 3].map((i) => h.makeSong(i, `S${i}`))
    store.setPlaylist(songs, 1) // 当前播放 S2
    await flush()

    store.reorderPlaylist(0, 2) // S1 移到末尾 → [S2,S3,S1]，currentIndex 0
    expect(store.playlist.map((s) => s.id)).toEqual([2, 3, 1])
    expect(store.currentIndex).toBe(0)

    store.reorderPlaylist(2, 0) // S1 移回头部 → [S1,S2,S3]，currentIndex 1
    expect(store.playlist.map((s) => s.id)).toEqual([1, 2, 3])
    expect(store.currentIndex).toBe(1)

    store.reorderPlaylist(1, 1) // 原地不动
    expect(store.currentIndex).toBe(1)
  })

  it('removeDuplicates 去重并左移 currentIndex，返回移除数量', async () => {
    const store = usePlayerStore()
    const a = h.makeSong(1, 'A')
    const b = h.makeSong(2, 'B')
    store.setPlaylist([a, a, b], 2) // 当前播放 B（尾部）
    await flush()
    expect(store.removeDuplicates()).toBe(1)
    expect(store.playlist.map((s) => s.id)).toEqual([1, 2])
    expect(store.currentIndex).toBe(1)
  })

  it('insertNext 插到当前歌曲之后，已紧跟或就是当前歌曲时不动', async () => {
    const store = usePlayerStore()
    // 注意：setPlaylist 不拷贝数组，insertNext 的 splice 会原地重排它，
    // 因此必须持有对象引用而非按索引回读
    const songs = [1, 2, 3].map((i) => h.makeSong(i, `S${i}`))
    const [s1, s2, s3] = songs
    store.setPlaylist(songs, 0) // 当前 S1
    await flush()

    store.insertNext(s3!) // S3 → [S1,S3,S2]
    expect(store.playlist.map((s) => s.id)).toEqual([1, 3, 2])

    store.insertNext(s2!) // S2 移到 S1 之后 → [S1,S2,S3]
    expect(store.playlist.map((s) => s.id)).toEqual([1, 2, 3])

    store.insertNext(s2!) // 已紧跟当前歌曲 → 不动
    expect(store.playlist.map((s) => s.id)).toEqual([1, 2, 3])

    store.insertNext(s1!) // 就是当前歌曲 → 不动
    expect(store.playlist.map((s) => s.id)).toEqual([1, 2, 3])
  })
})

describe('播放控制与模式', () => {
  it('playNext 优先消费“下一首播放”队列', async () => {
    const store = usePlayerStore()
    const songs = [1, 2].map((i) => h.makeSong(i, `S${i}`))
    const c = h.makeSong(3, 'S3')
    store.setPlaylist(songs, 0)
    await flush()

    store.addToPlayNext(c)
    await store.playNext()
    expect(store.currentIndex).toBe(1)
    expect(store.playlist.map((s) => s.id)).toEqual([1, 3, 2])
    expect(store.playNextList).toHaveLength(0)
    expect(h.getAudioSource).toHaveBeenLastCalledWith(3, true)
  })

  it('sequence 模式播到最后一首时停止', async () => {
    const store = usePlayerStore()
    const songs = [1, 2].map((i) => h.makeSong(i, `S${i}`))
    store.setPlaylist(songs, 1)
    await flush()
    h.getAudioSource.mockClear()
    await store.playNext()
    expect(store.currentIndex).toBe(1)
    expect(store.playing).toBe(false)
    expect(store.status).toBe('paused')
    expect(h.getAudioSource).not.toHaveBeenCalled()
  })

  it('loop 模式播放到末尾后回到开头', async () => {
    const store = usePlayerStore()
    const songs = [1, 2].map((i) => h.makeSong(i, `S${i}`))
    store.setPlaylist(songs, 1)
    await flush()
    store.playMode = 'loop'
    await store.playNext()
    expect(store.currentIndex).toBe(0)
    expect(h.getAudioSource).toHaveBeenLastCalledWith(1, true)
  })

  it('loopOne 模式重播当前歌曲', async () => {
    const store = usePlayerStore()
    const songs = [1, 2].map((i) => h.makeSong(i, `S${i}`))
    store.setPlaylist(songs, 0)
    await flush()
    store.playMode = 'loopOne'
    h.getAudioSource.mockClear()
    await store.playNext()
    expect(store.currentIndex).toBe(0)
    expect(h.getAudioSource).toHaveBeenCalledWith(1, true)
  })

  it('random 模式下 shuffledList 为空时自动重建再随机切歌', async () => {
    const store = usePlayerStore()
    const songs = [1, 2].map((i) => h.makeSong(i, `S${i}`))
    store.setPlaylist(songs, 0)
    await flush()
    store.playMode = 'random'
    store.shuffledList = [] // 模拟重启后派生数据未持久化
    h.getAudioSource.mockClear()
    await store.playNext()
    expect(store.shuffledList).toHaveLength(2)
    // 两首歌的队列排除当前歌后只剩一首，结果确定
    expect(h.getAudioSource).toHaveBeenLastCalledWith(2, true)
  })

  it('播放超过 3 秒时“上一首”回到开头', async () => {
    const store = usePlayerStore()
    const songs = [1, 2].map((i) => h.makeSong(i, `S${i}`))
    store.setPlaylist(songs, 1)
    await flush()
    store.setCurrentTime(10)
    await store.playPrev()
    expect(h.audioSeek).toHaveBeenCalledWith(0)
    expect(store.currentIndex).toBe(1)
  })

  it('导航栈为空时“上一首”按播放列表顺序回退', async () => {
    const store = usePlayerStore()
    const a = h.makeSong(1, 'A')
    const b = h.makeSong(2, 'B')
    store.setPlaylist([a, b], 1) // 当前播放 B
    await flush()
    store.setCurrentTime(0)
    await store.playPrev()
    expect(store.currentIndex).toBe(0)
    expect(h.getAudioSource).toHaveBeenLastCalledWith(1, true)
    expect(store.playNavStack).toHaveLength(0)
  })

  it('记录现状缺陷：切歌时导航栈从不压入（playSong 的 currentSong 守卫恒为假）', async () => {
    // 已知缺陷：所有调用方（addToPlaylist/playNext/setPlaylist 等）都先把
    // currentIndex 指向新歌再调 playSong，导致 playSong 内
    // `currentSong.value.id !== song.id` 恒为假，playNavStack 永远为空，
    // "上一首按实际播放顺序回溯" 功能实际从未生效。待修复后更新本用例。
    const store = usePlayerStore()
    const a = h.makeSong(1, 'A')
    const b = h.makeSong(2, 'B')
    store.setPlaylist([a], 0)
    await flush()
    store.addToPlaylist(b)
    await flush()
    expect(store.playNavStack).toHaveLength(0)
  })
})
