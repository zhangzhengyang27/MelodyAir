# MelodyAir 🎵

一个基于 **Electron + Vue 3 + TypeScript** 的桌面音乐播放器，UI 采用 Airbnb 风格，覆盖网易云音乐核心能力，支持 macOS / Windows / Linux。

## 功能特性

- **完整播放器**：播放队列、自动缓存下一首、进度条、均衡器、睡眠定时器、全局快捷键
- **歌词**：逐字滚动歌词、桌面歌词独立窗口、翻译显示、字号/对齐自定义
- **发现与检索**：每日推荐、排行榜、搜索、私人 FM、播客/电台、MV 浏览
- **个人音乐库**：我喜欢的音乐、创建的歌单、收藏专辑/歌手、本地音乐扫描与批量导入、云盘
- **登录**：手机号登录 / 扫码登录（QRCode）
- **多窗口**：主窗口、迷你播放器、桌面歌词
- **macOS TouchBar** 支持
- **主题**：跟随系统 / 浅色 / 深色切换

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Vue 3.5 + TypeScript 5.9 |
| 状态管理 | Pinia 3 + pinia-plugin-persistedstate |
| 路由 | vue-router 5 |
| UI | Tailwind CSS v4 + lucide-vue-next |
| 音频 | Howler.js |
| 缓存 | Dexie（IndexedDB） |
| 打包 | electron-vite 5 + electron-builder 26 + Electron 35 |

## 环境要求

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- 后端服务 `music-backend`（本仓库同级目录），默认接口地址 `http://localhost:3001`

> 本项目依赖网易云音乐 API 后端（`music-backend`），需先启动后端才能正常使用登录、歌单、歌词等功能。

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发环境（会打开 Electron 窗口）
pnpm dev

# 3. 本地构建
pnpm build
```

## 脚本命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Electron 开发环境 |
| `pnpm dev:web` | 启动纯浏览器开发模式（端口 5173） |
| `pnpm build` | 构建渲染层/主进程产物到 `out/` |
| `pnpm build:web` | 构建 Web 部署产物到 `dist-web/` |
| `pnpm lint` / `pnpm lint:fix` | ESLint 检查 / 自动修复 |
| `pnpm build:mac` | 打包 macOS（dmg + zip）到 `release/` |
| `pnpm build:win` | 打包 Windows（nsis）到 `release/` |
| `pnpm build:linux` | 打包 Linux（AppImage）到 `release/` |

## Web 部署

项目支持构建纯浏览器版本（无 Electron）：

```bash
pnpm build:web
```

- 产物输出到 `dist-web/`
- 路由使用 history 模式，部署端需将请求回退到 `/index.html`（如 Nginx `try_files`）
- 默认 API 地址通过 `VITE_API_BASE` 注入，开发环境回退到 `http://localhost:3001`
- 仅 Web 构建注入 Umami 统计脚本，Electron 桌面版不注入

## 目录结构

```
src/
├── main/        # Electron 主进程（窗口、托盘、快捷键、TouchBar）
├── preload/     # Preload 脚本（contextBridge 暴露 API）
└── renderer/
    ├── src/
    │   ├── api/         # 后端接口封装（axios 实例 + 按资源分类）
    │   ├── components/  # 通用组件与业务组件
    │   ├── composables/ # 组合式逻辑
    │   ├── stores/      # Pinia 状态
    │   ├── utils/       # 工具函数
    │   └── views/       # 页面级视图
    └── index.html       # 主界面入口
build/         # 应用图标（icon.icns / icon.png）
scripts/       # 构建辅助脚本（如 macOS 图标替换）
docs/          # 需求、设计、验收文档
```

## 配置

- **API 地址**：默认 `http://localhost:3001`，可在「设置」页面修改，或通过 `VITE_API_BASE` 环境变量注入
- **本地配置**：`.mcp.json`、`.env.web` 等为本地/部署配置，均已在 `.gitignore` 中忽略

## 持续集成与发布

项目使用 GitHub Actions 自动完成校验与发布，详见 `.github/workflows/`：

- **CI 校验**（`ci.yml`）：主分支 / PR 触发，执行安装、lint、构建，保证代码质量
- **发布**（`release.yml`）：推送 `v*` 标签时，在 macOS 与 Windows 上构建安装包并上传到 [GitHub Releases](https://github.com/zhangzhengyang27/MelodyAir/releases)

触发发布：

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 相关项目

- `music-backend`：网易云音乐 API 后端（NestJS），本项目的数据服务，部署于 `music-backend/` 目录（与前端分离的 Git 仓库）

## License

[MIT](./LICENSE)
