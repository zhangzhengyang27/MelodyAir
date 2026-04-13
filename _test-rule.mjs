import { ESLint } from 'eslint'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { writeFileSync } from 'fs'
import pluginVue from 'eslint-plugin-vue'

const __dirname = dirname(fileURLToPath(import.meta.url))

const customPlugin = (await import('./eslint-rules/tailwind-v4-no-custom-class.mjs')).default

// 写测试文件
writeFileSync(join(__dirname, 'test-tailwind.vue'), `<template>
  <div class="bg-coral-500 rounded-airbnb shadow-card-hover text-coral-500 hover:bg-coral-600">
    test
  </div>
</template>`)

const eslint = new ESLint({ 
  cwd: __dirname,
  overrideConfig: [
    // 自定义 Tailwind v4 检测规则
    {
      plugins: { 'tailwind-v4-custom': customPlugin },
      rules: { 'tailwind-v4-custom/no-custom-class': 'error' },
    },
    ...pluginVue.configs['flat/recommended'],
  ]
})

const results = await eslint.lintFiles([join(__dirname, 'test-tailwind.vue')])
console.log('=== RESULT ===')
for (const r of results) {
  console.log('File:', r.filePath.split('/').pop())
  console.log('Errors:', r.messages.length)
  for (const m of r.messages) console.log(`  L${m.line}:${m.column} [${m.ruleId || m.message.slice(0,30)}] ${m.message}`)
}
if (results[0].messages.length === 0) console.log('  (no errors)')
