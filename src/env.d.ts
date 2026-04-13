/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    windowMinimize: () => void
    windowMaximize: () => void
    windowClose: () => void
    windowIsMaximized: () => Promise<boolean>
    onPlayerAction: (callback: (action: string) => void) => void
    setAutoLaunch: (enable: boolean) => Promise<boolean>
    setMinimizeToTray: (enable: boolean) => Promise<boolean>
  }
}

export {}
