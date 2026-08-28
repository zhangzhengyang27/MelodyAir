/**
 * ESLint 自定义插件 + 规则：检测 Tailwind v4 中无效的自定义类名
 *
 * 重要：tailwind.css 的 @theme 中定义的 --color-*（coral-*、neutral-*）
 * 在 Tailwind v4 会正常生成工具类（含 hover:/dark:/focus: 变体与 /N 透明度），
 * 已实测编译产物存在 .bg-coral-500 等规则 —— 这些类名有效，不是违规。
 *
 * 本规则只拦截 @theme 中没有对应 --radius-* 与 --shadow-* 变量的旧设计 token
 * （工具类不会生成，属于死类名）。
 */

const FORBIDDEN_PATTERNS = [
  // === 旧版圆角 token（@theme 未定义 --radius-*，不生成工具类）===
  /\brounded-airbnb\b/,
  /\brounded-card\b/,
  /\brounded-cover\b/,

  // === 旧版阴影 token（@theme 未定义 --shadow-*，不生成工具类）===
  /\bshadow-card\b/,
  /\bshadow-card-hover\b/,
]

const REPLACEMENTS = {
  'rounded-airbnb': 'rounded-xl (12px)',
  'rounded-card': 'rounded-2xl (16px)',
  'rounded-cover': 'rounded-lg (8px)',
  'shadow-card': 'shadow-[0_2px_16px_rgba(0,0,0,0.08)]',
  'shadow-card-hover': 'shadow-[0_6px_20px_rgba(0,0,0,0.12)]',
}

/** @type {import('eslint').Rule.RuleModule} */
const noCustomClassRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止使用 Tailwind v4 中未定义的旧设计 token 类名（@theme 无对应变量，不生成工具类）',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      invalidClass: '"{{className}}" 在 Tailwind v4 中无效。请使用: {{suggestion}}',
      invalidClassGeneric: '"{{className}}" 是无效的 Tailwind v4 类名。请参考 .ai/STYLE_GUIDE.md 使用任意值语法或标准类。',
    },
    schema: [],
  },

  create(context) {
    const source = context.sourceCode.text

    return {
      Program() {
        for (const pattern of FORBIDDEN_PATTERNS) {
          let match
          // 必须带 g 标志：否则 exec 永远返回首个匹配且不推进 lastIndex，
          // while 循环会对同一位置无限上报（内存耗尽 / eslint 挂死）
          const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
          while ((match = regex.exec(source)) !== null) {
            const className = match[0]
            const loc = context.sourceCode.getLocFromIndex(match.index)
            
            context.report({
              loc: {
                start: loc,
                end: context.sourceCode.getLocFromIndex(match.index + className.length),
              },
              messageId: REPLACEMENTS[className] ? 'invalidClass' : 'invalidClassGeneric',
              data: {
                className,
                suggestion: REPLACEMENTS[className] || '.ai/STYLE_GUIDE.md',
              },
            })
          }
        }
      },
    }
  },
}

// 导出为 ESLint 插件格式 { rules: { ruleName: rule } }
export default {
  rules: {
    'no-custom-class': noCustomClassRule,
  },
}
