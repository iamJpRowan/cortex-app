/**
 * Main Process Command Registry
 *
 * Provides commands that the LLM can invoke directly from the main process.
 * This mirrors key user-facing commands from the renderer, enabling the AI
 * to take actions on behalf of the user.
 *
 * Commands here are a subset of the full command palette - only commands
 * that are safe and useful for LLM invocation.
 *
 * @see src/renderer/src/lib/commands.ts - Renderer command registry
 */

import { getSettingsService } from '../settings'

/**
 * Command definition for LLM-invokable commands
 */
export interface LLMCommand {
  /** Unique command identifier */
  id: string

  /** Human-readable name */
  name: string

  /** Description of what the command does (for LLM context) */
  description: string

  /** Category for organization */
  category: string

  /** Execute the command */
  execute: () => Promise<{ success: boolean; message?: string }>
}

/**
 * Registry of commands available for LLM invocation
 */
class CommandRegistry {
  private commands = new Map<string, LLMCommand>()

  /**
   * Register a command
   */
  register(command: LLMCommand): void {
    if (this.commands.has(command.id)) {
      console.warn(
        `[CommandRegistry] Command "${command.id}" already registered, overwriting`
      )
    }
    this.commands.set(command.id, command)
    console.log(`[CommandRegistry] Registered command: ${command.id}`)
  }

  /**
   * Get a command by ID
   */
  get(id: string): LLMCommand | undefined {
    return this.commands.get(id)
  }

  /**
   * List all available commands
   */
  list(): LLMCommand[] {
    return Array.from(this.commands.values())
  }

  /**
   * Execute a command by ID
   */
  async execute(
    id: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const command = this.commands.get(id)
    if (!command) {
      return { success: false, error: `Command "${id}" not found` }
    }

    try {
      console.log(`[CommandRegistry] Executing command: ${id}`)
      const result = await command.execute()
      console.log(
        `[CommandRegistry] Command "${id}" completed: ${result.message || 'success'}`
      )
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[CommandRegistry] Command "${id}" failed:`, error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get command descriptions for LLM context
   * Returns a formatted string describing available commands
   */
  getDescriptions(): string {
    const commands = this.list()
    if (commands.length === 0) {
      return 'No commands available.'
    }

    return commands.map(cmd => `- ${cmd.id}: ${cmd.description}`).join('\n')
  }
}

/**
 * Singleton command registry
 */
export const commandRegistry = new CommandRegistry()

/**
 * Register built-in commands
 * Called during app initialization
 */
export function registerBuiltinCommands(): void {
  console.log('[CommandRegistry] Registering built-in commands...')

  // Theme toggle command
  commandRegistry.register({
    id: 'theme-toggle',
    name: 'Toggle Light / Dark Theme',
    description:
      'Toggle between light and dark theme. Persists the preference to settings.',
    category: 'Appearance',
    execute: async () => {
      const settings = getSettingsService()
      const currentTheme = settings.get('appearance.theme') as string | undefined

      // Determine effective theme (resolve 'system' to actual preference)
      let effectiveTheme = currentTheme
      if (!effectiveTheme || effectiveTheme === 'system') {
        // Default to light if system preference can't be determined from main process
        effectiveTheme = 'light'
      }

      // Toggle
      const newTheme = effectiveTheme === 'light' ? 'dark' : 'light'
      settings.set('appearance.theme', newTheme)

      return {
        success: true,
        message: `Theme changed to ${newTheme}`,
      }
    },
  })

  // Future commands can be added here:
  // - navigate-to (requires IPC to renderer)
  // - open-settings
  // - etc.

  console.log(
    `[CommandRegistry] Registered ${commandRegistry.list().length} built-in command(s)`
  )
}
