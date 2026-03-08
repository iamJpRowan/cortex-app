import { StructuredTool } from '@langchain/core/tools'
import type { Agent } from '@shared/types'
import type { ToolAccess, ToolCategory, ToolScope } from './definition-types'
import { getMode } from '@main/services/modes/registry'
import { getBuiltinMode } from '@main/services/modes/builtins'
import type { Mode } from '@main/services/modes/types'
import { resolveEffectivePermission } from './permission-resolver'

/**
 * Metadata for a registered tool.
 * scope and access are required for permission resolution; category is derived (scope × access).
 */
export interface ToolMetadata {
  name: string
  description: string
  scope: ToolScope
  access: ToolAccess
  category: ToolCategory
  connectionType?: string
  connection?: string
  risk?: 'safe' | 'caution' | 'dangerous'
  permissionExplanation?: string
  permissions?: string[]
  /** Human-friendly label for UI (e.g. "Run Cypher" for neo4j_run_cypher) */
  displayName?: string
  /** Lucide icon name for UI (e.g. "Database", "Terminal") */
  icon?: string
}

/**
 * Registered tool: tool instance plus metadata (stored in the registry).
 */
export interface RegisteredTool {
  tool: StructuredTool
  metadata: ToolMetadata
}

/**
 * Registry for managing LangChain tools
 * Supports built-in tools and future plugin tools
 */
export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>()

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
   * Get all registered tools (tool + metadata)
   */
  getAllDefinitions(): RegisteredTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools available for a specific agent and conversation mode.
   *
   * Single touch point for tool filtering based on:
   * - Conversation permission mode (modeId → category/tool allow/ask/deny)
   * - Agent-specific tool permissions (future: Custom Agents)
   *
   * Mode is loaded from the registry; null modeId falls back to Full.
   * Deny tools are excluded. Allow and ask tools are returned; ask tool names
   * are listed separately so Phase 9 (runtime approval) can intercept them.
   *
   * @param options Options for filtering tools
   * @param options.modeId Conversation permission mode id (null treated as Full)
   * @param options.agent Agent configuration with tool permissions
   * @returns tools: StructuredTool[] for the executor (allow + ask only);
   *          askToolNames: string[] of tools requiring runtime approval (Phase 9)
   *
   * @example
   * ```typescript
   * const { tools } = toolRegistry.getToolsForAgent({ modeId: conversation.modeId })
   * ```
   */
  getToolsForAgent(options?: {
    modeId?: string | null
    agent?: Agent
  }): { tools: StructuredTool[]; askToolNames: string[] } {
    const { modeId } = options ?? {}

    // Load mode from registry; null/missing modeId → Full (legacy conversations treated as Full).
    let mode: Mode
    if (modeId) {
      const found = getMode(modeId)
      if (found) {
        mode = found
      } else {
        console.warn(
          `[ToolRegistry] Mode "${modeId}" not found, falling back to Full`
        )
        mode = getBuiltinMode('full')
      }
    } else {
      mode = getBuiltinMode('full')
    }

    console.log(`[ToolRegistry] getToolsForAgent: mode=${mode.id}`)

    // Resolve effective permission for each tool via the mode hierarchy.
    // Hierarchy: tool override ?? connection override ?? connection type override ?? category default.
    const resolved = Array.from(this.tools.values()).map(({ tool, metadata }) => ({
      tool,
      metadata,
      permission: resolveEffectivePermission(metadata, mode),
    }))

    console.log(
      `[ToolRegistry] Effective permissions: ${resolved.map(r => `${r.metadata.name}=${r.permission}`).join(', ')}`
    )

    // Filter: deny tools are excluded entirely.
    // Allow and ask tools are passed to the executor.
    // Ask tools are listed separately for Phase 9 runtime approval.
    const allowed = resolved.filter(r => r.permission !== 'deny')
    const askToolNames = allowed
      .filter(r => r.permission === 'ask')
      .map(r => r.metadata.name)

    if (resolved.length !== allowed.length) {
      const denied = resolved.filter(r => r.permission === 'deny').map(r => r.metadata.name)
      console.log(`[ToolRegistry] Denied tools (excluded): ${denied.join(', ')}`)
    }
    if (askToolNames.length > 0) {
      console.log(`[ToolRegistry] Ask tools (require runtime approval): ${askToolNames.join(', ')}`)
    }

    return { tools: allowed.map(r => r.tool), askToolNames }
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
