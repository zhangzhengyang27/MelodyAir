# MelodyAir - 闲置 API 接口需求文档

> 基于 `src/renderer/src/api/` 下 18 个文件、约 150 个 API 函数的调用分析，识别出约 100 个已封装但从未被前端调用的接口，按功能域和优先级转化为可执行的前端需求。

---

## 优先级定义

| 级别 | 含义 | 标准 |
|:-----|:-----|:-----|
| **P0** | 核心缺失 | 用户可见的主要功能缺口，影响基础体验 |
| **P1** | 重要浏览 | 丰富内容发现能力，提升留存 |
| **P2** | 增强功能 | 完善现有模块深度，提升高级用户体验 |
| **P3** | 辅助功能 | 锦上添花，可后续迭代 |

---

## P0 - 核心缺失功能

### 1. 收藏系统

**现状**：`subAlbum`、`subArtist`、`subMv`、`subscribePlaylist` 全部闲置，用户无法收藏任何内容。

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `subAlbum` | `/album/sub` | 收藏/取消收藏专辑 |
| `subArtist` | `/artist/sub` | 收藏/取消收藏歌手 |
| `subMv` | `/mv/sub` | 收藏/取消收藏 MV |
| `subscribePlaylist` | `/playlist/subscribe` | 收藏/取消收藏歌单 |
| `getAlbumSublist` | `/album/sublist` | 已收藏专辑列表 |
| `getArtistSublist` | `/artist/sublist` | 已收藏歌手列表 |
| `getMvSublist` | `/mv/sublist` | 已收藏 MV 列表 |

**需求**：
- [ ] 各详情页（歌手/专辑/MV/歌单）添加收藏按钮，显示当前收藏状态
- [ ] 收藏状态通过 `*DetailDynamic` API 获取
- [ ] 我的音乐页增加「我收藏的歌手」「我收藏的专辑」「我收藏的 MV」Tab
- [ ] 收藏操作需登录校验，未登录时引导登录

---

### 2. 歌单管理

**现状**：歌单 CRUD 和歌曲管理 API 全部闲置，用户无法管理自己的歌单。

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `createPlaylist` | `/playlist/create` | 新建歌单 |
| `deletePlaylist` | `/playlist/delete` | 删除歌单 |
| `playlistTracks` | `/playlist/tracks` | 添加/删除歌曲 |
| `updatePlaylist` | `/playlist/update` | 更新歌单信息 |
| `updatePlaylistName` | `/playlist/name/update` | 更新歌单名 |
| `updatePlaylistDesc` | `/playlist/desc/update` | 更新歌单描述 |
| `updatePlaylistTags` | `/playlist/tags/update` | 更新歌单标签 |
| `setPlaylistPrivacy` | `/playlist/privacy` | 公开/隐私切换 |

**需求**：
- [ ] 我的音乐页添加「新建歌单」按钮 + 弹窗
- [ ] 歌单详情页添加「编辑」功能（修改名称/描述/标签）
- [ ] 歌单详情页歌曲列表支持「添加到其他歌单」和「从歌单移除」
- [ ] 歌单右键菜单/长按菜单：删除歌单（需二次确认）
- [ ] 歌单隐私设置切换

---

### 3. 每日推荐

**现状**：`getRecommendSongs` 和 `getRecommendResource` 已封装但未使用。

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getRecommendSongs` | `/recommend/songs` | 每日推荐歌曲 |
| `getRecommendResource` | `/recommend/resource` | 每日推荐歌单 |
| `dislikeRecommendSong` | `/recommend/songs/dislike` | 不感兴趣 |

**需求**：
- [ ] 新增 `/daily` 路由，每日推荐页
- [ ] 展示每日推荐歌单卡片 + 推荐歌曲列表
- [ ] 歌曲行支持「不感兴趣」操作（调用 `dislikeRecommendSong`）
- [ ] 侧边栏「发现」下新增「每日推荐」入口（需登录）

---

### 4. 相似推荐

**现状**：`simi.ts` 全部 5 个函数闲置，无一被调用。

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getSimiSong` | `/simi/song` | 相似歌曲 |
| `getSimiPlaylist` | `/simi/playlist` | 相似歌单 |
| `getSimiArtist` | `/simi/artist` | 相似歌手 |
| `getSimiMv` | `/simi/mv` | 相似 MV |
| `getSimiUser` | `/simi/user` | 听过这首歌的用户 |

**需求**：
- [ ] 歌单详情页底部增加「相似歌单」推荐区
- [ ] 歌手详情页增加「相似歌手」推荐区
- [ ] 全屏播放器/歌曲详情弹窗增加「相似歌曲」推荐
- [ ] MV 详情页增加「相似 MV」推荐区

---

### 5. 评论深度集成

**现状**：`CommentSection.vue` 组件已存在且使用了 `getCommentHot`/`getCommentNew`/`sendComment`/`likeComment`，但各类型评论专用 API 和其他评论功能闲置。

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getCommentMusic` | `/comment/music` | 歌曲评论 |
| `getCommentAlbum` | `/comment/album` | 专辑评论 |
| `getCommentPlaylist` | `/comment/playlist` | 歌单评论 |
| `getCommentMv` | `/comment/mv` | MV 评论 |
| `getCommentDj` | `/comment/dj` | 电台节目评论 |
| `getCommentVideo` | `/comment/video` | 视频评论 |
| `getCommentFloor` | `/comment/floor` | 楼层评论（回复列表） |
| `getCommentInfoList` | `/comment/info/list` | 评论统计数据 |

**需求**：
- [ ] 歌单详情页集成 `CommentSection`（type=2）
- [ ] 专辑详情页集成 `CommentSection`（type=3）
- [ ] MV 详情页集成 `CommentSection`（type=1）
- [ ] 歌手详情页集成 `CommentSection`（type=7，需确认）
- [ ] 电台详情页集成 `CommentSection`（type=4）
- [ ] 评论回复功能（调用 `getCommentFloor` 展开回复列表）

---

## P1 - 重要浏览功能

### 6. 歌单广场

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getTopPlaylist` | `/top/playlist` | 歌单列表（按分类/排序） |
| `getPlaylistCatlist` | `/playlist/catlist` | 歌单分类列表 |
| `getPlaylistHot` | `/playlist/hot` | 热门歌单分类 |
| `getPlaylistHighqualityTags` | `/playlist/highquality/tags` | 精品歌单标签 |
| `getTopPlaylistHighquality` | `/top/playlist/highquality` | 精品歌单列表 |

**需求**：
- [ ] 新增 `/playlists` 路由，歌单广场页
- [ ] 分类标签栏（全部/华语/流行/摇滚...）→ `getPlaylistCatlist`
- [ ] 歌单网格卡片，支持分页加载 → `getTopPlaylist`
- [ ] 精品歌单 Tab → `getTopPlaylistHighquality` + `getPlaylistHighqualityTags`
- [ ] 侧边栏新增「歌单」入口

---

### 7. 歌手浏览

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getArtistList` | `/artist/list` | 歌手分类列表（按语种/类型/首字母） |
| `getTopArtists` | `/top/artists` | 热门歌手 |

**需求**：
- [ ] 新增 `/artists` 路由，歌手浏览页
- [ ] 筛选栏：语种/类型/首字母筛选 → `getArtistList`
- [ ] 歌手卡片网格，支持分页
- [ ] 侧边栏新增「歌手」入口

---

### 8. MV 浏览

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getMvAll` | `/mv/all` | 全部 MV（按地区/类型/排序） |
| `getMvFirst` | `/mv/first` | 最新 MV |
| `getMvExclusiveRcmd` | `/mv/exclusive/rcmd` | 网易出品 MV |
| `getTopMv` | `/top/mv` | MV 排行 |

**需求**：
- [ ] 新增 `/mv` 路由，MV 浏览页
- [ ] 筛选栏：地区/类型/排序 → `getMvAll`
- [ ] 最新 MV / 网易出品 / MV 排行 Tab
- [ ] MV 卡片网格（封面+标题+播放量）
- [ ] 侧边栏新增「MV」入口

---

### 9. 新碟上架

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getTopAlbum` | `/top/album` | 新碟上架（按地区/年份/月份） |
| `getAlbumNew` | `/album/new` | 全部新碟 |
| `getAlbumNewest` | `/album/newest` | 最新专辑 |

**需求**：
- [ ] 新增 `/albums` 路由，新碟上架页
- [ ] 地区筛选（全部/华语/欧美/日本/韩国）
- [ ] 专辑卡片网格（封面+名称+歌手+发行日期）
- [ ] 侧边栏新增「新碟」入口

---

### 10. 播客深度功能

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getDjBanner` | `/dj/banner` | 播客 Banner |
| `getDjTodayPerfered` | `/dj/today/perfered` | 今天优选 |
| `getDjCategoryRecommend` | `/dj/category/recommend` | 分类推荐 |
| `getDjCategoryExcludehot` | `/dj/category/excludehot` | 非热门分类 |
| `getDjSublist` | `/dj/sublist` | 订阅电台列表 |
| `getDjProgramDetail` | `/dj/program/detail` | 节目详情 |
| `getProgramDetail` | `/program/detail` | 节目详情新版 |
| `getDjProgramToplistHours` | `/dj/program/toplist/hours` | 节目小时榜 |
| `getDjToplistPopular` | `/dj/toplist/popular` | 电台热门榜 |
| `getDjToplistPay` | `/dj/toplist/pay` | 电台付费榜 |
| `getProgramToplist` | `/program/toplist` | 节目榜单 |
| `getDjPaygift` | `/dj/paygift` | 付费精品 |

**需求**：
- [ ] 播客页增加 Banner 轮播 → `getDjBanner`
- [ ] 播客页增加「今天优选」区块 → `getDjTodayPerfered`
- [ ] 播客页增加「播客榜单」Tab → `getDjToplistPopular`/`getProgramToplist`
- [ ] 我的音乐页增加「我订阅的电台」→ `getDjSublist`
- [ ] 节目详情弹窗 → `getDjProgramDetail`

---

## P2 - 增强功能

### 11. 云盘完整功能

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getCloudDetail` | `/user/cloud/detail` | 云盘歌曲详情 |
| `deleteCloudSong` | `/user/cloud/del` | 删除云盘歌曲 |
| `getCloudUploadToken` | `/cloud/upload/token` | 上传凭证 |
| `completeCloudUpload` | `/cloud/upload/complete` | 完成上传 |
| `cloudMatch` | `/cloud/match` | 信息匹配纠正 |
| `getCloudLyric` | `/cloud/lyric/get` | 云盘歌词 |
| `cloudImport` | `/cloud/import` | 云盘导入 |

**需求**：
- [ ] 云盘页添加上传按钮 → `getCloudUploadToken` + `completeCloudUpload`
- [ ] 云盘歌曲行添加删除按钮 → `deleteCloudSong`
- [ ] 云盘歌曲信息匹配纠正功能 → `cloudMatch`
- [ ] 云盘歌词获取 → `getCloudLyric`

---

### 12. 下载功能

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getSongDownloadUrl` | `/song/download/url` | 下载 URL |
| `getSongDownloadUrlV1` | `/song/download/url/v1` | 下载 URL 新版（按音质） |

**需求**：
- [ ] 歌曲右键菜单/更多操作添加「下载」选项
- [ ] 下载音质选择弹窗（标准/高品质/无损）
- [ ] Electron 主进程实现文件下载 + 进度通知
- [ ] 下载管理列表页（新增 `/downloads` 路由）

---

### 13. 用户社交

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getUserDetail` | `/user/detail` | 用户详情 |
| `getUserFollows` | `/user/follows` | 关注列表 |
| `getUserFolloweds` | `/user/followeds` | 粉丝列表 |
| `getUserEvent` | `/user/event` | 用户动态 |
| `followUser` | `/follow` | 关注/取消关注 |
| `getUserFollowMixed` | `/user/follow/mixed` | 关注混合列表 |
| `getUserRecord` | `/user/record` | 用户播放记录 |
| `getUserSubcount` | `/user/subcount` | 用户信息数量 |
| `getUserLevel` | `/user/level` | 用户等级 |

**需求**：
- [ ] 新增用户主页 `/user/:uid` → `getUserDetail`
- [ ] 用户主页展示：关注/粉丝数、歌单、动态
- [ ] 关注/取关按钮 → `followUser`
- [ ] 我的音乐页增加「我的等级」→ `getUserLevel`
- [ ] 用户播放记录（周/年）→ `getUserRecord`

---

### 14. 注册流程

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `verifyCaptcha` | `/captcha/verify` | 验证验证码 |
| `registerCellphone` | `/register/cellphone` | 手机号注册 |
| `checkCellphoneExistence` | `/cellphone/existence/check` | 手机号是否已注册 |
| `activateInitProfile` | `/activate/init/profile` | 初始化昵称 |
| `checkNickname` | `/nickname/check` | 昵称重复检测 |

**需求**：
- [ ] 登录页增加「注册」Tab
- [ ] 注册流程：输入手机号 → 检测是否已注册 → 发送验证码 → 验证 → 设置密码和昵称
- [ ] 昵称输入时实时检测重复 → `checkNickname`

---

## P3 - 辅助功能

### 15. 歌曲增强

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getSongMusicDetail` | `/song/music/detail` | 歌曲音质详情 |
| `getSongRedCount` | `/song/red/count` | 红心数量 |
| `checkSongLike` | `/song/like/check` | 批量检查是否喜爱 |
| `getSongDynamicCover` | `/song/dynamic/cover` | 动态封面 |
| `getSongChorus` | `/song/chorus` | 副歌时间（跳到高潮） |
| `getSongWikiSummary` | `/song/wiki/summary` | 音乐百科 |
| `getLyricNew` | `/lyric/new` | 逐字歌词 |
| `checkMusic` | `/check/music` | 检查歌曲可用性 |
| `getAlbumDetailDynamic` | `/album/detail/dynamic` | 专辑动态信息 |

**需求**：
- [ ] 播放器增加「跳到副歌」按钮 → `getSongChorus`
- [ ] 歌曲详情弹窗展示百科信息 → `getSongWikiSummary`
- [ ] 逐字歌词支持 → `getLyricNew`
- [ ] 播放前检查可用性 → `checkMusic`
- [ ] 批量检查喜欢状态 → `checkSongLike`

---

### 16. 排行榜增强

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getToplistDetail` | `/toplist/detail` | 所有榜单内容摘要 |
| `getToplistArtist` | `/toplist/artist` | 歌手榜 |
| `getTopSong` | `/top/song` | 新歌速递 |

**需求**：
- [ ] 排行榜页增加「歌手榜」Tab → `getToplistArtist`
- [ ] 排行榜页增加「新歌速递」Tab → `getTopSong`
- [ ] 榜单摘要预览 → `getToplistDetail`

---

### 17. 本地音乐增强

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getLocalPlaylists` | `/local-playlist` | 本地播放列表 |
| `createLocalPlaylist` | `/local-playlist` POST | 创建本地播放列表 |
| `updateLocalPlaylist` | `/local-playlist/:id` PUT | 更新本地播放列表 |
| `deleteLocalPlaylist` | `/local-playlist/:id` DELETE | 删除本地播放列表 |
| `addSongToLocalPlaylist` | `/local-playlist/:id/songs` POST | 添加歌曲 |
| `removeSongFromLocalPlaylist` | `/local-playlist/:id/songs/:songId` DELETE | 移除歌曲 |
| `manualMatch` | `/metadata/match/:trackId` | 手动匹配元数据 |
| `removeMatch` | `/metadata/match/:trackId` DELETE | 移除匹配 |
| `upsertLocalLyrics` | `/lyrics/song/:songId` PUT | 编辑歌词 |
| `getStreamUrl` | `/stream/:trackId` | 流媒体播放 URL |

**需求**：
- [ ] 本地音乐页增加播放列表管理
- [ ] 手动匹配元数据功能
- [ ] 本地歌词编辑功能

---

### 18. 播放记录增强

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getRecentVideo` | `/record/recent/video` | 最近播放视频 |
| `getRecentPlaylist` | `/record/recent/playlist` | 最近播放歌单 |
| `getRecentAlbum` | `/record/recent/album` | 最近播放专辑 |
| `getRecentDj` | `/record/recent/dj` | 最近播放播客 |

**需求**：
- [ ] 我的音乐页最近播放区增加多 Tab（歌曲/歌单/专辑/播客/视频）

---

## 首页发现增强

| API 函数 | 端点 | 用途 |
|:---------|:-----|:-----|
| `getHomepageBlockPage` | `/homepage/block/page` | 首页发现区块 |
| `getHomepageDragonBall` | `/homepage/dragon/ball` | 快捷入口 |
| `getPersonalizedDjprogram` | `/personalized/djprogram` | 推荐电台 |
| `getPersonalizedPrivatecontent` | `/personalized/privatecontent` | 独家放送 |
| `getSearchDefault` | `/search/default` | 默认搜索关键词 |
| `getSearchMultimatch` | `/search/multimatch` | 搜索多重匹配 |

**需求**：
- [ ] 发现页改用 `getHomepageBlockPage` 替代现有手动拼装
- [ ] 搜索框默认关键词 → `getSearchDefault`
- [ ] 搜索结果多重匹配（最佳匹配区）→ `getSearchMultimatch`
- [ ] 发现页增加「推荐电台」区块 → `getPersonalizedDjprogram`

---

## 执行建议

### 第一批（P0）预估工时
| 需求 | 新增/修改文件 | 预估 |
|:-----|:------------|:-----|
| 收藏系统 | 4 个详情页 + LibraryView | 2 天 |
| 歌单管理 | LibraryView + 弹窗组件 | 2 天 |
| 每日推荐 | DailyRecommendView + 路由 | 1 天 |
| 相似推荐 | 4 个详情页增加区块 | 1.5 天 |
| 评论集成 | 5 个详情页引入组件 | 1 天 |

### 第二批（P1）预估工时
| 需求 | 新增/修改文件 | 预估 |
|:-----|:------------|:-----|
| 歌单广场 | PlaylistsView + 路由 | 1.5 天 |
| 歌手浏览 | ArtistsView + 路由 | 1.5 天 |
| MV 浏览 | MvBrowseView + 路由 | 1.5 天 |
| 新碟上架 | AlbumsView + 路由 | 1 天 |
| 播客深度 | DjView 增强 | 1.5 天 |

### 第三批（P2+P3）预估工时
| 需求 | 预估 |
|:-----|:-----|
| 云盘完整功能 | 1.5 天 |
| 下载功能 | 2 天（含 Electron 主进程） |
| 用户社交 | 2 天 |
| 注册流程 | 1 天 |
| 歌曲/排行/本地/记录增强 | 3 天 |

**总计：约 25 个工作日**
