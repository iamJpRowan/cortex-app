import { ipcMain, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow | null) {
  mainWindow = window
}

export function registerWindowHandlers() {
  ipcMain.handle('window:close', () => {
    if (mainWindow) {
      mainWindow.close()
    }
  })

  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize()
    }
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
  })

  ipcMain.handle('window:setButtonVisibility', (_event, visible: boolean) => {
    if (mainWindow && process.platform === 'darwin') {
      mainWindow.setWindowButtonVisibility(visible)
    }
  })

  // Set up window state listeners when window is created
  // This will be called from main/index.ts after window creation
}

export function setupWindowListeners() {
  if (mainWindow) {
    mainWindow.on('maximize', () => {
      mainWindow?.webContents.send('window:maximized')
    })

    mainWindow.on('unmaximize', () => {
      mainWindow?.webContents.send('window:unmaximized')
    })
  }
}
