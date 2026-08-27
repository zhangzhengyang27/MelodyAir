# MelodyAir 项目交接文档

> 交接时间：2026-08-27
> 项目路径：`/Users/zhangzhengyang/Desktop/Claude/music/MelodyAir`
> 后端路径：`/Users/zhangzhengyang/Desktop/Claude/music/AI-node`

---

## 一、项目概览

- **类型**：Electron + Vue 3 + TypeScript 桌面音乐播放器（后续会发布 Web 端）
- **构建工具**：electron-vite
- **包管理器**：pnpm
- **UI 风格**：Airbnb 风格，Tailwind CSS v4
- **后端**：NestJS（网易云音乐 API 代理 + 缓存 + 本地音乐管理）
- **后端端口**：`http://localhost:3000`

### 关键目录

```
src/main/          Electron 主进程
src/preload/       Preload 脚本
src/renderer/      前端渲染层
  src/api/         接口封装
  src/components/  通用组件与业务组件
  src/views/       页面级视图
  src/stores/      Pinia 状态
  src/composables/ 组合式逻辑
  src/utils/       工具函数
```

---

## 二、本次会话已完成的工作

### 2.1 已提交（commit `64af248`）

```
fix: 修复多个页面功能与API路径问题
16 files changed, 241 insertions(+), 63 deletions(-)
```

涵盖：
- 歌单详情页空白：兼容 DB 缓存与 API 两种响应格式，增加错误回退 UI
- MV 详情页：兼容 DB 缓存返回裸 MV 对象的格式
- 播客详情页：兼容 `djRadio` 与 `data.djRadio` 两种嵌套格式
- 云盘/私人 FM：未登录时隐藏入口，增加登录引导与错误处理
- 发现页：未登录时隐藏每日推荐（而非显示登录提示）
- 排行榜：歌曲榜点击后详情视图替换列表；歌手榜 API 路径修正为 `/top/artist`
- 歌单广场：移除 `CoverImage` 的 `playable` 属性（无 `play` 处理函数，拦截点击导致无法跳转）
- 播放栏：全屏按钮改用 props+emit 替代 `defineModel`；音量滑块 hover 改为绝对定位不影响其他图标
- `PlayerFull`：lucide 的 `Image` 图标导入遮蔽全局 `Image` 构造函数，重命名为 `ImageIcon`
- API 路径：banner 改为 `/homepage/banner`；专辑详情改为 `/album/detail`
- 新增 `ArtistAvatar` 组件：歌手头像单图骨架屏 + 图片缓存

### 2.2 未提交的前端改动（MelodyAir）

| 状态 | 文件 | 说明 |
|---|---|---|
| D | `src/renderer/src/api/comment.ts` | 已删除评论 API 文件 |
| D | `src/renderer/src/components/common/CommentSection.vue` | 已删除评论组件 |
| M | `src/renderer/src/views/AlbumDetailView.vue` | 移除评论区 |
| M | `src/renderer/src/views/ArtistDetailView.vue` | 移除评论区 |
| M | `src/renderer/src/views/DjDetailView.vue` | 移除评论区 + 修复电台详情 `cacheValue` 格式兼容 |
| M | `src/renderer/src/views/DjView.vue` | 移除评论区 + 移除电台卡片 `playable`（修复点击跳转）+ 删除"节目榜单"板块 |
| M | `src/renderer/src/views/MvDetailView.vue` | 移除评论区 |
| M | `src/renderer/src/views/PlaylistDetailView.vue` | 移除评论区 |

### 2.3 未提交的后端改动（AI-node）

| 状态 | 文件 | 说明 |
|---|---|---|
| M | `src/modules/program/program.service.ts` | 修复 4 个方法的相对路径 → 完整 URL；`getTopList` 端点多次尝试后仍 404，当前改为小时榜端点但未验证 |
| M | `src/modules/album/album.service.ts` | （历史改动，非本次） |
| M | `src/modules/artist/artist.service.ts` | （历史改动，非本次） |
| M | `src/modules/playlist/playlist.service.ts` | （历史改动，非本次） |
| M | `src/modules/song/song.service.ts` | （历史改动，非本次） |
| M | `src/modules/oss/oss.service.ts` | （历史改动，非本次） |
| M | `src/common/persistence/cache-policy.ts` | （历史改动，非本次） |
| M | `prisma/schema.prisma` | （历史改动，非本次） |
| ?? | 多个 `.bak`/`.tmp`/`.backup` 文件 | 历史备份文件，可清理 |

---

## 三、待解决的问题

### 3.1 播客详情页（`DjDetailView.vue`）

**问题**：点击电台卡片进入详情页显示"加载电台失败"。

**根因已定位**：后端缓存命中时返回 `{ cacheValue: { 电台对象 } }` 格式，前端之前只处理了 `djRadio` / `data.djRadio` / 裸对象三种格式，未处理 `cacheValue` 包裹。

**当前状态**：已在 `DjDetailView.vue` 中增加 `cacheValue` 兼容（`raw?.cacheValue?.djRadio` / `raw?.cacheValue?.data?.djRadio` / `raw?.cacheValue` 裸对象），**但尚未验证**。需要启动项目后点击电台卡片确认是否正常显示。

**注意**：后端 `/dj/detail` 的缓存格式问题可能影响其他使用 `PersistenceService.getOrFetch` 的接口。如果其他详情页也出现空白，优先检查是否需要兼容 `cacheValue` 格式。参考 `PlaylistDetailView.vue` 已有的 `raw?.cacheValue?.playlist` 处理方式。

### 3.2 节目榜单接口（`/program/toplist`）

**问题**：前端播客页"节目榜单"板块调用 `/program/toplist`，返回 404。

**根因**：后端 `program.service.ts` 的 `getTopList` 方法调用的网易云端点不存在。已尝试以下端点均返回 404 或参数错误：
- `/weapi/dj/toplist`（原始）→ 404
- `/api/dj/program/toplist` → 400 参数错误
- `/api/dj/toplist` → 404
- `/api/dj/toplist/week` → 404

**当前处理**：已从前端 `DjView.vue` 中**删除"节目榜单"板块**和 `getProgramToplist` 调用。后端 `program.service.ts` 的 `getTopList` 方法当前改为 `/api/dj/toplist/hours`（小时榜端点，已知可用），但前端已不再调用。

**后续可选**：
- 如果需要恢复节目榜单，可使用小时榜端点 `/api/dj/toplist/hours`（返回格式 `{ code: 200, data: { list: [...] } }`），前端需解析 `raw.data.list`
- 或彻底删除后端 `getTopList` 方法和 `ProgramController` 中的 `/program/toplist` 路由

### 3.3 后端相对路径问题（潜在）

**问题**：后端约 24 个 service 文件中存在 `requestService.post('/weapi/xxx')` 相对路径调用。`requestService.post` 不会自动补全域名，相对路径会导致 "Invalid URL" 502 错误。

**已修复**：`program.service.ts` 的 4 个方法已改为完整 URL `https://music.163.com/...`。

**待排查**：其他 23 个文件（`fm.service.ts`、`homepage.service.ts`、`related.service.ts` 等）是否也有此问题。如果前端调用这些模块的接口出现 502 "Invalid URL"，优先检查 service 中的 URL 是否为相对路径。

**排查命令**：
```bash
grep -rn "requestService\.\(post\|get\)('/" src/modules/
```

### 3.4 播客页其他 API（非阻塞）

播客页 `DjView.vue` 还调用了以下接口，部分可能有问题：
- `getProgramRecommend()` → `/program/recommend` → **已验证正常**（返回 `{ code: 200, result: [...] }`）
- `getDjBanner()` → `/dj/banner` → 正常
- `getDjRecommend()` → `/dj/recommend` → 正常
- `getDjRadioHot()` → `/dj/radio/hot` → 正常
- `getDjHot()` → `/dj/hot` → 正常

---

## 四、项目关键约定与注意事项

### 4.1 Tailwind CSS v4 规范

- **禁止**使用旧版自定义 token 类名：`bg-coral-*`、`text-coral-*`、`rounded-airbnb`、`shadow-card`
- 自定义颜色优先使用任意值：`bg-[#FF5A5F]`
- 圆角优先使用标准类：`rounded-xl`、`rounded-2xl`、`rounded-lg`
- 阴影优先使用任意值：`shadow-[0_2px_16px_rgba(0,0,0,0.08)]`
- Vue `<style scoped>` 中尽量避免 `@apply`，优先原生 CSS

### 4.2 CoverImage 组件点击陷阱

`CoverImage` 组件的 `playable` 属性会渲染一个带 `@click.stop` 的播放按钮覆盖层。**如果父级卡片没有绑定 `@play` 处理函数，`playable` 会拦截整个卡片的点击事件**，导致路由跳转失效。

**已修复的页面**：`PlaylistsView.vue`、`PlaylistDetailView.vue`、`DjView.vue`（移除了无 `@play` 的 `playable`）。

**排查方式**：搜索 `CoverImage` + `playable`，确认每个 `playable` 都有对应的 `@play` 处理。

### 4.3 后端缓存格式（重要）

后端 `PersistenceService.getOrFetch` 在缓存命中时返回的格式可能是：
```json
{ "cacheValue": { 实际数据 }, "updatedAt": "..." }
```

而 API 直接返回时格式取决于各 service 的 `transform` 函数。前端详情页必须兼容多种格式，典型处理方式（参考 `PlaylistDetailView.vue`）：

```js
const raw = detailRes.value as any
const data = raw?.playlist           // API 直接返回 { playlist: {...} }
  || raw?.data?.playlist              // API 返回 { data: { playlist: {...} } }
  || raw?.cacheValue?.playlist        // 缓存命中 { cacheValue: { playlist: {...} } }
  || raw?.cacheValue?.data?.playlist  // 缓存命中嵌套格式
  || null
```

### 4.4 评论功能已移除

所有详情页的评论区已移除，相关文件已删除：
- `src/renderer/src/api/comment.ts`（已删除）
- `src/renderer/src/components/common/CommentSection.vue`（已删除）
- `PlaylistDetailView`、`AlbumDetailView`、`ArtistDetailView`、`MvDetailView`、`DjDetailView` 中的评论区模板和导入已移除

### 4.5 未登录处理

- 云盘、私人 FM：未登录时在侧边栏隐藏入口
- 每日推荐：未登录时在发现页隐藏（不显示登录提示）
- 涉及登录的接口返回 401/301 时，前端应有优雅降级

---

## 五、开发命令

### 前端（MelodyAir）

```bash
pnpm dev          # 启动开发环境
pnpm build        # 构建应用
pnpm lint         # 检查渲染层代码
pnpm lint:fix     # 自动修复
```

### 后端（AI-node）

```bash
pnpm start        # 启动（nest start，无热重载）
pnpm start:dev    # 开发模式（nest start --watch，热重载）
pnpm build        # 构建
```

**注意**：`pnpm start` 修改代码后需要手动重启。建议开发时使用 `pnpm start:dev`。

### Lint 单文件

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx eslint <文件路径> --ext .vue,.ts
```

---

## 六、后续建议优先级

1. **验证播客详情页修复**：启动项目，点击播客页的电台卡片，确认详情页正常显示电台信息和节目列表
2. **提交未提交的代码**：前端评论移除 + 播客相关修复；后端 `program.service.ts` 相对路径修复
3. **排查后端相对路径**：全局搜索 `requestService.post('/` 或 `requestService.get('/`，修复其他模块的相对路径问题
4. **清理后端备份文件**：AI-node 目录下多个 `.bak`/`.tmp`/`.backup` 文件可清理
5. **节目榜单**：如需恢复，使用小时榜端点 `/api/dj/toplist/hours`

---

## 七、关键文件速查

| 功能 | 文件路径 |
|---|---|
| 侧边栏 | `src/renderer/src/components/layout/AppSidebar.vue` |
| 顶栏 | `src/renderer/src/components/layout/AppHeader.vue` |
| 播放栏 | `src/renderer/src/components/layout/AppPlayer.vue` |
| 全屏播放 | `src/renderer/src/components/player/PlayerFull.vue` |
| 播客列表页 | `src/renderer/src/views/DjView.vue` |
| 播客详情页 | `src/renderer/src/views/DjDetailView.vue` |
| 歌单详情页 | `src/renderer/src/views/PlaylistDetailView.vue` |
| 封面图组件 | `src/renderer/src/components/common/CoverImage.vue` |
| 歌手头像组件 | `src/renderer/src/components/common/ArtistAvatar.vue` |
| 前端 API 入口 | `src/renderer/src/api/index.ts` |
| 后端 program 模块 | `AI-node/src/modules/program/program.service.ts` |
| 后端请求服务 | `AI-node/src/common/request/request.service.ts` |
| 后端缓存服务 | `AI-node/src/common/persistence/persistence.service.ts` |
