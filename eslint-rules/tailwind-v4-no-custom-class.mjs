/**
 * ESLint 自定义插件 + 规则：检测 Tailwind v4 中非法的自定义类名
 * 
 * 原理：通过正则表达式直接扫描源码中的非法类名
 */

const FORBIDDEN_PATTERNS = [
  // === 自定义颜色类名（Tailwind v4 @theme 不生成 utility class）===
  /bg-coral-\d+/,
  /text-coral-\d+/,
  /border-coral-\d+/,
  /ring-coral-\d+/,
  /focus:border-coral-/,
  /focus:ring-coral-/,
  /hover:bg-coral-/,
  /hover:text-coral-/,
  /hover:border-coral-/,
  /dark:bg-coral-/,
  /dark:text-coral-/,
  /peer-checked:bg-coral-/,

  // === 自定义圆角类名（已废弃）===
  /\brounded-airbnb\b/,
  /\brounded-card\b/,
  /\brounded-cover\b/,

  // === 自定义阴影类名（已废弃）===
  /\bshadow-card-hover\b/,
]

const REPLACEMENTS = {
  'bg-coral-50': 'bg-[#FFF5F3]',
  'bg-coral-100': 'bg-[#FFE8E3]',
  'bg-coral-500': 'bg-[#FF5A5F]',
  'bg-coral-600': 'bg-[#E0484D]',
  'text-coral-500': 'text-[#FF5A5F]',
  'border-coral-400': 'border-[#FFB0A0]',
  'ring-coral-200': 'ring-[#FFE8E3]',
  'ring-coral-800': 'ring-[#9E2F33]',
  'hover:bg-coral-600': 'hover:bg-[#E0484D]',
  'hover:text-coral-500': 'hover:text-[#FF5A5F]',
  'focus:border-coral-400': 'focus:border-[#FFB0A0]',
  'dark:focus:border-coral-500': 'dark:focus:border-[#FF7F66]',
  'peer-checked:bg-coral-500': 'peer-checked:bg-[#FF5A5F]',
  'rounded-airbnb': 'rounded-xl (12px)',
  'rounded-card': 'rounded-2xl (16px)',
  'rounded-cover': 'rounded-lg (8px)',
  'shadow-card-hover': 'shadow-[0_6px_20px_rgba(0,0,0,0.12)]',
}

/** @type {import('eslint').Rule.RuleModule} */
const noCustomClassRule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止使用 Tailwind v4 中无效的自定义类名（@theme 不生成 utility class）',
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
          const regex = new RegExp(pattern.source, pattern.flags)
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
