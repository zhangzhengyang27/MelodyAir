#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path, { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 写测试文件
const testContent = '<template><div class="bg-coral-500 rounded-airbnb shadow-card-hover text-coral-500">test</div></template>'
const testFile = join(__dirname, 'test-tailwind.vue')
writeFileSync(testFile, testContent)

console.log('=== Test File Written ===')
console.log(testFile)
console.log()

// 加载配置和插件
import customPlugin from './eslint-rules/tailwind-v4-no-custom-class.mjs'
import pluginVue from 'eslint-plugin-vue'

console.log('=== Plugin Loaded ===')
console.log('Custom rules:', Object.keys(customPlugin.rules))
console.log()

// 运行 ESLint
import { ESLint } from 'eslint'

const eslint = new ESLint({
  cwd: __dirname,
  overrideConfig: [
    {
      plugins: { 'tailwind-v4-custom': customPlugin },
      rules: { 'tailwind-v4-custom/no-custom-class': 'error' },
    },
    ...pluginVue.configs['flat/recommended'],
  ],
})

try {
  const results = await eslint.lintFiles([testFile])
  
  console.log('=== LINT RESULTS ===')
  for (const r of results) {
    if (r.errorCount === 0 && r.warningCount === 0) {
      console.log(`No errors/warnings in ${path.basename(r.filePath)}`)
    }
    for (const msg of r.messages) {
      const sev = msg.severity === 2 ? 'ERROR' : 'WARN'
      console.log(`  [${sev}] L${msg.line}:C${msg.column} ${msg.message}`)
    }
  }
} catch (err) {
  console.error('=== ERROR ===')
  console.error(err.message)
  if (err.messageStack) console.error(err.messageStack.slice(0, 500))
}
