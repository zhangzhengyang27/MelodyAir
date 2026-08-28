#!/bin/bash
# 开发环境：替换 Electron 内置图标为自定义图标
# 原因：app.dock.setIcon(PNG) 在 macOS 不会自动加圆角，必须替换 .icns

ELECTRON_ICNS="node_modules/electron/dist/Electron.app/Contents/Resources/electron.icns"
CUSTOM_ICNS="build/icon.icns"

if [ -f "$CUSTOM_ICNS" ] && [ -f "$ELECTRON_ICNS" ]; then
  if ! cmp -s "$CUSTOM_ICNS" "$ELECTRON_ICNS"; then
    cp "$CUSTOM_ICNS" "$ELECTRON_ICNS"
    echo "[dev-icon] 已替换 Electron Dock 图标"
  fi
fi
