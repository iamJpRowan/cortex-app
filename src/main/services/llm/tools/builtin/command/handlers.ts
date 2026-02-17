import { commandRegistry } from '@main/services/commands'
import type { ToolHandlers } from '@main/services/llm/tools/factory'

type InvokeInput = { commandId: string }

/**
 * Command tool handlers. Keys must match the handler field in command/tools.ts definitions.
 */
export const commandHandlers: ToolHandlers = {
  async command_invoke(input: unknown): Promise<string> {
    const { commandId } = input as InvokeInput
    console.log('[Command invoke] Invoking command:', commandId)

    const result = await commandRegistry.execute(commandId)

    if (result.success) {
      return `Command "${commandId}" executed successfully. ${result.message || ''}`
    }
    const available = commandRegistry
      .list()
      .map(c => c.id)
      .join(', ')
    return (
      `Command "${commandId}" failed: ${result.error || 'Unknown error'}. ` +
      `Available commands: ${available}`
    )
  },
}
