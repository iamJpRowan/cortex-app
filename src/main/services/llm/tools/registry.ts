import { StructuredTool } from '@langchain/core/tools'
import type { Agent } from '@shared/types'

/**
 * Metadata for a tool
 */
export interface ToolMetadata {
  name: string
  description: string
  category?: string
  permissions?: string[]
}

/**
 * Tool definition combining the tool instance and metadata
 */
export interface ToolDefinition {
  tool: StructuredTool
  metadata: ToolMetadata
}

/**
 * Registry for managing LangChain tools
 * Supports built-in tools and future plugin tools
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  /**
   * Register a tool with metadata
   */
  register(tool: StructuredTool, metadata: ToolMetadata): void {
    const name = metadata.name || tool.name
    if (this.tools.has(name)) {
      console.warn(`[ToolRegistry] Tool "${name}" already registered, overwriting`)
    }

    this.tools.set(name, {
      tool,
      metadata: {
        ...metadata,
        name,
      },
    })

    console.log(`[ToolRegistry] Registered tool: ${name}`)
  }

  /**
   * Get a tool by name
   */
  get(name: string): StructuredTool | undefined {
    return this.tools.get(name)?.tool
  }

  /**
   * Get metadata for a tool
   */
  getMetadata(name: string): ToolMetadata | undefined {
    return this.tools.get(name)?.metadata
  }

  /**
   * List all registered tools with metadata
   */
  list(): Array<{ name: string; metadata: ToolMetadata }> {
    return Array.from(this.tools.entries()).map(([name, definition]) => ({
      name,
      metadata: definition.metadata,
    }))
  }

  /**
   * Get all tools as StructuredTool instances (for agent initialization)
   */
  getAll(): StructuredTool[] {
    return Array.from(this.tools.values()).map(def => def.tool)
  }

  /**
   * Get all tool definitions
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools available for a specific agent.
   *
   * This method provides a single touch point for tool filtering based on:
   * - Agent-specific tool permissions (allow/ask/deny)
   * - Global permission settings (future: Tool Permission System)
   *
   * Currently a passthrough to getAll(), but the signature supports
   * future permission filtering without requiring callers to change.
   *
   * @param options Options for filtering tools
   * @param options.agent Agent configuration with tool permissions
   * @returns Array of StructuredTool instances available for the agent
   *
   * @example
   * ```typescript
   * // Get all tools (default agent)
   * const tools = toolRegistry.getToolsForAgent()
   *
   * // Get tools for specific agent
   * const tools = toolRegistry.getToolsForAgent({
   *   agent: { id: 'research', name: 'Research', tools: { allow: ['neo4j.*'] } }
   * })
   * ```
   */
  getToolsForAgent(options?: { agent?: Agent }): StructuredTool[] {
    // Phase 1: Simple passthrough to getAll()
    // Future: Filter based on agent.tools.allow/ask/deny and global permissions

    // TODO: When Tool Permission System is implemented:
    // 1. Load global permission settings
    // 2. Intersect with options.agent.tools permissions (if agent provided)
    // 3. Filter tools: exclude denied, mark ask tools for approval
    // 4. Return only allowed tools
    void options // Acknowledge parameter for future use

    return this.getAll()
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get count of registered tools
   */
  size(): number {
    return this.tools.size
  }
}

/**
 * Singleton instance of the tool registry
 */
export const toolRegistry = new ToolRegistry()
