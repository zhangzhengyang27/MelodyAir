import { computed, ref } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

export type EqualizerPreset = 'flat' | 'pop' | 'rock' | 'classical' | 'vocal' | 'bass'

export interface EqualizerBand {
  id: string
  label: string
  value: number
}

const STORAGE_KEY = 'equalizer-settings'

export function useEqualizer() {
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

  function persist() {
    setStorage(`${STORAGE_KEY}:enabled`, enabled.value)
    setStorage(`${STORAGE_KEY}:preset`, preset.value)
    setStorage(`${STORAGE_KEY}:bands`, bands.value)
  }

  function applyPreset(nextPreset: EqualizerPreset) {
    preset.value = nextPreset
    const values = presets[nextPreset]
    bands.value = bands.value.map((band, index) => ({ ...band, value: values[index] ?? 0 }))
    persist()
  }

  function setBand(index: number, value: number) {
    if (!bands.value[index]) return
    bands.value[index].value = Math.max(-12, Math.min(12, value))
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
