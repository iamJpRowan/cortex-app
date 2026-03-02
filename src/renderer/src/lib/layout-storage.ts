/**
 * localStorage keys for app-wide layout and view state persistence.
 * All keys use cortex. prefix with namespace organization.
 *
 * @see docs/development/feature-guides/ui-state-persistence.md
 */

/** App-wide layout state */
export const LAYOUT_SIDEBAR_COLLAPSED_KEY = 'cortex.layout.sidebarCollapsed'
export const LAYOUT_LAST_VIEW_KEY = 'cortex.layout.lastView'

/** Settings view state */
export const SETTINGS_TAB_KEY = 'cortex.settings.tab'
export const SETTINGS_PROVIDER_EXPANDED_KEY = 'cortex.settings.providerExpanded'
export const SETTINGS_SCROLL_KEY = 'cortex.settings.scrollPosition'

/** Help view state */
export const HELP_EXPANDED_KEY = 'cortex.help.expanded'
export const HELP_SCROLL_KEY = 'cortex.help.scroll'
