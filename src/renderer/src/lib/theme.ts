/**
 * Theme Management Utility
 *
 * Handles theme detection, switching, and persistence for light/dark modes.
 * Uses CSS variables defined in main.css and data-theme attribute on <html>.
 */

export type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'cortex-theme'
const THEME_ATTRIBUTE = 'data-theme'

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
 * Get the current theme from storage or system preference
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'system'
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }

  return 'system'
}

/**
 * Set the theme and persist it
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme)
  const effectiveTheme = getEffectiveTheme(theme)
  applyTheme(effectiveTheme)
}

/**
 * Initialize theme on app load
 * Should be called once when the app starts
 */
export function initTheme(): void {
  // Get theme from storage
  const storedTheme = getTheme()
  const effectiveTheme = getEffectiveTheme(storedTheme)

  // Apply the effective theme (overrides any CSS media query default)
  applyTheme(effectiveTheme)

  // Watch for manual attribute changes and persist them
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === THEME_ATTRIBUTE) {
        const currentValue = document.documentElement.getAttribute(THEME_ATTRIBUTE)
        if (currentValue === 'light' || currentValue === 'dark') {
          // Save the explicit theme choice
          localStorage.setItem(THEME_STORAGE_KEY, currentValue)
        }
      }
    })
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  })

  // Listen for system preference changes when theme is set to 'system'
  if (storedTheme === 'system' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', e => {
      const currentTheme = getTheme()
      if (currentTheme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light')
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

  // Toggle between light and dark
  const newTheme = effectiveTheme === 'light' ? 'dark' : 'light'
  setTheme(newTheme)
}
