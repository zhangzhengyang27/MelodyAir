# Tailwind CSS v4 使用规范

## 重要：本项目使用 Tailwind CSS v4（不是 v3！）

### v3 vs v4 关键差异

| 特性 | Tailwind v3 | Tailwind v4 |
|------|------------|------------|
| 配置文件 | `tailwind.config.js` | `@theme` 在 CSS 中定义 |
| 自定义颜色 | `extend.colors` 自动生成 utility class | `@theme` 中的 `--color-*` **同样自动生成 utility class** ✅ |

> **实测验证**：`src/renderer/src/assets/styles/tailwind.css` 的 `@theme` 定义了
> `--color-coral-50` ~ `--color-coral-900`，编译产物中包含 `.bg-coral-500`、
> `.hover:bg-coral-600`、`.dark:text-coral-400`、`bg-coral-500/15`（透明度修饰符）等规则。
> **`coral-*`、`neutral-*` 均为有效工具类，可直接使用，优先使用。**

---

### ✅ 正确做法

#### 1. 自定义颜色 — 优先使用 @theme 色板类名

项目色板（`coral-*`、`neutral-*`）已在 `@theme` 定义，优先用色板类名保持主题一致性；
任意值写法用于 `@theme` 之外的临时颜色：

```html
<!-- 正确：色板类名（v4 自动生成，支持变体与透明度） -->
<button class="bg-coral-500 text-white hover:bg-coral-600">
<div class="bg-coral-500/15 dark:text-coral-400">

<!-- 任意值：用于 @theme 之外的一次性颜色 -->
<div class="bg-[rgba(255,90,95,0.15)]">
```

#### 2. 自定义圆角 — 使用标准类
```html
<!-- 正确 -->
<div class="rounded-xl">...</div>   <!-- 12px -->
<div class="rounded-2xl">...</div>  <!-- 16px -->
<div class="rounded-lg">...</div>   <!-- 8px -->

<!-- 错误：旧 token，@theme 未定义 --radius-*，不会生成工具类 -->
<div class="rounded-airbnb">...</div>
<div class="rounded-card">...</div>
<div class="rounded-cover">...</div>
```

#### 3. 自定义阴影 — 使用任意值
```html
<!-- 正确 -->
<div class="shadow-[0_2px_16px_rgba(0,0,0,0.08)]">...</div>

<!-- 错误：旧 token，@theme 未定义 --shadow-*，不会生成工具类 -->
<div class="shadow-card">...</div>
```

#### 4. Vue `<style scoped>` 中避免 @apply
```vue
<style scoped>
/* 正确：原生 CSS */
.player-btn {
  display: flex;
  align-items: center;
  cursor: pointer;
}

/* 错误：@apply 引用自定义/未知类 */
.player-btn {
  @apply flex items-center cursor-pointer rounded-airbnb;
}
</style>
```
**注意**：Tailwind v4 的 `@apply` 在 Vue scoped style 中对某些标准类也会报 `Invalid declaration` 错误。推荐在组件样式中直接写原生 CSS。

---

### 🚫 禁止使用的自定义类名

以下类名是旧版设计 token，`@theme` 中没有对应变量（`--radius-*` / `--shadow-*`），
Tailwind v4 **不会**为其生成工具类，属于死类名：

| 类名 | 替换为 |
|------|--------|
| `rounded-airbnb` | `rounded-xl` (12px) |
| `rounded-card` | `rounded-2xl` (16px) |
| `rounded-cover` | `rounded-lg` (8px) |
| `shadow-card` | `shadow-[0_2px_16px_rgba(0,0,0,0.08)]` |
| `shadow-card-hover` | `shadow-[0_6px_20px_rgba(0,0,0,0.12)]` |

---

### 项目 Design Token 颜色参考

以下色板已在 `@theme` 定义为工具类（完整列表见 `src/renderer/src/assets/styles/tailwind.css`）：

| 类名 | 色值 | 说明 |
|------|------|------|
| `coral-50` | `#FFF5F3` | 浅红背景（选中态） |
| `coral-100` | `#FFE8E3` | 浅红 ring（亮色模式） |
| `coral-300` | `#FFB0A0` | 浅红边框（focus） |
| `coral-400` | `#FF7F66` | 橘红（暗色模式文字） |
| `coral-500` | `#FF5A5F` | 主品牌色（按钮、高亮） |
| `coral-600` | `#E0484D` | 深红（按钮 hover） |
| `coral-800` | `#9E2F33` | 暗红 ring（暗色模式） |
