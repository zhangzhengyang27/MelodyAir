import vue from 'eslint-plugin-vue'
import tsParser from '@typescript-eslint/parser'
import customTailwindRule from './eslint-rules/tailwind-v4-no-custom-class.mjs'

export default [
  // Vue base 配置（仅配置 vue-eslint-parser，不加载推荐规则避免 OOM）
  ...vue.configs['flat/base'],

  // 为 Vue SFC 的 script 块指定 TypeScript parser
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },

  {
    files: ['**/*.vue'],
    plugins: { 'tailwind-v4-custom': customTailwindRule },
    rules: {
      'tailwind-v4-custom/no-custom-class': 'error',
      'no-unused-vars': 'off',
    },
  },

  // TS 文件规则
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  // Vue 文件规则（parser 已由前面的 vue base + parserOptions 配置好）
  {
    files: ['**/*.vue'],
    rules: {
      'no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
]
