/**
 * Mode registry: built-in defaults + user mode files.
 * User files override built-in definitions for the same id; reset deletes the user file.
 * @see docs/backlog/tool-permission-system.md
 */

import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { getSettingsService } from '@main/services/settings'
import { getBuiltinMode, isBuiltinModeId } from './builtins'
import type { BuiltinModeId } from './types'
import { getBuiltinModeIds } from './builtins'
import {
  fileContentToMode,
  modeToFileContent,
  type Mode,
  type ModeFileContent,
} from './types'

const MODES_DIR = 'modes'

function getModesDir(): string {
  return path.join(app.getPath('userData'), MODES_DIR)
}

function userFilePath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9-_]/g, '_')
  return path.join(getModesDir(), `${safe}.json`)
}

/** Path to the mode config file (user override for built-ins, or user mode file). */
export function getModeFilePath(id: string): string {
  return userFilePath(id)
}

function readUserFile(id: string): ModeFileContent | null {
  const filePath = userFilePath(id)
  if (!fs.existsSync(filePath)) return null
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(content) as ModeFileContent
    return parsed
  } catch {
    return null
  }
}

/**
 * Get a mode by id. For built-in ids, returns user override if present, else built-in default.
 * For user modes, returns the mode if the file exists.
 * Built-ins and user modes use the same file-shaped structure (id, name, description, categories.*).
 */
export function getMode(id: string): Mode | null {
  if (isBuiltinModeId(id)) {
    const userContent = readUserFile(id)
    if (userContent) {
      return fileContentToMode(id, userContent, true)
    }
    return getBuiltinMode(id as BuiltinModeId)
  }
  const userContent = readUserFile(id)
  if (!userContent) return null
  const fileId = (userContent.id && String(userContent.id).trim()) || id
  return fileContentToMode(fileId, userContent, false)
}

/**
 * Get disabled mode ids from settings (used by listModes and setModeDisabled).
 */
function getDisabledModeIds(): Set<string> {
  const raw = getSettingsService().get('agents.disabledModeIds')
  const arr = Array.isArray(raw)
    ? (raw as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  return new Set(arr)
}

/**
 * List all modes (built-in + user), including disabled. Order: built-ins first, then user modes.
 * Use for Settings UI so disabled modes are visible and can be re-enabled.
 */
export function listAllModes(): Mode[] {
  const result: Mode[] = []

  for (const bid of getBuiltinModeIds()) {
    const mode = getMode(bid)
    if (mode) result.push(mode)
  }

  const dir = getModesDir()
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      const id = f.slice(0, -5)
      if (isBuiltinModeId(id)) continue
      const mode = getMode(id)
      if (mode) result.push(mode)
    }
  }

  return result
}

/**
 * List modes excluding disabled (for mode selector in chat). Order: built-ins first, then user modes.
 */
export function listModes(): Mode[] {
  const disabledIds = getDisabledModeIds()
  return listAllModes().filter(m => !disabledIds.has(m.id))
}

/**
 * Save a mode to userData/modes/{id}.json. Overwrites for built-in id (user override).
 */
export function saveMode(id: string, content: ModeFileContent): void {
  const safe = id.replace(/[^a-zA-Z0-9-_]/g, '_')
  if (safe !== id) {
    throw new Error(
      `Invalid mode id: ${id}. Use only letters, numbers, hyphens, underscores.`
    )
  }
  const dir = getModesDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const toWrite = { ...content, id }
  const filePath = path.join(dir, `${safe}.json`)
  fs.writeFileSync(filePath, JSON.stringify(toWrite, null, 2) + '\n', 'utf-8')
}

/**
 * Duplicate an existing mode to a new id. newId must be unique (not a built-in id, not existing).
 */
export function duplicateMode(sourceId: string, newId: string): Mode {
  const source = getMode(sourceId)
  if (!source) {
    throw new Error(`Mode not found: ${sourceId}`)
  }
  if (isBuiltinModeId(newId)) {
    throw new Error(`Cannot use built-in id as new mode id: ${newId}`)
  }
  if (getMode(newId)) {
    throw new Error(`Mode already exists: ${newId}`)
  }
  const newName = `${source.name} (copy)`
  const newMode: Mode = {
    id: newId,
    name: newName,
    ...(source.description ? { description: source.description } : {}),
    builtin: false,
    categories: { ...source.categories },
  }
  saveMode(newId, modeToFileContent(newMode))
  return newMode
}

/**
 * Reset a built-in mode to its default. Deletes the user override file if present.
 */
export function resetMode(id: string): void {
  if (!isBuiltinModeId(id)) {
    throw new Error(`Cannot reset non-built-in mode: ${id}`)
  }
  const filePath = userFilePath(id)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

/**
 * Delete a custom (non–built-in) mode. Removes the mode file and clears it from disabled list.
 */
export function deleteMode(id: string): void {
  if (isBuiltinModeId(id)) {
    throw new Error(`Cannot delete built-in mode: ${id}`)
  }
  const filePath = userFilePath(id)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  setModeDisabled(id, false)
}

/**
 * Disable a mode (hide from selector). Persisted in settings agents.disabledModeIds.
 */
export function setModeDisabled(id: string, disabled: boolean): void {
  const settings = getSettingsService()
  const current = (settings.get('agents.disabledModeIds') as string[]) || []
  const set = new Set(current)
  if (disabled) {
    set.add(id)
  } else {
    set.delete(id)
  }
  settings.set('agents.disabledModeIds', [...set])
}
