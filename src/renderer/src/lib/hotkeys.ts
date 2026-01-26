/**
 * Hotkeys Service
 *
 * Handles app-level keyboard shortcuts (work when app window is focused).
 * Reads hotkey bindings from settings and registers event listeners.
 */

interface ParsedShortcut {
  modifier: 'meta' | 'ctrl'
  key: string
}

type HotkeyAction = () => void

const registeredHotkeys = new Map<
  string,
  { action: HotkeyAction; handler: (e: KeyboardEvent) => void }
>()

/**
 * Parse shortcut string (e.g., "Cmd+K" or "Ctrl+,") into modifier and key
 */
function parseShortcut(shortcut: string): ParsedShortcut | null {
  const parts = shortcut.split('+').map(s => s.trim())

  if (parts.length !== 2) {
    console.warn(`[Hotkeys] Invalid shortcut format: ${shortcut}`)
    return null
  }

  const [modifierPart, keyPart] = parts
  const modifier = modifierPart.toLowerCase()

  // Normalize modifier names
  if (modifier === 'cmd' || modifier === 'meta') {
    return { modifier: 'meta', key: keyPart.toLowerCase() }
  }
  if (modifier === 'ctrl' || modifier === 'control') {
    return { modifier: 'ctrl', key: keyPart.toLowerCase() }
  }

  console.warn(`[Hotkeys] Unknown modifier: ${modifierPart}`)
  return null
}

/**
 * Check if keyboard event matches the parsed shortcut
 */
function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  const modifierMatch = parsed.modifier === 'meta' ? event.metaKey : event.ctrlKey

  // Handle special keys
  let keyMatch = false
  const eventKey = event.key.toLowerCase()
  const eventCode = event.code.toLowerCase()

  if (parsed.key === ',') {
    // Comma can be reported as ',' or 'comma' in key, or 'comma' in code
    keyMatch = eventKey === ',' || eventKey === 'comma' || eventCode === 'comma'
  } else if (parsed.key.length === 1) {
    // Single character keys - check both key and code
    keyMatch = eventKey === parsed.key || eventCode === parsed.key
  } else {
    // Handle named keys (e.g., 'k', 'enter', 'escape')
    keyMatch = eventKey === parsed.key || eventCode === parsed.key
  }

  return modifierMatch && keyMatch && !event.shiftKey && !event.altKey
}

/**
 * Register a hotkey
 */
export function registerHotkey(shortcut: string, action: HotkeyAction): () => void {
  // Unregister existing hotkey if present
  if (registeredHotkeys.has(shortcut)) {
    unregisterHotkey(shortcut)
  }

  const parsed = parseShortcut(shortcut)
  if (!parsed) {
    console.warn(`[Hotkeys] Failed to parse shortcut: ${shortcut}`)
    return () => {} // Return no-op cleanup function
  }

  const handler = (event: KeyboardEvent) => {
    if (matchesShortcut(event, parsed)) {
      event.preventDefault()
      event.stopPropagation()
      action()
    }
  }

  window.addEventListener('keydown', handler)
  registeredHotkeys.set(shortcut, { action, handler })

  // Return cleanup function
  return () => unregisterHotkey(shortcut)
}

/**
 * Unregister a hotkey
 */
export function unregisterHotkey(shortcut: string): void {
  const registered = registeredHotkeys.get(shortcut)
  if (registered) {
    window.removeEventListener('keydown', registered.handler)
    registeredHotkeys.delete(shortcut)
  }
}

/**
 * Unregister all hotkeys
 */
export function unregisterAllHotkeys(): void {
  for (const [shortcut] of registeredHotkeys) {
    unregisterHotkey(shortcut)
  }
}

/**
 * Initialize hotkeys from settings
 * Registers hotkeys based on settings values
 * Returns cleanup function to unsubscribe from settings changes
 */
export async function initHotkeys(actions: {
  openSettings: () => void
}): Promise<() => void> {
  let currentSettingsShortcut: string | null = null

  const registerSettingsHotkey = async () => {
    try {
      // Unregister existing settings hotkey if present
      if (currentSettingsShortcut) {
        unregisterHotkey(currentSettingsShortcut)
        currentSettingsShortcut = null
      }

      // Read hotkey settings
      const settingsResult = await window.api?.settings?.get()
      if (!settingsResult?.success || !settingsResult.data) {
        console.warn('[Hotkeys] Failed to load settings')
        return
      }

      const settings = settingsResult.data as {
        'hotkeys.settings'?: string
      }

      // Register settings hotkey (Cmd+, / Ctrl+,)
      const settingsShortcut = settings['hotkeys.settings']
      if (settingsShortcut) {
        registerHotkey(settingsShortcut, actions.openSettings)
        currentSettingsShortcut = settingsShortcut
        console.log(`[Hotkeys] Registered settings shortcut: ${settingsShortcut}`)
      }
    } catch (error) {
      console.error('[Hotkeys] Failed to register settings hotkey:', error)
    }
  }

  // Initial registration
  await registerSettingsHotkey()

  // Subscribe to settings changes to re-register if hotkey binding changes
  let unsubscribe: (() => void) | null = null
  if (window.api?.settings?.onChange) {
    unsubscribe = window.api.settings.onChange(data => {
      if (data.key === 'hotkeys.settings') {
        registerSettingsHotkey()
      }
    })
  }

  // Return cleanup function
  return () => {
    if (currentSettingsShortcut) {
      unregisterHotkey(currentSettingsShortcut)
    }
    if (unsubscribe) {
      unsubscribe()
    }
  }
}
