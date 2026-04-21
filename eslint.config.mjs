import customTailwindRule from './eslint-rules/tailwind-v4-no-custom-class.mjs'

export default [
  {
    files: ['**/*.vue'],
    plugins: { 'tailwind-v4-custom': customTailwindRule },
    rules: {
      'tailwind-v4-custom/no-custom-class': 'error',
      'no-unused-vars': 'off',
      // Vue 3 推荐规则
      'vue/multi-word-component-names': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-v-html': 'error',
      // TypeScript 安全规则
    },
  },

  // 全局 TS 规则
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      // 安全相关
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
]
