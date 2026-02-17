import { DynamicStructuredTool } from '@langchain/core/tools'
import type { ToolDefinition } from './definition-types'
import { deriveCategory } from './definition-types'
import type { ToolMetadata } from './registry'

/**
 * Handler function: receives parsed schema input and returns a string result.
 */
export type ToolHandler = (input: unknown) => Promise<string>

/**
 * Map of handler keys to implementations. Built-in tools use a direct map;
 * plugins may resolve keys from loadable modules.
 */
export type ToolHandlers = Record<string, ToolHandler>

/**
 * Creates a single tool from a declarative definition and handler map.
 * Derives category from scope + access. Rejects definitions missing scope or access.
 *
 * @throws Error if definition is missing scope or access, or if handler key is missing
 */
export function createToolFromDefinition(
  def: ToolDefinition,
  handlers: ToolHandlers
): { tool: InstanceType<typeof DynamicStructuredTool>; metadata: ToolMetadata } {
  const { scope, access } = def.metadata
  if (scope == null || access == null) {
    throw new Error(
      `[ToolFactory] Tool "${def.name}" is missing required metadata: scope and access are required`
    )
  }

  const handler = handlers[def.handler]
  if (!handler) {
    throw new Error(
      `[ToolFactory] No handler registered for key "${def.handler}" (tool: ${def.name})`
    )
  }

  const category = deriveCategory(scope, access)

  const tool = new DynamicStructuredTool({
    name: def.name,
    description: def.description,
    schema: def.schema,
    func: async (input: unknown) => handler(input),
  })

  const metadata: ToolMetadata = {
    name: def.name,
    description: def.description,
    scope,
    access,
    category,
    connectionType: def.metadata.connectionType,
    connection: def.metadata.connection,
    risk: def.metadata.risk,
    permissionExplanation: def.metadata.permissionExplanation,
  }

  return { tool, metadata }
}

/**
 * Creates multiple tools from declarative definitions.
 * Uses the same handler map for all definitions.
 */
export function createToolsFromDefinitions(
  definitions: ToolDefinition[],
  handlers: ToolHandlers
): Array<{ tool: InstanceType<typeof DynamicStructuredTool>; metadata: ToolMetadata }> {
  return definitions.map(def => createToolFromDefinition(def, handlers))
}
