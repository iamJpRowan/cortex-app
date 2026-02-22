import type { z } from 'zod'

/**
 * Permission scope: where the tool operates.
 * - local: user's machine / local resources (e.g. folder)
 * - external: external services (e.g. Neo4j, Slack)
 * - app: application actions (e.g. invoke_command)
 */
export type ToolScope = 'local' | 'external' | 'app'

/**
 * Permission access: read vs write.
 */
export type ToolAccess = 'read' | 'write'

/**
 * Derived category for permission resolution (scope × access).
 * One of six values used by the permission system.
 */
export type ToolCategory =
  | 'read local'
  | 'write local'
  | 'read external'
  | 'write external'
  | 'read app'
  | 'write app'

/**
 * Derives the permission category from scope and access.
 * Used by the factory when registering tools.
 */
export function deriveCategory(scope: ToolScope, access: ToolAccess): ToolCategory {
  return `${access} ${scope}` as ToolCategory
}

/**
 * Metadata for a declarative tool definition.
 * scope and access are required; category is derived at registration.
 */
export interface ToolDefinitionMetadata {
  scope: ToolScope
  access: ToolAccess
  connectionType?: string
  connection?: string
  risk?: 'safe' | 'caution' | 'dangerous'
  permissionExplanation?: string
  /** Human-friendly label for UI */
  displayName?: string
  /** Lucide icon name for UI (e.g. "Database", "Terminal") */
  icon?: string
  /**
   * When true (default), the factory caps this tool's result length before it goes into conversation state.
   * Set to false only when the tool must return uncapped content; this increases risk of UI freezes and
   * "prompt too long" / context-window errors.
   */
  capResultLength?: boolean
}

/**
 * Declarative tool definition (data only; no LangChain types).
 * Used as input to the factory. Definition files export these;
 * handlers are bound at registration time.
 */
export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  name: string
  description: string
  schema: T
  handler: string
  metadata: ToolDefinitionMetadata
}
