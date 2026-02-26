/**
 * IPC handlers for permission mode management (Tool Permission System Phase 4).
 */

import fs from 'fs'
import { ipcMain, shell } from 'electron'
import {
  getMode,
  getModeFilePath,
  listModes,
  listAllModes,
  saveMode,
  duplicateMode,
  resetMode,
  deleteMode,
  setModeDisabled,
  isBuiltinModeId,
  getBuiltinMode,
} from '@main/services/modes'
import { modeToFileContent } from '@main/services/modes/types'
import type { ModeFileContent } from '@main/services/modes'

export function registerModeHandlers() {
  ipcMain.handle('modes:list', async () => {
    try {
      const modes = listModes()
      return { success: true, modes }
    } catch (error) {
      console.error('[Modes IPC] List failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        modes: [],
      }
    }
  })

  ipcMain.handle('modes:listAll', async () => {
    try {
      const modes = listAllModes()
      return { success: true, modes }
    } catch (error) {
      console.error('[Modes IPC] ListAll failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        modes: [],
      }
    }
  })

  ipcMain.handle('modes:get', async (_event, id: string) => {
    try {
      const mode = getMode(id)
      if (!mode) {
        return { success: false, error: `Mode "${id}" not found` }
      }
      return { success: true, mode }
    } catch (error) {
      console.error('[Modes IPC] Get failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:save', async (_event, id: string, content: ModeFileContent) => {
    try {
      saveMode(id, content)
      const mode = getMode(id)
      return { success: true, mode: mode ?? undefined }
    } catch (error) {
      console.error('[Modes IPC] Save failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:duplicate', async (_event, sourceId: string, newId: string) => {
    try {
      const mode = duplicateMode(sourceId, newId)
      return { success: true, mode }
    } catch (error) {
      console.error('[Modes IPC] Duplicate failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:reset', async (_event, id: string) => {
    try {
      if (!isBuiltinModeId(id)) {
        return { success: false, error: 'Can only reset built-in modes' }
      }
      resetMode(id)
      const mode = getMode(id)
      return { success: true, mode: mode ?? undefined }
    } catch (error) {
      console.error('[Modes IPC] Reset failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:delete', async (_event, id: string) => {
    try {
      if (isBuiltinModeId(id)) {
        return { success: false, error: 'Cannot delete built-in modes' }
      }
      deleteMode(id)
      return { success: true }
    } catch (error) {
      console.error('[Modes IPC] Delete failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:getBuiltinDefault', async (_event, id: string) => {
    try {
      if (!isBuiltinModeId(id)) {
        return { success: false, error: 'Not a built-in mode' }
      }
      const mode = getBuiltinMode(
        id as 'full' | 'local-only' | 'read-only' | 'local-read-only'
      )
      return { success: true, mode }
    } catch (error) {
      console.error('[Modes IPC] getBuiltinDefault failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:setDisabled', async (_event, id: string, disabled: boolean) => {
    try {
      setModeDisabled(id, disabled)
      return { success: true }
    } catch (error) {
      console.error('[Modes IPC] setDisabled failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:getFilePath', async (_event, id: string) => {
    try {
      const filePath = getModeFilePath(id)
      return { success: true, data: filePath }
    } catch (error) {
      console.error('[Modes IPC] getFilePath failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('modes:openInEditor', async (_event, id: string) => {
    try {
      const filePath = getModeFilePath(id)
      if (!fs.existsSync(filePath)) {
        const mode = getMode(id)
        if (mode) {
          saveMode(id, modeToFileContent(mode))
        }
      }
      const err = await shell.openPath(filePath)
      if (err) {
        return { success: false, error: err }
      }
      return { success: true }
    } catch (error) {
      console.error('[Modes IPC] openInEditor failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  console.log('[IPC] Mode handlers registered')
}
