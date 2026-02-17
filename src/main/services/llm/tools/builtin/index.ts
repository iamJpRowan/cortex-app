import { StructuredTool } from '@langchain/core/tools'
import { createToolsFromDefinitions } from '@main/services/llm/tools/factory'
import { toolRegistry } from '@main/services/llm/tools/registry'
import { getCommandToolDefinitions } from './command/tools'
import { commandHandlers } from './command/handlers'
import { neo4jHandlers } from './neo4j/handlers'
import { neo4jToolDefinitions } from './neo4j/tools'
import { registerBuiltinCommands } from '@main/services/commands'

/**
 * Auto-register all built-in tools
 * This runs when the module is imported
 */
export function registerBuiltinTools(): void {
  console.log('[ToolRegistry] Registering built-in tools...')

  // Initialize command registry first (so command tool definitions can use it)
  registerBuiltinCommands()

  // Register Neo4j tools (definition + handler pattern)
  for (const { tool, metadata } of createToolsFromDefinitions(
    neo4jToolDefinitions,
    neo4jHandlers
  )) {
    toolRegistry.register(tool as StructuredTool, metadata)
  }

  // Register command tools (definition + handler; schema is dynamic from command registry)
  const commandDefs = getCommandToolDefinitions()
  for (const { tool, metadata } of createToolsFromDefinitions(
    commandDefs,
    commandHandlers
  )) {
    toolRegistry.register(tool as StructuredTool, metadata)
  }

  console.log(`[ToolRegistry] Registered ${toolRegistry.size()} built-in tool(s)`)
}

// Auto-register on import
registerBuiltinTools()
