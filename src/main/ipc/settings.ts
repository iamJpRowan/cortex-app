import { ipcMain, BrowserWindow, shell } from 'electron'
import { getSettingsService } from '../services/settings'

let mainWindow: BrowserWindow | null = null

/**
 * Set main window reference for sending events
 */
export function setMainWindow(window: BrowserWindow | null) {
  mainWindow = window
}

/**
 * Register IPC handlers for settings functionality
 */
export function registerSettingsHandlers() {
  const settingsService = getSettingsService()

  // Set up change listener to forward events to renderer
  settingsService.on(
    'change',
    (data: { key: string; value: unknown; previous: unknown }) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings:changed', data)
      }
    }
  )

  /**
   * Get all settings or a specific setting by key
   */
  ipcMain.handle('settings:get', (_event, key?: string) => {
    try {
      if (key) {
        // Validate key exists in defaults
        const allSettings = settingsService.getAll()
        if (!(key in allSettings)) {
          return {
            success: false,
            error: `Setting "${key}" not found`,
          }
        }

        return {
          success: true,
          data: settingsService.get(key as keyof typeof allSettings),
        }
      } else {
        // Return all settings
        return {
          success: true,
          data: settingsService.getAll(),
        }
      }
    } catch (error) {
      console.error('[Settings IPC] Get failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Set a setting value by dot notation key
   */
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    try {
      // Validate key exists in defaults
      const allSettings = settingsService.getAll()
      if (!(key in allSettings)) {
        return {
          success: false,
          error: `Setting "${key}" not found`,
        }
      }

      // Validate value type matches default
      const defaultValue = settingsService.get(key as keyof typeof allSettings)
      if (typeof value !== typeof defaultValue) {
        return {
          success: false,
          error: `Invalid value type for "${key}". Expected ${typeof defaultValue}, got ${typeof value}`,
        }
      }

      // Set the value
      settingsService.set(key as keyof typeof allSettings, value as typeof defaultValue)

      return {
        success: true,
        data: value,
      }
    } catch (error) {
      console.error('[Settings IPC] Set failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Get path to settings.json file
   */
  ipcMain.handle('settings:get-file-path', () => {
    try {
      return {
        success: true,
        data: settingsService.getFilePath(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Open settings.json file in user's default editor
   */
  ipcMain.handle('settings:open-in-editor', async () => {
    try {
      const filePath = settingsService.getFilePath()
      await shell.openPath(filePath)
      return {
        success: true,
      }
    } catch (error) {
      console.error('[Settings IPC] Open in editor failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  /**
   * Subscribe to settings changes
   * Note: This uses the event system, but the actual subscription
   * is handled via the 'settings:changed' event sent to renderer
   */
  ipcMain.handle('settings:on-change', () => {
    // This handler exists for API completeness
    // Actual change notifications are sent via 'settings:changed' events
    return {
      success: true,
      data: 'Subscribed to settings changes',
    }
  })
}
