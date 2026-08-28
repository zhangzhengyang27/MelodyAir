# Tailwind CSS v4 使用规范

## 重要：本项目使用 Tailwind CSS v4（不是 v3！）

### v3 vs v4 关键差异

| 特性 | Tailwind v3 | Tailwind v4 |
|------|------------|------------|
| 配置文件 | `tailwind.config.js` | `@theme` 在 CSS 中定义 |
| 扩展类 | `extend.theme` 自动生成 utility class | **`@theme` 不生成 utility class** |
| 自定义颜色 | `colors.coral: '#FF5A5F'` → `bg-coral-500` ✅ | `@theme color-coral-*` → **`bg-coral-500` 无效** ❌ |

---

### ✅ 正确做法

#### 1. 自定义颜色 — 使用任意值语法
```html
<!-- 正确 -->
<button class="bg-[#FF5A5F] text-white hover:bg-[#E0484D]">
  按钮
</button>

<!-- 错误 -->
<button class="bg-coral-500 text-white hover:bg-coral-600">
  按钮
</button>
```

#### 2. 自定义圆角 — 使用标准类
```html
<!-- 正确 -->
<div class="rounded-xl">...</div>   <!-- 12px -->
<div class="rounded-2xl">...</div>  <!-- 16px -->
<div class="rounded-lg">...</div>   <!-- 8px -->

<!-- 错误 -->
<div class="rounded-airbnb">...</div>
<div class="rounded-card">...</div>
<div class="rounded-cover">...</div>
```

#### 3. 自定义阴影 — 使用任意值
```html
<!-- 正确 -->
<div class="shadow-[0_2px_16px_rgba(0,0,0,0.08)]">...</div>

<!-- 错误 -->
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

以下类名是旧版设计 token 定义，**禁止在任何 .vue/.ts 文件中使用**：

| 类名 | 替换为 |
|------|--------|
| `bg-coral-50` ~ `bg-coral-900` | `bg-[#hex值]` |
| `text-coral-500` 等 | `text-[#FF5A5F]` |
| `border-coral-*` | `border-[#hex值]` |
| `ring-coral-*` | `ring-[#hex值]` |
| `focus:border-coral-*` | `focus:border-[#hex值]` |
| `hover:text-coral-*` | `hover:text-[#FF5A5F]` |
| `hover:bg-coral-*` | `hover:bg-[#hex值]` |
| `peer-checked:bg-coral-*` | `peer-checked:bg-[#FF5A5F]` |
| `rounded-airbnb` | `rounded-xl` (12px) |
| `rounded-card` | `rounded-2xl` (16px) |
| `rounded-cover` | `rounded-lg` (8px) |
| `shadow-card` | `shadow-[0_2px_16px_rgba(0,0,0,0.08)]` |
| `shadow-card-hover` | `shadow-[0_6px_20px_rgba(0,0,0,0.12)]` |
| `bg-coral-50` | `bg-[#FFF5F3]` |
| `dark:bg-coral-900/20` | `dark:bg-[rgba(196,58,63,0.2)]` |
| `ring-coral-200` | `ring-[#FFE8E3]` |
| `dark:ring-coral-800` | `dark:ring-[#9E2F33]` |

---

### 项目 Design Token 颜色参考

| 用途 | 色值 | 说明 |
|------|------|------|
| 主品牌色 | `#FF5A5F` | Coral 红（按钮、高亮） |
| 悬停态 | `#E0484D` | 深红（按钮 hover） |
| 浅背景 | `#FFF5F3` | 浅红背景（选中态） |
| 边框 | `#FFB0A0` | 浅红边框（focus） |
| 暗色文字 | `#9E2F33` | 暗红 ring（暗色模式） |
| 浅色 ring | `#FFE8E3` | 浅红 ring（亮色模式） |
| 悬停文字 | `#FF7F66` | 橘红（暗色模式文字） |
