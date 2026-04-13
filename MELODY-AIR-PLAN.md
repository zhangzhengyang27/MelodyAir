# Melody Air - 音乐桌面应用开发计划

## 项目概览

| 项目         | 详情                                                          |
| ------------ | ------------------------------------------------------------- |
| **项目名**   | `melody-air`                                                  |
| **技术栈**   | Electron + electron-vite + Vue 3 + Vite + TailwindCSS + Pinia |
| **设计风格** | Airbnb 风格（珊瑚色强调、圆角 UI、摄影驱动布局）              |
| **后端**     | 对接现有 NestJS API (AI-node)                                 |
| **目标平台** | Windows / macOS / Linux                                       |

---

## 后端 API 能力盘点

后端共有 **62 个业务模块**，核心可用 API 如下：

| 域           | 主要端点                                                                         | 前端功能对应               |
| ------------ | -------------------------------------------------------------------------------- | -------------------------- |
| **首页**     | `/homepage/block/page`, `/homepage/banner`, `/homepage/dragon/ball`              | 首页发现、轮播、快捷入口   |
| **个性化**   | `/personalized`, `/personalized/newsong`, `/personalized/mv`, `/recommend/songs` | 每日推荐、推荐歌单/新歌/MV |
| **搜索**     | `/cloudsearch`, `/search/hot/detail`, `/search/suggest`, `/search/multimatch`    | 全局搜索、热搜、搜索建议   |
| **歌曲**     | `/song/detail`, `/song/url`, `/lyric`, `/song/download/url`, `/check/music`      | 播放核心、歌词、下载       |
| **歌单**     | `/playlist/detail`, `/playlist/hot`, `/playlist/catlist`, CRUD + track 管理      | 歌单浏览/管理/收藏         |
| **用户**     | `/user/detail`, `/user/playlist`, `/user/account`, `/likelist`, `/like`          | 个人中心、我喜欢的音乐     |
| **认证**     | `/login/cellphone`, `/qr/key+create+check`, `/login/status`, `/logout`           | 手机/二维码登录            |
| **歌手**     | `/artist/detail`, `/artist/songs`, `/artist/album`, `/artist/mv`                 | 歌手页                     |
| **专辑**     | `/album/detail`, `/album/new`, `/album/sublist`                                  | 专辑页                     |
| **MV**       | `/mv/detail`, `/mv/url`, `/mv/all`, `/mv/first`                                  | MV 播放                    |
| **排行榜**   | `/toplist`, `/toplist/detail`, `/top/song`, `/top/album`                         | 排行榜                     |
| **评论**     | `/comment`, `/comment/hot`, `/comment/new`                                       | 评论系统                   |
| **私人 FM**  | `/personal/fm`, `/fm/trash`                                                      | 私人 FM                    |
| **云盘**     | `/user/cloud`, `/cloud/match`                                                    | 音乐云盘                   |
| **相似推荐** | `/simi/song`, `/simi/playlist`, `/simi/artist`                                   | 相似推荐                   |
| **最近播放** | `/record/recent/song`, `/record/recent/album`                                    | 历史记录                   |

---

## 项目目录结构

```
melody-air/
├── electron.vite.config.ts
├── package.json
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 窗口创建、IPC
│   │   ├── tray.ts              # 系统托盘
│   │   └── shortcut.ts          # 全局快捷键
│   ├── preload/                 # 预加载脚本
│   │   └── index.ts
│   └── renderer/                # Vue 3 渲染进程
│       ├── src/
│       │   ├── App.vue
│       │   ├── main.ts
│       │   ├── assets/
│       │   │   └── styles/
│       │   │       └── tailwind.css       # Airbnb 主题变量
│       │   ├── api/                       # API 层
│       │   │   ├── index.ts               # axios 实例 + 拦截器
│       │   │   ├── auth.ts                # 登录/注册/二维码
│       │   │   ├── song.ts                # 歌曲/歌词/下载
│       │   │   ├── playlist.ts            # 歌单 CRUD
│       │   │   ├── search.ts              # 搜索/热搜/建议
│       │   │   ├── user.ts                # 用户信息/喜欢/歌单
│       │   │   ├── artist.ts              # 歌手详情/歌曲/MV
│       │   │   ├── album.ts               # 专辑详情/收藏
│       │   │   ├── mv.ts                  # MV 详情/播放
│       │   │   ├── comment.ts             # 评论/热门评论
│       │   │   ├── fm.ts                  # 私人FM
│       │   │   ├── cloud.ts               # 云盘
│       │   │   ├── top.ts                 # 排行榜
│       │   │   ├── personalized.ts        # 个性化推荐
│       │   │   ├── simi.ts                # 相似推荐
│       │   │   └── record.ts              # 最近播放
│       │   ├── stores/                    # Pinia 状态管理
│       │   │   ├── player.ts              # 播放器核心状态
│       │   │   ├── user.ts                # 用户/登录状态
│       │   │   ├── music.ts               # 歌曲/歌单数据
│       │   │   └── settings.ts            # 应用设置
│       │   ├── composables/               # Vue 组合式函数
│       │   │   ├── usePlayer.ts           # 播放控制
│       │   │   ├── useAudio.ts            # Audio API 封装
│       │   │   ├── useLyric.ts            # 歌词解析与滚动
│       │   │   └── useSearch.ts           # 搜索防抖与历史
│       │   ├── router/
│       │   │   └── index.ts
│       │   ├── components/                # 通用组件
│       │   │   ├── layout/
│       │   │   │   ├── AppSidebar.vue     # 左侧导航栏
│       │   │   │   ├── AppHeader.vue      # 顶部搜索/用户栏
│       │   │   │   └── AppPlayer.vue      # 底部播放栏
│       │   │   ├── common/
│       │   │   │   ├── CoverImage.vue     # 圆角封面（摄影驱动）
│       │   │   │   ├── CoralButton.vue    # 珊瑚色按钮
│       │   │   │   ├── SongRow.vue        # 歌曲列表行
│       │   │   │   ├── SongTable.vue      # 歌曲表格
│       │   │   │   ├── SectionHeader.vue  # 区块标题
│       │   │   │   └── LoadingSpinner.vue # 加载动画
│       │   │   └── player/
│       │   │       ├── PlayerFull.vue     # 全屏播放器
│       │   │       ├── LyricView.vue      # 歌词展示
│       │   │       └── PlaylistQueue.vue  # 播放队列
│       │   ├── views/
│       │   │   ├── DiscoverView.vue       # 发现页（首页）
│       │   │   ├── SearchView.vue         # 搜索页
│       │   │   ├── PlaylistDetailView.vue # 歌单详情
│       │   │   ├── ArtistDetailView.vue   # 歌手详情
│       │   │   ├── AlbumDetailView.vue    # 专辑详情
│       │   │   ├── MvDetailView.vue       # MV 播放
│       │   │   ├── ToplistView.vue        # 排行榜
│       │   │   ├── FmView.vue             # 私人FM
│       │   │   ├── CloudView.vue          # 云盘
│       │   │   ├── LibraryView.vue        # 我的音乐
│       │   │   ├── LoginView.vue          # 登录页
│       │   │   └── SettingsView.vue       # 设置页
│       │   └── utils/
│       │       ├── lyric.ts               # 歌词解析器
│       │       ├── format.ts              # 时间/数字格式化
│       │       └── storage.ts             # 本地存储封装
│       └── index.html
├── tailwind.config.ts
├── postcss.config.js
└── tsconfig.json
```

---

## 开发阶段划分

### Phase 1: 项目初始化与基础框架（~3 天）

**目标**：搭建项目骨架，跑通 Electron + Vue 3 开发环境

#### 任务清单

- [ ] 使用 `pnpm create @quick-start/electron` 初始化 electron-vite 项目
- [ ] 安装配置 TailwindCSS + 自定义 Airbnb 主题
- [ ] 安装配置 Pinia + Vue Router
- [ ] 封装 axios API 层，对接后端 `http://localhost:3000`
- [ ] 实现布局框架：侧边栏 + 顶栏 + 内容区 + 底部播放栏
- [ ] 实现亮色/暗色主题切换基础
- [ ] Electron 窗口基础配置（无边框、最小尺寸）

#### 交付物

- 可运行的 Electron 空壳应用
- 完整的侧边栏导航 + 路由跳转
- API 请求层可正常与后端通信

---

### Phase 2: 核心播放功能（~5 天）

**目标**：实现音乐播放的核心链路，从选歌到播放到歌词

#### 任务清单

- [ ] `useAudio` 组合式函数 - 基于 HTML5 Audio API 的播放控制
- [ ] `usePlayer` - 播放列表管理、播放模式（顺序/随机/单曲循环）
- [ ] 底部播放栏 `AppPlayer.vue` - 封面 + 歌曲信息 + 控制按钮 + 进度条
- [ ] 全屏播放器 `PlayerFull.vue` - 大封面旋转 + 歌词滚动
- [ ] 歌词解析器 `lyric.ts` - LRC 格式解析 + 逐行高亮
- [ ] 对接 `/song/url` + `/song/detail` + `/lyric` API
- [ ] `SongRow.vue` / `SongTable.vue` 通用歌曲列表组件
- [ ] Electron 主进程：媒体控制（MPRIS/系统媒体键）
- [ ] 最小化到托盘 + 托盘菜单

#### 交付物

- 完整的播放控制链路（选歌 → 获取 URL → 播放 → 进度 → 下一首）
- 底部播放栏 + 全屏播放器
- 歌词实时滚动
- 系统媒体键支持

---

### Phase 3: 发现与浏览页面（~5 天）

**目标**：实现核心浏览体验，用户可以探索和发现音乐

#### 任务清单

- [ ] **首页发现** `DiscoverView.vue`
  - [ ] 轮播 Banner → `/homepage/banner`
  - [ ] 推荐歌单网格 → `/personalized`（摄影驱动大卡片）
  - [ ] 推荐新歌 → `/personalized/newsong`
  - [ ] 推荐 MV → `/personalized/mv`
  - [ ] 每日推荐歌曲 → `/recommend/songs`
- [ ] **搜索** `SearchView.vue`
  - [ ] 搜索框 + 热搜 → `/search/hot/detail`
  - [ ] 搜索建议（实时下拉）→ `/search/suggest`
  - [ ] 多 Tab 结果（歌曲/歌手/专辑/歌单/MV）→ `/cloudsearch`
- [ ] **排行榜** `ToplistView.vue` → `/toplist` + `/toplist/detail`
- [ ] **歌单详情** `PlaylistDetailView.vue`
  - [ ] 歌单封面 + 信息 → `/playlist/detail`
  - [ ] 歌曲列表 → `/playlist/track/all`
  - [ ] 相似歌单推荐 → `/simi/playlist`
- [ ] **歌手详情** `ArtistDetailView.vue`
  - [ ] 歌手信息 → `/artist/detail` + `/artist/desc`
  - [ ] 热门歌曲 → `/artist/top/song`
  - [ ] 专辑列表 → `/artist/album`
  - [ ] MV 列表 → `/artist/mv`
  - [ ] 相似歌手 → `/simi/artist`
- [ ] **专辑详情** `AlbumDetailView.vue` → `/album/detail` + `/album/detail/dynamic`

#### 交付物

- 完整的首页发现体验
- 搜索功能全链路
- 歌单/歌手/专辑/排行榜详情页

---

### Phase 4: 用户系统与个人中心（~3 天）

**目标**：实现登录与个人音乐管理

#### 任务清单

- [ ] **登录页** `LoginView.vue`
  - [ ] 手机号 + 验证码登录 → `/login/cellphone` + `/captcha/sent`
  - [ ] 二维码扫码登录 → `/qr/key` + `/qr/create` + `/qr/check`
  - [ ] 登录状态检测 → `/login/status`
  - [ ] Cookie 管理（Electron 持久化）
- [ ] **我的音乐** `LibraryView.vue`
  - [ ] 我喜欢的 → `/likelist` + `/song/detail`
  - [ ] 我创建/收藏的歌单 → `/user/playlist`
  - [ ] 最近播放 → `/record/recent/song`
  - [ ] 收藏的歌手 → `/artist/sublist`
  - [ ] 收藏的专辑 → `/album/sublist`
  - [ ] 收藏的 MV → `/mv/sublist`
- [ ] **收藏/点赞功能**
  - [ ] 喜欢/取消喜欢歌曲 → `/like`
  - [ ] 收藏/取消收藏歌单 → `/playlist/subscribe`
  - [ ] 收藏/取消收藏歌手 → `/artist/sub`
  - [ ] 收藏/取消收藏专辑 → `/album/sub`
  - [ ] 收藏/取消收藏 MV → `/mv/sub`
- [ ] **评论系统**
  - [ ] 评论列表 → `/comment` + `/comment/new`
  - [ ] 热门评论 → `/comment/hot`
  - [ ] 点赞评论 → `/comment/like`

#### 交付物

- 完整的登录流程（手机号 + 二维码）
- 个人中心页面
- 收藏/点赞交互

---

### Phase 5: 高级功能与打磨（~4 天）

**目标**：补齐功能，优化体验，准备发布

#### 任务清单

- [ ] **私人 FM** `FmView.vue`
  - [ ] 获取 FM 歌曲 → `/personal/fm`
  - [ ] 不喜欢（垃圾桶）→ `/fm/trash`
  - [ ] 智能播放列表 → `/fm/playmode/intelligence/list`
- [ ] **MV 播放** `MvDetailView.vue`
  - [ ] MV 详情 → `/mv/detail` + `/mv/detail/info`
  - [ ] MV 播放地址 → `/mv/url`
  - [ ] 相似 MV → `/simi/mv`
  - [ ] MV 评论 → `/comment`
- [ ] **音乐云盘** `CloudView.vue`
  - [ ] 云盘歌曲列表 → `/user/cloud`
  - [ ] 云盘歌曲详情 → `/user/cloud/detail`
  - [ ] 上传歌曲 → `/cloud`
  - [ ] 删除歌曲 → `/user/cloud/del`
- [ ] **应用设置** `SettingsView.vue`
  - [ ] API 地址配置
  - [ ] 默认音质选择
  - [ ] 主题切换（亮色/暗色）
  - [ ] 最小化到托盘开关
  - [ ] 全局快捷键配置
- [ ] **亮色/暗色主题完善**
  - [ ] TailwindCSS `darkMode: 'class'`
  - [ ] 全部组件适配暗色模式
  - [ ] 跟随系统主题
- [ ] **Electron 打包与发布**
  - [ ] electron-builder 配置
  - [ ] 应用图标
  - [ ] 自动更新
  - [ ] Windows/macOS/Linux 打包测试
- [ ] **性能优化**
  - [ ] 虚拟列表（长歌曲列表）
  - [ ] 图片懒加载
  - [ ] 路由懒加载
  - [ ] 请求缓存与去重

#### 交付物

- 功能完整的桌面应用
- 可打包发布的安装包
- 性能优化报告

---

## Airbnb 风格 TailwindCSS 主题配置

```typescript
// tailwind.config.ts
import { defineConfig } from "tailwindcss";

export default defineConfig({
  darkMode: "class",
  content: ["./src/renderer/src/**/*.{vue,ts,html}"],
  theme: {
    extend: {
      colors: {
        coral: {
          50: "#FFF5F3",
          100: "#FFE8E3",
          200: "#FFD0C7",
          300: "#FFB0A0",
          400: "#FF7F66",
          500: "#FF5A5F", // Airbnb 珊瑚主色
          600: "#E0484D",
          700: "#C43A3F",
          800: "#9E2F33",
          900: "#7A2528",
        },
        neutral: {
          50: "#FFFFFF",
          100: "#F7F7F7",
          200: "#EBEBEB",
          300: "#DDDDDD",
          400: "#C4C4C4",
          500: "#767676", // Airbnb 文字灰
          600: "#484848",
          700: "#333333",
          800: "#222222",
          900: "#111111",
        },
      },
      borderRadius: {
        airbnb: "12px", // Airbnb 标准圆角
        card: "16px", // 卡片圆角
        cover: "8px", // 封面圆角
      },
      boxShadow: {
        card: "0 2px 16px rgba(0,0,0,0.08)",
        "card-hover": "0 6px 20px rgba(0,0,0,0.12)",
        player: "0 -2px 20px rgba(0,0,0,0.06)",
      },
      fontFamily: {
        sans: ["Circular", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        title: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        subtitle: ["18px", { lineHeight: "1.4", fontWeight: "500" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
});
```

---

## 核心页面 UI 设计思路

### 整体布局

```
┌──────────────────────────────────────────────────────┐
│  AppHeader: 搜索框 · 后退/前进 · 用户头像 · 设置     │
├──────┬───────────────────────────────────────────────┤
│      │                                               │
│ 侧   │                                               │
│ 边   │            主内容区                            │
│ 栏   │         (router-view)                         │
│      │                                               │
│ 发   │                                               │
│ 现   │                                               │
│      │                                               │
│ 排   │                                               │
│ 行   │                                               │
│ 榜   │                                               │
│      │                                               │
│ 我   │                                               │
│ 的   │                                               │
│      │                                               │
│ FM   │                                               │
│      │                                               │
│ 云   │                                               │
│ 盘   │                                               │
│      │                                               │
├──────┴───────────────────────────────────────────────┤
│  AppPlayer: 封面 · 歌曲信息 · 控制按钮 · 进度条 · 音量│
└──────────────────────────────────────────────────────┘
```

### 首页发现

```
┌──────────────────────────────────────────────────┐
│  🔍 搜索框                              👤 头像  │
├──────┬───────────────────────────────────────────┤
│      │  ┌─────────────────────────────────────┐  │
│ 侧   │  │         Banner 轮播大图              │  │
│ 边   │  │      (圆角 card, 摄影驱动)           │  │
│ 栏   │  └─────────────────────────────────────┘  │
│      │                                           │
│ 发   │  推荐歌单                                  │
│ 现   │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│      │  │ 🖼 │ │ 🖼 │ │ 🖼 │ │ 🖼 │ │ 🖼 │     │
│ 排   │  │    │ │    │ │    │ │    │ │    │     │
│ 行   │  └────┘ └────┘ └────┘ └────┘ └────┘     │
│ 榜   │  歌单名   歌单名   歌单名   歌单名        │
│      │                                           │
│ 我   │  推荐新歌                                  │
│ 的   │  🎵 Song A - Artist A          ▶ 3:45    │
│      │  🎵 Song B - Artist B          ▶ 4:12    │
│ 私人 │  🎵 Song C - Artist C          ▶ 2:58    │
│ FM   │                                           │
│      │  推荐MV                                    │
│ 云   │  ┌──────┐ ┌──────┐ ┌──────┐              │
│ 盘   │  │ MV 1 │ │ MV 2 │ │ MV 3 │              │
│      │  └──────┘ └──────┘ └──────┘              │
├──────┴───────────────────────────────────────────┤
│  🎵 正在播放: Song A - Artist A   ◀ ▶ ▶▶  ━━━━ │
└──────────────────────────────────────────────────┘
```

### 全屏播放器

```
┌──────────────────────────────────────────────────┐
│                                                  │
│         ┌────────────────────────┐               │
│         │                        │               │
│         │    专辑封面 (大圆角)     │               │
│         │    模糊背景 backdrop    │               │
│         │                        │               │
│         └────────────────────────┘               │
│                                                  │
│              Song Name                           │
│              Artist Name                         │
│                                                  │
│         ━━━━━━━━━━━●━━━━━━━━━━━━━               │
│         1:23              3:45                   │
│                                                  │
│         🔀    ◀◀    ▶    ▶▶    🔁               │
│                    ⏸                              │
│                                                  │
│              🎵 歌词区域 🎵                       │
│              上一句歌词                            │
│         >>> 当前高亮歌词 <<<                       │
│              下一句歌词                            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 搜索页

```
┌──────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────┐    │
│  │ 🔍  搜索音乐/歌手/专辑/歌单              │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  热搜榜                          搜索建议        │
│  1. 🔥 关键词 A                   歌手名         │
│  2. 关键词 B                      专辑名         │
│  3. 关键词 C                      歌曲名         │
│  4. 关键词 D                                     │
│                                                  │
│  ── 搜索结果 ──                                  │
│  [歌曲] [歌手] [专辑] [歌单] [MV]   ← Tab切换    │
│                                                  │
│  🎵 Song A - Artist A - Album A     ▶ 3:45      │
│  🎵 Song B - Artist B - Album B     ▶ 4:12      │
│  🎵 Song C - Artist C - Album C     ▶ 2:58      │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 关键依赖清单

```json
{
  "dependencies": {
    "vue": "^3.5",
    "vue-router": "^5.0",
    "pinia": "^3.0",
    "axios": "^1.15",
    "@electron/remote": "^2.1"
  },
  "devDependencies": {
    "electron": "^35",
    "electron-vite": "^5.0",
    "electron-builder": "^26",
    "tailwindcss": "^4.1",
    "@tailwindcss/vite": "^4.1",
    "typescript": "^5.9",
    "@vitejs/plugin-vue": "^6.0",
    "vite": "^7.0"
  }
}
```

---

## 时间线总览

| 阶段    | 内容                 | 预计时间 | 累计  |
| ------- | -------------------- | -------- | ----- |
| Phase 1 | 项目初始化与基础框架 | 3 天     | 3 天  |
| Phase 2 | 核心播放功能         | 5 天     | 8 天  |
| Phase 3 | 发现与浏览页面       | 5 天     | 13 天 |
| Phase 4 | 用户系统与个人中心   | 3 天     | 16 天 |
| Phase 5 | 高级功能与打磨       | 4 天     | 20 天 |

**总计预估：约 20 个工作日**

---

## 参考

- [electron-vite 官方文档](https://electron-vite.org/)
- [YesPlayMusic](https://github.com/qier222/YesPlayMusic) - 界面与交互参考
- [Airbnb Design System](https://getdesign.md/airbnb/design-md) - 设计风格参考
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Pinia](https://pinia.vuejs.org/) - 状态管理
