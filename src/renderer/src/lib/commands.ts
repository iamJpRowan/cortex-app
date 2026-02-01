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
      id: 'nav-chat',
      name: 'Open Chat',
      keywords: 'chat conversation ai assistant message',
      section: 'Navigation',
      perform: () => navigate('/chat'),
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

    // Development Section
    {
      id: 'dev-reload-agent',
      name: 'Reload LLM Agent',
      keywords: 'reload agent llm prompt refresh dev development',
      section: 'Development',
      perform: async () => {
        try {
          const result = await window.api.llm.reloadAgent()
          if (result.success) {
            console.log('[Commands] Agent reloaded:', result.message)
          } else {
            console.error('[Commands] Agent reload failed:', result.error)
          }
        } catch (error) {
          console.error('[Commands] Failed to reload agent:', error)
        }
      },
    },
  ]
}
