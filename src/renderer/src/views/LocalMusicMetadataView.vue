<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-title">本地音乐元数据管理</h1>
        <p class="text-sm text-neutral-400">管理本地歌曲信息、批量整理和导入导出</p>
      </div>
      <div class="flex gap-2">
        <button class="secondary-button" @click="exportMetadata">导出 JSON</button>
        <button class="secondary-button" @click="triggerImport">导入 JSON</button>
        <button class="danger-button" @click="clearAll">清空全部</button>
      </div>
    </div>

    <section class="settings-card">
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">新增 / 编辑</p>
          <p class="setting-description">支持单曲元数据录入或修正</p>
        </div>
        <button class="primary-button" @click="openEditor()">新增记录</button>
      </div>
      <div class="setting-row border-t border-white/5 pt-4">
        <div class="setting-info">
          <p class="setting-label">封面管理</p>
          <p class="setting-description">支持为条目绑定封面地址或替换封面</p>
        </div>
        <button class="secondary-button" @click="applyCoverToSelected">应用封面到所选</button>
      </div>
    </section>

    <section class="settings-card">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="card-title">元数据列表</h2>
        <span class="text-sm text-neutral-400">共 {{ metadata.count.value }} 条</span>
      </div>
      <div v-if="metadata.items.value.length === 0" class="py-10 text-center text-neutral-400">暂无本地元数据记录</div>
      <div v-else class="space-y-3">
        <div v-for="item in metadata.items.value" :key="item.id" class="rounded-xl border border-white/6 bg-white/5 p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 flex-1 items-start gap-4">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
                <img v-if="item.coverUrl" :src="item.coverUrl" class="h-full w-full object-cover" alt="cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-xs text-white/30">封面</div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium">{{ item.title }}</p>
                <p class="text-sm text-neutral-400">{{ item.artist }} · {{ item.album }}</p>
                <p class="text-xs text-neutral-500">{{ item.filePath || '未绑定文件路径' }}</p>
                <p class="text-xs text-neutral-500">{{ item.genre }} {{ item.year ? `· ${item.year}` : '' }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="secondary-button" @click="openEditor(item)">编辑</button>
              <button class="secondary-button" @click="selectForBatch(item.id)">{{ selectedIds.includes(item.id) ? '已选' : '批量' }}</button>
              <button class="secondary-button" @click="bindCover(item.id)">封面</button>
              <button class="danger-button" @click="removeItem(item.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="settings-card" v-if="selectedIds.length > 0">
      <div class="setting-row">
        <div class="setting-info">
          <p class="setting-label">批量更新</p>
          <p class="setting-description">已选 {{ selectedIds.length }} 项，可统一修改艺人/专辑/年份/备注</p>
        </div>
        <button class="primary-button" @click="openBatchEditor">执行批量更新</button>
      </div>
    </section>

    <input ref="fileInput" type="file" accept="application/json" class="hidden" @change="onImportFile" />

    <div v-if="editorVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-2xl rounded-2xl bg-[#11111a] p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ editingId ? '编辑元数据' : '新增元数据' }}</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <input v-model="form.id" class="input-field" placeholder="ID" />
          <input v-model="form.title" class="input-field" placeholder="歌名" />
          <input v-model="form.artist" class="input-field" placeholder="歌手" />
          <input v-model="form.album" class="input-field" placeholder="专辑" />
          <input v-model="form.genre" class="input-field" placeholder="风格" />
          <input v-model="form.year" class="input-field" placeholder="年份" />
          <input v-model="form.filePath" class="input-field md:col-span-2" placeholder="文件路径" />
          <textarea v-model="form.notes" class="input-field md:col-span-2 min-h-24" placeholder="备注" />
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="secondary-button" @click="editorVisible = false">取消</button>
          <button class="primary-button" @click="saveEditor">保存</button>
        </div>
      </div>
    </div>

    <div v-if="batchVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-xl rounded-2xl bg-[#11111a] p-6">
        <h2 class="mb-4 text-lg font-semibold">批量更新</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <input v-model="batchForm.artist" class="input-field" placeholder="统一歌手（可空）" />
          <input v-model="batchForm.album" class="input-field" placeholder="统一专辑（可空）" />
          <input v-model="batchForm.year" class="input-field" placeholder="统一年份（可空）" />
          <input v-model="batchForm.genre" class="input-field" placeholder="统一风格（可空）" />
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button class="secondary-button" @click="batchVisible = false">取消</button>
          <button class="primary-button" @click="applyBatch">应用到所选</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useLocalMusicMetadata, type LocalMusicMetadata } from '@/composables/useLocalMusicMetadata'

const metadata = useLocalMusicMetadata()
const fileInput = ref<HTMLInputElement | null>(null)
const editorVisible = ref(false)
const batchVisible = ref(false)
const editingId = ref<string | null>(null)
const selectedIds = ref<string[]>([])
const coverInput = ref('')

const form = reactive({ id: '', title: '', artist: '', album: '', genre: '', year: '', filePath: '', notes: '' })
const batchForm = reactive({ artist: '', album: '', genre: '', year: '' })

function resetForm() {
  Object.assign(form, { id: '', title: '', artist: '', album: '', genre: '', year: '', filePath: '', notes: '' })
}

function openEditor(item?: LocalMusicMetadata) {
  editingId.value = item?.id || null
  if (item) Object.assign(form, item)
  else resetForm()
  editorVisible.value = true
}

function saveEditor() {
  if (!form.id || !form.title) return
  metadata.upsert({ ...form, id: form.id })
  editorVisible.value = false
}

function removeItem(id: string) {
  metadata.remove(id)
  selectedIds.value = selectedIds.value.filter(item => item !== id)
}

function selectForBatch(id: string) {
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter(item => item !== id)
  else selectedIds.value.push(id)
}

function openBatchEditor() {
  batchVisible.value = true
}

function applyBatch() {
  metadata.batchUpdate(selectedIds.value, {
    artist: batchForm.artist || undefined,
    album: batchForm.album || undefined,
    genre: batchForm.genre || undefined,
    year: batchForm.year || undefined,
  })
  batchVisible.value = false
}

function bindCover(id: string) {
  const url = prompt('输入封面地址（URL）')
  if (!url) return
  metadata.updateCover(id, url)
}

function applyCoverToSelected() {
  if (!coverInput.value) {
    const url = prompt('输入统一封面地址（URL）')
    if (!url) return
    coverInput.value = url
  }
  selectedIds.value.forEach(id => metadata.updateCover(id, coverInput.value))
}

function exportMetadata() {
  const blob = new Blob([metadata.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'local-music-metadata.json'
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value?.click()
}

function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      metadata.importFromJson(String(reader.result || '[]'))
    } catch (error) {
      console.error(error)
    }
  }
  reader.readAsText(file)
}

function clearAll() {
  metadata.clear()
  selectedIds.value = []
}
</script>
