/**
 * 网易云音乐 API 返回类型定义
 * 基于 NeteaseCloudMusicApi 标准返回格式
 */

// ==================== 通用结构 ====================

/** 标准 API 响应包装 */
export interface ApiResponse<T = unknown> {
  code: number
  message?: string
  msg?: string
  data: T
}

/** 分页包装 */
export interface PaginatedData<T> {
  list?: T[]
  more?: boolean
  totalCount?: number
  [key: string]: unknown
}

// ==================== 用户相关 ====================

export interface Artist {
  id: number
  name: string
  picUrl?: string
  alias?: string[]
  albumSize?: number
  musicSize?: number
  fansCount?: number
}

export interface Album {
  id: number
  name: string
  picUrl?: string
  artists?: Artist[]
  size?: number
  publishTime?: number
  company?: string
  subType?: string
  description?: string
  blurPicUrl?: string
}

/** 歌曲中的艺术家（精简） */
export interface SongArtist {
  id: number
  name: string
  /** 别名列表 */
  alias?: string[]
  picUrl?: string
}

export interface Song {
  id: number
  name: string
  artists: SongArtist[]
  album: {
    id: number
    name: string
    picUrl?: string
    blurPicUrl?: string
  }
  duration: number
  /** 版权信息 */
  privilege?: {
    id: number
    fee: number
    payed: number
    st: number
    pl: number
    dl: number
    sp: number
    cp: number
    subp: number
    cs: boolean
    maxBr: number
    fl: number
    toast: boolean
    flag: number
    preSell?: boolean
    playLimit?: number
    downloadLimit?: number
  }
  cd?: string
  pst: number
  dt: number
  ar: { id: number; name: string }[]
  alia?: string[]
  pop?: number
  st: number
  rt?: string[]
  fee: number
  v: number
  crbt?: string
  cf?: string
  al: { id: number; name: string }
  publishTime?: number
  t?: number
  mst: number
  l: number
  no?: number
  rtUrl?: string
  ftype: number
  rtUrls?: string[]
  djId: number
  copyright: number
  s_id: number
  mark: number
  originCoverType?: number
  originSongSimpleData?: unknown
  tagPicList?: unknown
  resourceState?: boolean
  version: number
  single?: number
  mv: number
  rurl?: string
  rtype: number
  rurl2?: string
  hMusic?: { br: number; fid: number; size: number; threshold: number; vd: number }
  mMusic?: { br: number; fid: number; size: number; threshold: number; vd: number }
  lMusic?: { br: number; fid: number; size: number; threshold: number; vd: number }
  sqMusic?: { br: number; fid: number; size: number; threshold: number; vd: number }
  hrMusic?: { br: number; fid: number; size: number; threshold: number; vd: number }
  a?: unknown
  /** 试听信息 */
  freeTrialInfo?: { start: number; end: number }
  /** 来源上下文 */
  source?: { id: number; type: string; name: string }
}

/** 搜索结果歌曲 */
export interface SearchSong extends Song {
  score: number
}

/** 用户资料 */
export interface UserProfile {
  userId: number
  nickname: string
  avatarUrl: string
  backgroundUrl?: string
  vipType?: number
  signature?: string
  province?: number
  city?: number
  gender?: number
  birthday?: number
  description?: string
  detailDescription?: string
  expertTags?: string[]
  experts?: unknown
  accountStatus?: number
  createTime?: number
  userName?: string
  userType?: number
  authority?: number
}

export interface UserAccount {
  id: number
  userName: string
  type: number
  status: number
  payInfo?: { paymentMethod?: number }
  anonimousUser?: boolean
  ban?: number
  baoyueVersion?: number
  viptypeVersion?: number
  createTime?: number
  verified?: boolean
  userType?: number
  profile?: UserProfile
}

/** 用户账号详情 */
export interface UserDetail {
  profile: UserProfile
  bindings?: unknown[]
  relations?: unknown
  recs?: unknown
  level?: number
  listenSongs?: number
  userPoint?: unknown
  mobileSign?: boolean
  peopleCanSeeMyPlayRecord?: boolean
  authToken?: string
  adValid?: boolean
  createDays?: number
  followeds: number
  follows: number
  eventCount: number
  pcSign?: boolean
  blacklist?: boolean
  share?: boolean
  commentProtection?: number
}

/** 歌单 */
export interface Playlist {
  id: number
  name: string
  coverImgUrl: string
  trackCount: number
  playCount: number
  creator?: {
    userId: number
    nickname: string
    avatarUrl?: string
    signature?: string
    expertTags?: string[]
    experts?: unknown
    vipType?: number
    authStatus?: number
    followed?: boolean
    backgroundUrl?: string
    detailDescription?: string
  }
  subscribed?: boolean
  subscribedCount?: number
  commentThreadId?: string
  createTime?: number
  updateTime?: number
  playCount: number
  trackCount: number
  trackNumberUpdatedAt: number
  userId: number
  specialType: number
  privacy: number
  tags?: string[]
  description?: string
  ordered?: boolean
  newImported?: boolean
  opRecommend?: boolean
  highQuality?: boolean
  updateFrequency?: string
  commentCount?: number
  shareCount?: number
  tracks?: Song[]

  // 精简字段（用于 stores/user.ts 的 Playlist 接口）
  [key: string]: unknown
}

// ==================== 歌曲播放 ====================

/** 音频 URL 信息 */
export interface SongUrlItem {
  id: number
  url: string | null
  br: number
  size: number
  md5?: string
  code: number
  expi: number
  type: string
  gain: number
  fee: number
  dfsId: number
  level?: string
  freeTrialInfo?: { start: number; end: number }
  freeTryInfo?: { start: number; end: number }
  urlSource?: number
}

/** /song/url/v1 返回格式 */
export interface SongUrlV1Response {
  code: number
  data: SongUrlItem[] | string  // data 可能是数组或直连 URL 字符串
  message?: string
}

// ==================== 登录相关 ====================

/** 登录响应 */
export interface LoginResponse {
  code: number
  cookie: string
  token?: string
  account?: UserAccount
  profile?: UserProfile
  bindings?: unknown[]
  message?: string
  msg?: string
}

/** 二维码 Key 响应 */
export interface QrCodeKeyResponse {
  code: number
  data: { unikey: string; qrurl?: string }
  message?: string
}

/** 二维码创建响应 */
export interface QrCodeCreateResponse {
  code: number
  data: { qrurl: string; qrimg: string }
  message?: string
}

/** 二维码扫码状态响应 */
export interface QrCodeCheckResponse {
  code: number   // 800=二维码过期, 801=等待扫码, 802=已扫码待确认, 803=授权登录成功
  message?: string
  cookie?: string
  avatarUrl?: string
  nickname?: string
}

/** 登录状态响应 */
export interface LoginStatusResponse {
  data: {
    account: UserAccount
    profile: UserProfile
    bindings?: unknown[]
  } | null
  code: number
}

// ==================== 歌词相关 ====================

export interface LyricLine {
  time: number
  text: string
  translation?: string
  roman?: string
}

/** 歌词响应 */
export interface LyricResponse {
  code: number
  lrc: { version: number; lyric: string }
  tlyric?: { version: number; lyric: string }
  romalrc?: { version: number; lyric: string }
  lyricUser?: { nickname: string; userid: number }
  transUser?: { nickname: string; userid: number }
  klyric?: { version: number; lyric: string }
  tlrc?: { version: number; lyric: string }
  code: number
  pureMusicMode?: number
  needFallback?: boolean
}

// ==================== 搜索相关 ====================

export interface SearchResult<T = SearchSong> {
  result: T[] | null
  songCount?: number
  hasMore?: boolean
  code: number
}

export interface CloudSearchResult {
  result: {
    songs?: SearchSong[]
    artists?: Artist[]
    albums?: Album[]
    playlists?: Playlist[]
    mvs?: unknown[]
    djRadios?: unknown[]
    userprofiles?: UserProfile[]
  } | null
  songCount?: number
  curWord?: string
  hasMore?: boolean
  code: number
}

export interface SearchHotDetailItem {
  searchWord: string
  content: string
  iconType: number
  iconUrl?: string
  score: number
  alg?: string
  online?: number
  showDetail?: boolean
}

// ==================== 评论相关 ====================

export interface Comment {
  user: { userId: number; nickname: string; avatarUrl: string }
  content: string
  time: number
  likedCount: number
  commentId: number
  parentCommentId?: number
  beReplied?: { user: { userId: number; nickname: string }; content: string }
  ipLocation?: string
  expressionUrl?: string
  remarkName?: unknown
  showGrade?: boolean
  isPrivilege?: boolean
  status?: number
  decoration?: unknown
  location?: unknown
}

export interface CommentResponse {
  code: number
  hotComments?: Comment[]
  comments?: Comment[]
  total: number
  more: bool
  hotMore: bool
  topComments?: Comment[]
  isMusician: bool
  userId?: number
  time?: number
}

// ==================== 专辑/歌手/MV ====================

export interface AlbumDetail {
  album: Album
  songs: Song[]
  code: number
}

export interface ArtistDetail {
  artist: Artist & {
    briefDesc?: string
    desc?: string
    identifyTag?: unknown
    identifyImageUri?: string
  }
  hotSongs?: Song[]
  code: number
}

export interface MvDetail {
  id: number
  name: string
  cover: string
  briefDesc?: string
  description?: string
  artists: SongArtist[]
  playCount: number
  shareCount: number
  commentCount: number
  duration: number
  publishTime: number
  subed: boolean
  creator?: { userId: number; nickname: string; avatarUrl?: string }
  artistId?: number
  videoGroup?: unknown
  coverId?: number
  brs?: Record<string, string>
  code: number
}

// ==================== 个人 FM / 推荐 ====================

export interface PersonalizedSong {
  id: number
  name: string
  artists: SongArtist[]
  album: Song['album']
  duration: number
  picUrl?: string
  copyFrom?: string
  canDislike?: boolean
  reason?: string
  songType: number
}

export interface FmTrack {
  id: number
  name: string
  artists: SongArtist[]
  album: Song['album']
  duration: number
  alias?: string[]
  copyrightId: number
  mvid?: number
  position: number
  status: number
  disc: number
  reason?: string
}

// ==================== 云盘 ====================

export interface CloudSong {
  songId: number
  songName: string
  artist: string
  album: string
  addTime: number
  fileSize: number
  fileName: string
  simpleSong?: Song
  cover: string
  bitrate: number
  lyricId?: number
  version: number
  id?: number
  detail?: {
    id: number
    musicName: string
    artist: string
    album: string
    cover: string
    albumId: number
    duration: number
    alias: string
    status: number
    fileSize: number
    createTime: number
    lyricsId: number
    bitrate: number
    version: number
    lyric: string
    songId: number
  }
}

export interface CloudListResponse {
  code: number
  data: CloudSong[]
  count: number
  size: number
  hasMore: boolean
}

// ==================== 解锁接口 ====================

export interface UnblockMatchResult {
  code: number
  data: string  // 真实音源 URL
  proxyUrl?: string
  message?: string
}
