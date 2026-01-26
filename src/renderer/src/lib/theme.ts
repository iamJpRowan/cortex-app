/**
 * Theme Management Utility
 *
 * Handles theme detection, switching, and persistence for light/dark modes.
 * Persists to settings.json via the settings API (appearance.theme).
 * Uses CSS variables defined in main.css and data-theme attribute on <html>.
 */

export type Theme = 'light' | 'dark' | 'system'

const THEME_ATTRIBUTE = 'data-theme'
const LEGACY_STORAGE_KEY = 'cortex-theme'

/** In-memory cache so getTheme() stays sync; set by initTheme and setTheme */
let cachedTheme: Theme = 'system'

/**
 * Get the current system preference for color scheme
 */
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Get the effective theme (resolves 'system' to actual system preference)
 */
function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemPreference() : theme
}

/**
 * Apply theme to the document
 */
function applyTheme(theme: 'light' | 'dark'): void {
  const html = document.documentElement
  html.setAttribute(THEME_ATTRIBUTE, theme)
}

/**
 * Get the current theme (from in-memory cache).
 * Returns 'system' until initTheme() has run.
 */
export function getTheme(): Theme {
  return cachedTheme
}

/**
 * Set the theme and optionally persist to settings.
 * Use persist: true only when this call is the source of the change
 * (e.g. user picked in UI or ran Toggle Theme).
 * Use default (persist: false) when applying an external change
 * (e.g. settings file edit) to avoid a feedback loop.
 */
export function setTheme(theme: Theme, options?: { persist?: boolean }): void {
  if (typeof window === 'undefined') return

  cachedTheme = theme
  const effectiveTheme = getEffectiveTheme(theme)
  applyTheme(effectiveTheme)

  if (options?.persist) {
    window.api?.settings?.set('appearance.theme', theme).catch(err => {
      console.error('[Theme] Failed to persist theme to settings:', err)
    })
  }
}

/**
 * Initialize theme on app load.
 * Loads from settings; migrates from localStorage once if settings have no override.
 * Should be called once when the app starts (before render).
 */
export async function initTheme(): Promise<void> {
  if (typeof window === 'undefined') return

  let theme: Theme = 'system'

  try {
    const result = await window.api?.settings?.get()
    if (result?.success && result.data && typeof result.data === 'object') {
      const data = result.data as { 'appearance.theme'?: unknown }
      const stored = data['appearance.theme']
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        theme = stored
      }
    }
  } catch (err) {
    console.warn('[Theme] Failed to load theme from settings, using default:', err)
  }

  // One-time migration: if no theme in settings, use legacy localStorage
  if (theme === 'system' && typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'light' || legacy === 'dark' || legacy === 'system') {
      theme = legacy
      try {
        await window.api?.settings?.set('appearance.theme', theme)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch (err) {
        console.warn('[Theme] Failed to migrate theme from localStorage:', err)
      }
    }
  }

  cachedTheme = theme
  applyTheme(getEffectiveTheme(theme))

  // Subscribe to settings changes so external edits to appearance.theme apply immediately
  if (window.api?.settings?.onChange) {
    window.api.settings.onChange(data => {
      if (
        data.key === 'appearance.theme' &&
        (data.value === 'light' || data.value === 'dark' || data.value === 'system')
      ) {
        cachedTheme = data.value as Theme
        applyTheme(getEffectiveTheme(cachedTheme))
      }
    })
  }

  // Listen for system preference changes when theme is set to 'system'
  if (theme === 'system' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (cachedTheme === 'system') {
        applyTheme(getSystemPreference())
      }
    })
  }
}

/**
 * Toggle between light and dark themes
 * If current theme is 'system', switches to 'light'
 */
export function toggleTheme(): void {
  const currentTheme = getTheme()
  const effectiveTheme = getEffectiveTheme(currentTheme)
  const newTheme: Theme = effectiveTheme === 'light' ? 'dark' : 'light'
  setTheme(newTheme, { persist: true })
}
