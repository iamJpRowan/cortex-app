import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'

/**
 * Settings schema with default values
 * All possible settings must be defined here with their defaults
 */
export interface SettingsDefaults {
  'appearance.theme': 'light' | 'dark' | 'system'
  'hotkeys.commandPalette': string
  'hotkeys.settings': string
}

/**
 * Default values for all settings
 */
const DEFAULTS: SettingsDefaults = {
  'appearance.theme': 'system',
  'hotkeys.commandPalette': process.platform === 'darwin' ? 'Cmd+K' : 'Ctrl+K',
  'hotkeys.settings': process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
}

/**
 * Settings file overrides (flat dot notation keys)
 */
type SettingsOverrides = Partial<
  Record<keyof SettingsDefaults, SettingsDefaults[keyof SettingsDefaults]>
>

/**
 * Merged settings (defaults + overrides)
 */
export type Settings = SettingsDefaults

/**
 * Get path to settings.json file
 */
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

/**
 * Read settings overrides from file
 */
function readSettingsFile(): SettingsOverrides {
  const filePath = getSettingsPath()

  try {
    if (!fs.existsSync(filePath)) {
      return {}
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(content) as SettingsOverrides

    // Validate that all keys exist in defaults
    const validated: SettingsOverrides = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (key in DEFAULTS) {
        validated[key as keyof SettingsDefaults] =
          value as SettingsDefaults[keyof SettingsDefaults]
      }
    }

    return validated
  } catch (error) {
    console.error('[Settings] Failed to read settings file:', error)
    // Return empty overrides if file is invalid
    return {}
  }
}

/**
 * Write settings overrides to file
 * Only writes keys that are explicitly set (never removes existing keys)
 */
function writeSettingsFile(overrides: SettingsOverrides): void {
  const filePath = getSettingsPath()

  try {
    // Ensure directory exists
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Read existing overrides to preserve keys that aren't being updated
    const existing = readSettingsFile()
    const merged = { ...existing, ...overrides }

    // Write merged overrides
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
  } catch (error) {
    console.error('[Settings] Failed to write settings file:', error)
    throw error
  }
}

/**
 * Settings Service
 * Manages settings with defaults, file overrides, and change notifications
 */
class SettingsService extends EventEmitter {
  private fileWatcher: fs.FSWatcher | null = null
  private watchDebounceTimer: NodeJS.Timeout | null = null
  private currentOverrides: SettingsOverrides = {}

  constructor() {
    super()
    this.currentOverrides = readSettingsFile()
    this.startFileWatcher()
  }

  /**
   * Get all settings (merged: defaults + overrides)
   */
  getAll(): Settings {
    return { ...DEFAULTS, ...this.currentOverrides } as Settings
  }

  /**
   * Get a specific setting by dot notation key
   */
  get<K extends keyof SettingsDefaults>(key: K): SettingsDefaults[K] {
    const all = this.getAll()
    return all[key]
  }

  /**
   * Set a setting value
   * Only writes to file if value differs from default (but preserves existing file keys)
   */
  set<K extends keyof SettingsDefaults>(key: K, value: SettingsDefaults[K]): void {
    // Capture previous value before updating
    const previous = this.get(key)

    // Update in-memory overrides
    this.currentOverrides[key] = value

    // Write to file (preserves existing keys, only updates this one)
    writeSettingsFile({ [key]: value })

    // Emit change event
    this.emit('change', { key, value, previous })
  }

  /**
   * Get path to settings.json file
   */
  getFilePath(): string {
    return getSettingsPath()
  }

  /**
   * Start watching settings file for external changes
   */
  private startFileWatcher(): void {
    const filePath = getSettingsPath()

    // Watch directory (more reliable than watching file directly)
    const dir = path.dirname(filePath)
    const fileName = path.basename(filePath)

    try {
      this.fileWatcher = fs.watch(dir, (eventType, changedFileName) => {
        // Only process changes to settings.json
        if (changedFileName === fileName && eventType === 'change') {
          // Debounce file changes (file editors often trigger multiple events)
          if (this.watchDebounceTimer) {
            clearTimeout(this.watchDebounceTimer)
          }

          this.watchDebounceTimer = setTimeout(() => {
            try {
              const newOverrides = readSettingsFile()
              const oldOverrides = { ...this.currentOverrides }

              // Update current overrides
              this.currentOverrides = newOverrides

              // Emit change events for any changed keys
              const allKeys = new Set([
                ...Object.keys(oldOverrides),
                ...Object.keys(newOverrides),
              ])
              for (const key of allKeys) {
                const typedKey = key as keyof SettingsDefaults
                const oldValue = oldOverrides[typedKey]
                const newValue = newOverrides[typedKey]

                if (oldValue !== newValue) {
                  this.emit('change', {
                    key: typedKey,
                    value: newValue ?? DEFAULTS[typedKey],
                    previous: oldValue ?? DEFAULTS[typedKey],
                  })
                }
              }
            } catch (error) {
              console.error('[Settings] Error processing file change:', error)
            }
          }, 500) // 500ms debounce
        }
      })
    } catch (error) {
      console.error('[Settings] Failed to start file watcher:', error)
    }
  }

  /**
   * Stop watching settings file
   */
  stopFileWatcher(): void {
    if (this.watchDebounceTimer) {
      clearTimeout(this.watchDebounceTimer)
      this.watchDebounceTimer = null
    }

    if (this.fileWatcher) {
      this.fileWatcher.close()
      this.fileWatcher = null
    }
  }
}

// Singleton instance
let settingsService: SettingsService | null = null

/**
 * Get the settings service instance (singleton)
 */
export function getSettingsService(): SettingsService {
  if (!settingsService) {
    settingsService = new SettingsService()
  }
  return settingsService
}

/**
 * Initialize settings service (called on app startup)
 */
export function initializeSettings(): SettingsService {
  return getSettingsService()
}
