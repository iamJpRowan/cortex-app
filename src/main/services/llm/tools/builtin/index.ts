import { toolRegistry } from '../registry'
import { echoTool } from './echo/echo.tool'
import { countNodesTool } from './neo4j/count-nodes.tool'
import { invokeCommandTool } from './command/invoke-command.tool'
import { registerBuiltinCommands } from '../../../commands'

/**
 * Auto-register all built-in tools
 * This runs when the module is imported
 */
export function registerBuiltinTools(): void {
  console.log('[ToolRegistry] Registering built-in tools...')

  // Initialize command registry first (so invoke_command tool can use it)
  registerBuiltinCommands()

  // Register echo tool
  toolRegistry.register(echoTool, {
    name: 'echo',
    description:
      'Echoes back the input message. Useful for testing that tools are working correctly.',
    category: 'builtin',
  })

  // Register Neo4j count-nodes tool
  toolRegistry.register(countNodesTool, {
    name: 'count_nodes',
    description:
      'Counts the total number of nodes in the Neo4j graph database. Useful for getting graph statistics or verifying database connectivity.',
    category: 'builtin',
  })

  // Register invoke-command tool (for LLM to invoke app commands)
  toolRegistry.register(invokeCommandTool, {
    name: 'invoke_command',
    description:
      'Invoke an application command to take an action on behalf of the user, such as toggling theme.',
    category: 'builtin',
  })

  console.log(`[ToolRegistry] Registered ${toolRegistry.size()} built-in tool(s)`)
}

// Auto-register on import
registerBuiltinTools()
