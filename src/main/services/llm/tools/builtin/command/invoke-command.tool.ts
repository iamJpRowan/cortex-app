import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { commandRegistry } from '../../../../commands'

/**
 * Invoke Command Tool
 *
 * Allows the LLM to invoke application commands on behalf of the user.
 * This enables the AI to take actions like toggling theme, navigating,
 * or other user-facing operations.
 *
 * Available commands are defined in the main process command registry.
 * The LLM receives a description of available commands in its context.
 *
 * @see src/main/services/commands/registry.ts
 */
export const invokeCommandTool = new DynamicStructuredTool({
  name: 'invoke_command',
  description: `Invoke an application command to take an action on behalf of the user. 
Available commands:
- theme-toggle: Toggle between light and dark theme

Use this when the user asks you to change settings, switch themes, or perform other app actions.`,
  schema: z.object({
    commandId: z
      .string()
      .describe('The ID of the command to invoke (e.g., "theme-toggle")'),
  }),
  func: async ({ commandId }) => {
    console.log(`[InvokeCommandTool] Invoking command: ${commandId}`)

    const result = await commandRegistry.execute(commandId)

    if (result.success) {
      return `Command "${commandId}" executed successfully. ${result.message || ''}`
    } else {
      return `Command "${commandId}" failed: ${result.error || 'Unknown error'}`
    }
  },
})
