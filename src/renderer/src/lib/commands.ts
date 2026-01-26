import type { Action } from 'kbar'
import { toggleTheme } from './theme'

/**
 * Command Registry
 *
 * Defines all available commands for the command palette.
 * Commands are grouped by section (Navigation, Theme, etc.)
 */

export interface CommandDependencies {
  navigate: (path: string) => void
}

/**
 * Get all commands for the command palette
 */
export function getCommands(deps: CommandDependencies): Action[] {
  const { navigate } = deps

  return [
    // Navigation Section
    {
      id: 'nav-home',
      name: 'Home',
      keywords: 'home dashboard main',
      section: 'Navigation',
      perform: () => navigate('/'),
    },
    {
      id: 'nav-settings',
      name: 'Settings',
      keywords: 'settings preferences config configuration',
      section: 'Navigation',
      perform: () => navigate('/settings'),
    },

    // Theme Section
    {
      id: 'theme-toggle',
      name: 'Toggle Light / Dark Theme',
      keywords: 'theme toggle dark light mode appearance',
      section: 'Theme',
      perform: () => {
        toggleTheme()
      },
    },
  ]
}
