/**
 * Hotkeys Service
 *
 * Handles app-level keyboard shortcuts (work when app window is focused).
 * Reads hotkey bindings from settings and registers event listeners.
 */

/** Format shortcut string to symbol form for tooltips (e.g. "Mod+Shift+P" → "⌘⇧P"). */
export function formatShortcutForDisplay(shortcut: string): string {
  const isMac = typeof process !== 'undefined' && process.platform === 'darwin'
  const parts = shortcut.split('+').map(s => s.trim().toLowerCase())
  const key = parts.length > 0 ? parts[parts.length - 1]!.toUpperCase() : ''
  const mods = parts.slice(0, -1)
  const symbols: string[] = []
  for (const p of mods) {
    if (p === 'mod' || p === 'cmd' || p === 'meta') {
      symbols.push(isMac ? '⌘' : '⌃')
    } else if (p === 'ctrl' || p === 'control') {
      symbols.push('⌃')
    } else if (p === 'alt' || p === 'option') {
      symbols.push('⌥')
    } else if (p === 'shift') {
      symbols.push('⇧')
    }
  }
  return symbols.join('') + key
}

interface ParsedShortcut {
  modifier: 'meta' | 'ctrl'
  key: string
  altKey: boolean
  shiftKey: boolean
}

type HotkeyAction = () => void

const registeredHotkeys = new Map<
  string,
  { action: HotkeyAction; handler: (e: KeyboardEvent) => void }
>()

/**
 * Parse shortcut string (e.g. "Cmd+K", "Ctrl+Alt+E") into modifier and key.
 * Supports optional Alt and Shift before the key.
 */
function parseShortcut(shortcut: string): ParsedShortcut | null {
  const parts = shortcut
    .split('+')
    .map(s => s.trim())
    .filter(Boolean)

  if (parts.length < 2) {
    console.warn(`[Hotkeys] Invalid shortcut format: ${shortcut}`)
    return null
  }

  const keyPart = parts[parts.length - 1]
  const modParts = parts.slice(0, -1).map(p => p.toLowerCase())

  let modifier: 'meta' | 'ctrl' | null = null
  let altKey = false
  let shiftKey = false

  for (const p of modParts) {
    if (p === 'cmd' || p === 'meta') {
      if (modifier != null) {
        console.warn(`[Hotkeys] Duplicate modifier in: ${shortcut}`)
        return null
      }
      modifier = 'meta'
    } else if (p === 'ctrl' || p === 'control') {
      if (modifier != null) {
        console.warn(`[Hotkeys] Duplicate modifier in: ${shortcut}`)
        return null
      }
      modifier = 'ctrl'
    } else if (p === 'alt') {
      altKey = true
    } else if (p === 'shift') {
      shiftKey = true
    } else {
      console.warn(`[Hotkeys] Unknown modifier: ${p} in ${shortcut}`)
      return null
    }
  }

  if (modifier == null) {
    console.warn(`[Hotkeys] Missing Cmd/Ctrl in: ${shortcut}`)
    return null
  }

  return { modifier, key: keyPart.toLowerCase(), altKey, shiftKey }
}

/**
 * Check if keyboard event matches the parsed shortcut.
 * Uses event.code for letter keys so Cmd+Alt+E matches KeyE on macOS
 * even when Option+E produces a different character (e.g. ´).
 */
function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  const modifierMatch = parsed.modifier === 'meta' ? event.metaKey : event.ctrlKey

  let keyMatch = false
  const eventKey = event.key.toLowerCase()
  const eventCode = event.code.toLowerCase()

  if (parsed.key === ',') {
    keyMatch = eventKey === ',' || eventKey === 'comma' || eventCode === 'comma'
  } else if (parsed.key.length === 1) {
    // Prefer event.code (physical key) for letters so Cmd+Alt+E matches KeyE on macOS
    const codeForLetter = 'key' + parsed.key
    keyMatch =
      eventCode === codeForLetter || eventKey === parsed.key || eventCode === parsed.key
  } else {
    keyMatch = eventKey === parsed.key || eventCode === parsed.key
  }

  return (
    modifierMatch &&
    keyMatch &&
    event.altKey === parsed.altKey &&
    event.shiftKey === parsed.shiftKey
  )
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

  // Capture phase so we run before the focused element (e.g. composer) handles the key
  window.addEventListener('keydown', handler, true)
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
    window.removeEventListener('keydown', registered.handler, true)
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
  toggleSidebar: () => void
}): Promise<() => void> {
  let currentSettingsShortcut: string | null = null
  let currentSidebarShortcut: string | null = null

  const registerSettingsHotkey = async () => {
    try {
      if (currentSettingsShortcut) {
        unregisterHotkey(currentSettingsShortcut)
        currentSettingsShortcut = null
      }

      const settingsResult = await window.api?.settings?.get()
      if (!settingsResult?.success || !settingsResult.data) {
        console.warn('[Hotkeys] Failed to load settings')
        return
      }

      const settings = settingsResult.data as {
        'hotkeys.settings'?: string
      }

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

  const registerSidebarHotkey = async () => {
    try {
      if (currentSidebarShortcut) {
        unregisterHotkey(currentSidebarShortcut)
        currentSidebarShortcut = null
      }

      const settingsResult = await window.api?.settings?.get()
      if (!settingsResult?.success || !settingsResult.data) {
        return
      }

      const settings = settingsResult.data as {
        'hotkeys.sidebar'?: string
      }

      const sidebarShortcut = settings['hotkeys.sidebar']
      if (sidebarShortcut) {
        registerHotkey(sidebarShortcut, actions.toggleSidebar)
        currentSidebarShortcut = sidebarShortcut
        console.log(`[Hotkeys] Registered sidebar shortcut: ${sidebarShortcut}`)
      }
    } catch (error) {
      console.error('[Hotkeys] Failed to register sidebar hotkey:', error)
    }
  }

  const registerAll = async () => {
    await registerSettingsHotkey()
    await registerSidebarHotkey()
  }

  await registerAll()

  let unsubscribe: (() => void) | null = null
  if (window.api?.settings?.onChange) {
    unsubscribe = window.api.settings.onChange(data => {
      if (data.key === 'hotkeys.settings') {
        registerSettingsHotkey()
      } else if (data.key === 'hotkeys.sidebar') {
        registerSidebarHotkey()
      }
    })
  }

  return () => {
    if (currentSettingsShortcut) {
      unregisterHotkey(currentSettingsShortcut)
    }
    if (currentSidebarShortcut) {
      unregisterHotkey(currentSidebarShortcut)
    }
    if (unsubscribe) {
      unsubscribe()
    }
  }
}
