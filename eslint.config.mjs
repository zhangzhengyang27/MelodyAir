// 最小配置测试
import customTailwindRule from './eslint-rules/tailwind-v4-no-custom-class.mjs'

export default [
  {
    files: ['**/*.vue'],
    plugins: { 'tailwind-v4-custom': customTailwindRule },
    rules: {
      'tailwind-v4-custom/no-custom-class': 'error',
      'no-unused-vars': 'off',  // 确保有至少一个规则生效
    },
  },
]
