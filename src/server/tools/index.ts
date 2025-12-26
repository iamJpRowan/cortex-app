/**
 * Tool registry initialization
 * 
 * This module registers all available tools at startup.
 * To add a new tool:
 * 1. Create the tool definition (see execute-cypher-query.ts for example)
 * 2. Import it here
 * 3. Register it using toolRegistry.register()
 */

import { toolRegistry } from './registry.js';
import { executeCypherQueryTool } from './execute-cypher-query.js';
import { answerFromContextTool } from './answer-from-context.js';

/**
 * Initialize the tool registry with all available tools
 * Call this at server startup
 */
export function initializeTools(): void {
  // Register all tools
  toolRegistry.register(executeCypherQueryTool);
  toolRegistry.register(answerFromContextTool);

  // Log registered tools
  const tools = toolRegistry.getAll();
  console.log(`[Tools] Registered ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
}

// Re-export for convenience
export { toolRegistry } from './registry.js';
export type { Tool, ToolContext, ToolResult } from './types.js';



