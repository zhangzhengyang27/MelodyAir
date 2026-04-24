import { computed, ref, watch } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'
import { usePlayerStore } from '@/stores/player'

export type EqualizerPreset = 'flat' | 'pop' | 'rock' | 'classical' | 'vocal' | 'bass'

export interface EqualizerBand {
  id: string
  label: string
  value: number
}

const STORAGE_KEY = 'equalizer-settings'

export function useEqualizer() {
  const playerStore = usePlayerStore()

  const enabled = ref(getStorage(`${STORAGE_KEY}:enabled`, false))
  const preset = ref<EqualizerPreset>(getStorage(`${STORAGE_KEY}:preset`, 'flat'))
  const bands = ref<EqualizerBand[]>(getStorage(`${STORAGE_KEY}:bands`, [
    { id: '60', label: '60Hz', value: 0 },
    { id: '230', label: '230Hz', value: 0 },
    { id: '910', label: '910Hz', value: 0 },
    { id: '3600', label: '3.6kHz', value: 0 },
    { id: '14000', label: '14kHz', value: 0 },
  ]))

  const presets: Record<EqualizerPreset, number[]> = {
    flat: [0, 0, 0, 0, 0],
    pop: [2, 1, 0, 1, 2],
    rock: [3, 2, 0, 2, 3],
    classical: [1, 0, 1, 2, 3],
    vocal: [-1, 0, 2, 2, 1],
    bass: [4, 3, 0, -1, -2],
  }

  // 监听 enabled 变化，同步到音频引擎
  watch(enabled, (newEnabled) => {
    playerStore.setEqualizerEnabled(newEnabled)
    if (newEnabled) {
      const gains = bands.value.map(band => band.value)
      playerStore.setEqualizerBands(gains)
    }
    persist()
  })

  // 监听 bands 变化，同步到音频引擎（仅在 enabled 时）
  watch(bands, (newBands) => {
    if (enabled.value) {
      const gains = newBands.map(band => band.value)
      playerStore.setEqualizerBands(gains)
    }
    persist()
  }, { deep: true })

  function persist() {
    setStorage(`${STORAGE_KEY}:enabled`, enabled.value)
    setStorage(`${STORAGE_KEY}:preset`, preset.value)
    setStorage(`${STORAGE_KEY}:bands`, bands.value)
  }

  function applyPreset(nextPreset: EqualizerPreset) {
    preset.value = nextPreset
    const values = presets[nextPreset]
    bands.value = bands.value.map((band, index) => ({ ...band, value: values[index] ?? 0 }))

    // 立即应用到音频引擎（仅在 enabled 时）
    if (enabled.value) {
      playerStore.setEqualizerBands(values)
    }

    persist()
  }

  function setBand(index: number, value: number) {
    if (!bands.value[index]) return
    const safeValue = Math.max(-12, Math.min(12, value))
    bands.value[index].value = safeValue

    // 立即应用到音频引擎（仅在 enabled 时）
    if (enabled.value) {
      playerStore.setEqualizerBand(index, safeValue)
    }

    persist()
  }

  const activePresetName = computed(() => preset.value)

  return {
    enabled,
    preset,
    bands,
    presets,
    activePresetName,
    applyPreset,
    setBand,
    persist,
  }
}
