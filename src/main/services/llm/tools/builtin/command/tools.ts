import { z } from 'zod'
import { commandRegistry } from '@main/services/commands'
import type { ToolDefinition } from '@main/services/llm/tools/definition-types'

/**
 * Command tool definitions. Schema and description are built from the
 * current command registry (must be called after registerBuiltinCommands).
 */
export function getCommandToolDefinitions(): ToolDefinition[] {
  const commands = commandRegistry.list()
  const commandIds = commands.map(c => c.id)
  const commandDescriptions = commands.map(c => `- ${c.id}: ${c.description}`).join('\n')

  const validIds =
    commandIds.length > 0
      ? (commandIds as [string, ...string[]])
      : (['no-commands-available'] as [string, ...string[]])

  const schema = z.object({
    commandId: z
      .enum(validIds)
      .describe(`Must be exactly one of: ${commandIds.join(' | ')}`),
  })

  const description =
    `Invoke an application command. ONLY use this tool when the user ` +
    `EXPLICITLY asks to perform one of these actions:\n${commandDescriptions}\n\n` +
    `Do NOT use this tool unless the user specifically requests it. ` +
    `For example, only toggle the theme if the user says "toggle theme", ` +
    `"switch to dark mode", "change theme", etc.`

  return [
    {
      name: 'command_invoke',
      description,
      schema,
      handler: 'command_invoke',
      metadata: {
        scope: 'app',
        access: 'write',
      },
    },
  ]
}
