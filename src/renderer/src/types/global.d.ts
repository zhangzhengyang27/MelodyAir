// 构建期注入的全局常量（见 electron.vite.config.ts / vite.web.config.ts 的 define）
// Electron 桌面端与 Web 端共用同一套注入，渲染层无需区分构建目标即可读取版本号。

/** 应用版本号，取自 package.json 的 version 字段 */
declare const __APP_VERSION__: string
