# MelodyAir 路线图

> 本文件是唯一现行路线图。历史计划（MELODY-AIR-PLAN、IDLE-API-REQUIREMENTS、HANDOVER）已移入 `archive/`，仅作快照，勿作为开发依据。

## 当前状态（2026-09）

- 版本 v1.1.8，桌面三平台 + Web 版（https://music.zhangzhengyang.com）均已发布
- 已完成：完整播放链路（队列/循环/随机/倒序/私人 FM）、逐字歌词 + 桌面歌词、发现/搜索/排行榜/歌单/歌手/专辑/MV/播客浏览、登录（手机 + 扫码）、云盘、每日推荐、歌单广场/歌手/MV/新碟浏览页
- 后端 music-backend：网易云 API 网关（266 路由）+ 灰色歌曲解锁 + 音频流代理，NAS Docker 部署
- 质量门禁（2026-09-24 建立）：CI 触发 master，Lint + vue-tsc 类型检查 + vitest 单测 + Build 四道闸

## 近期计划（按优先级）

1. **修复播放导航栈死代码缺陷**：所有切歌路径都先把 `currentIndex` 指向新歌再调 `playSong`，导致 `playSong` 内 `currentSong.value.id !== song.id` 守卫恒为假，`playNavStack`（"上一首按实际播放顺序回溯"）从未生效（2026-09-24 单测发现，用例见 `stores/__tests__/player.spec.ts`）
2. **响应契约统一**：后端在响应层拍平 `cacheValue` 包裹格式，前端删除 64 处 `as any` 多格式兼容层
3. **后端 e2e 修复接入 CI**（2026-09-24 决策：本轮不做，列为下一步）
4. LyricsPanel 颜色提取算法（`src/renderer/src/components/lyrics/LyricsPanel.vue:178` 的 TODO）
5. macOS 签名决策复查（2026-09-24 决策：暂维持未签名）

## 已决策事项记录

- 2026-09-24：评论功能整体移除（产品取舍，勿作为遗漏"补回"）
- 2026-09-24：本地音乐库功能下线（后端 User/LoginLog/SearchKeyword 等表已删除）
- 2026-09-24：Web 发版维持手工部署；解锁/代理端点对公网保持开放
- 2026-09-24：`res.json` 凭据泄漏暂不处理、git 历史重写暂缓（细节记录在本地 `docs/风险登记.md`，不入库）
