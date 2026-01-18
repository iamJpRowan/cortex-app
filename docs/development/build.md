[Docs](../README.md) / [Development](./README.md) / Build and Distribution

# Build and Distribution

## Building Production Package

```bash
npm run package
```

Creates distributable in `dist/` directory:
- Mac: `Cortex.app`
- Windows: `Cortex-Setup.exe`
- Linux: `Cortex.AppImage`

## Update Strategy

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater'

export function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify()
  
  autoUpdater.on('update-available', () => {
    // Notify user in UI
  })
  
  autoUpdater.on('update-downloaded', () => {
    // Prompt user to restart
  })
}
```
