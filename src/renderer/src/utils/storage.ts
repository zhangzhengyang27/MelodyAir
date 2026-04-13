const PREFIX = 'melody-air:'

export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage write failed:', e)
  }
}

export function removeStorage(key: string): void {
  localStorage.removeItem(PREFIX + key)
}
