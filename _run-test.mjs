import { writeFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'

// 写测试文件
writeFileSync('test-tailwind.vue', '<template><div class="bg-coral-500 rounded-airbnb">test</div></template>')

const result = execSync('npx eslint test-tailwind.vue --no-color 2>&1', {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe'],
})
console.log('OUTPUT:')
console.log(result)
console.log('LENGTH:', result.length)
if (result.length === 0) console.log('(empty output)')
