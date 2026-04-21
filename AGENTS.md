# AGENTS.md

## 项目概览

- 项目名：`MelodyAir`
- 类型：Electron + Vue 3 + TypeScript 桌面音乐播放器
- 构建工具：`electron-vite`
- 包管理器：`pnpm`
- UI 风格：Airbnb 风格，当前项目使用 Tailwind CSS v4

## 目录约定

- `src/main/`：Electron 主进程
- `src/preload/`：Preload 脚本
- `src/renderer/`：前端渲染层
  - `src/renderer/src/api/`：接口封装
  - `src/renderer/src/components/`：通用组件与业务组件
  - `src/renderer/src/views/`：页面级视图
  - `src/renderer/src/stores/`：Pinia 状态
  - `src/renderer/src/composables/`：组合式逻辑
  - `src/renderer/src/utils/`：工具函数

## 开发与构建命令

- `pnpm dev`：启动开发环境
- `pnpm build`：构建应用
- `pnpm lint`：检查渲染层代码
- `pnpm lint:fix`：自动修复渲染层可修复问题

## 代码与实现原则

1. 优先复用现有 API、组件、Store、Composable，不要重复造轮子。
2. 新增功能前，先确认是否已有对应页面、组件或接口封装可直接扩展。
3. 渲染层代码以 Vue 3 + TypeScript 为主，保持响应式和类型清晰。
4. 主进程改动要谨慎，优先只在确有需要时触碰 `src/main/`。
5. 改动后尽量保持最小范围提交，避免不相关重构。

## Tailwind CSS v4 规范

本项目已明确使用 Tailwind CSS v4，必须遵守 `.ai/STYLE_GUIDE.md` 中的规则：

- 不要使用旧版自定义 token 类名，如 `bg-coral-*`、`text-coral-*`、`rounded-airbnb`、`shadow-card`
- 自定义颜色优先使用任意值写法，例如 `bg-[#FF5A5F]`
- 圆角优先使用标准类，例如 `rounded-xl`、`rounded-2xl`、`rounded-lg`
- 阴影优先使用任意值写法，例如 `shadow-[0_2px_16px_rgba(0,0,0,0.08)]`
- Vue `<style scoped>` 中尽量避免依赖 `@apply`，优先原生 CSS

## 音乐播放器相关注意事项

- 播放状态、播放队列、音量、歌词等逻辑通常与 `usePlayer`、`useAudio`、`player` store 相关
- 涉及用户登录、收藏、歌单、评论、云盘等能力时，优先查看 `src/renderer/src/api/` 和对应的 `store`
- 任何影响播放体验的修改都要注意兼容已存在的队列、缓存和媒体会话逻辑

## 开发建议

- 先读现有实现，再动手改代码
- 尽量保持界面与现有风格一致
- 如果需求涉及较大范围改动，先拆成小步实现
- 修改后检查相关 lint / 类型问题，必要时同步修正

## 后续协作方式

后续如果你提出新需求，我会默认：

1. 先熟悉相关现有实现
2. 优先在现有架构内扩展
3. 保持 Tailwind v4 规范
4. 改动后检查必要的 lint 或类型问题
