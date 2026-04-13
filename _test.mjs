// 简单测试
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

writeFileSync(join(__dirname, 'test-tailwind.vue'), '<template><div class="bg-coral-500 rounded-airbnb">test</div></template>')
console.log('File written')
