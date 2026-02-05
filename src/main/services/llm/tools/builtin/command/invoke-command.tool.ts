import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { commandRegistry } from '../../../../commands'

/**
 * Invoke Command Tool Factory
 *
 * Creates the invoke_command tool with a dynamic enum schema based on
 * the currently registered commands. This prevents the LLM from
 * hallucinating command IDs that don't exist.
 *
 * Must be called AFTER commands are registered in the registry.
 *
 * @see src/main/services/commands/registry.ts
 */
export function createInvokeCommandTool(): DynamicStructuredTool {
  // Get available commands from registry
  const commands = commandRegistry.list()
  const commandIds = commands.map(c => c.id)

  // Build description with available commands
  const commandDescriptions = commands.map(c => `- ${c.id}: ${c.description}`).join('\n')

  // Create enum schema - requires at least one value
  // If no commands registered, use a placeholder that will fail gracefully
  const validIds =
    commandIds.length > 0
      ? (commandIds as [string, ...string[]])
      : (['no-commands-available'] as [string, ...string[]])

  return new DynamicStructuredTool({
    name: 'invoke_command',
    description:
      `Invoke an application command. ONLY use this tool when the user ` +
      `EXPLICITLY asks to perform one of these actions:\n${commandDescriptions}\n\n` +
      `Do NOT use this tool unless the user specifically requests it. ` +
      `For example, only toggle the theme if the user says "toggle theme", ` +
      `"switch to dark mode", "change theme", etc.`,
    schema: z.object({
      commandId: z
        .enum(validIds)
        .describe(`Must be exactly one of: ${commandIds.join(' | ')}`),
    }),
    func: async ({ commandId }) => {
      console.log(`[InvokeCommandTool] Invoking command: ${commandId}`)

      const result = await commandRegistry.execute(commandId)

      if (result.success) {
        return `Command "${commandId}" executed successfully. ${result.message || ''}`
      } else {
        // Include available commands in error for clarity
        const available = commandRegistry
          .list()
          .map(c => c.id)
          .join(', ')
        return (
          `Command "${commandId}" failed: ${result.error || 'Unknown error'}. ` +
          `Available commands: ${available}`
        )
      }
    },
  })
}
