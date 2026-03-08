import type { ToolMetadata } from './registry'
import type { Mode, PermissionCategory, PermissionLevel } from '@main/services/modes/types'
import type { ToolCategory } from './definition-types'

/**
 * Map ToolCategory (e.g. "read local") to PermissionCategory (e.g. "readLocal").
 * Both encode the same scope × access pair; the formats differ by convention
 * (tool definitions use space-separated; mode categories use camelCase).
 */
function toolCategoryToPermissionCategory(category: ToolCategory): PermissionCategory {
  const spaceIdx = category.indexOf(' ')
  const access = category.slice(0, spaceIdx) // "read" | "write"
  const scope = category.slice(spaceIdx + 1) // "local" | "external" | "graph" | "app"
  return `${access}${scope.charAt(0).toUpperCase()}${scope.slice(1)}` as PermissionCategory
}

/**
 * Resolve the effective permission level for a tool given the current mode.
 *
 * Hierarchy (most specific wins, null-coalescing):
 *   tool override ?? connection override ?? connection type override ?? category default
 *
 * Tool, connection, and connection-type overrides are reserved in the Mode type
 * for future implementation; the current implementation resolves from category
 * defaults only. The function signature and hierarchy structure are intentionally
 * complete so adding those levels requires no interface changes.
 *
 * @param metadata Registered tool metadata (scope, access, category, connectionType, connection)
 * @param mode     The conversation's resolved Mode
 * @returns Effective permission level: 'allow' | 'ask' | 'deny'
 */
export function resolveEffectivePermission(
  metadata: ToolMetadata,
  mode: Mode
): PermissionLevel {
  // Level 1: tool-level override (future: mode.tools?.[metadata.name])
  const toolOverride: PermissionLevel | undefined = undefined

  // Level 2: connection-level override (future: mode.connections?.[metadata.connection ?? ''])
  const connectionOverride: PermissionLevel | undefined = undefined

  // Level 3: connection-type-level override (future: mode.connectionTypes?.[metadata.connectionType ?? ''])
  const connectionTypeOverride: PermissionLevel | undefined = undefined

  // Level 4: category default (always defined for all eight categories)
  const permCat: PermissionCategory = toolCategoryToPermissionCategory(metadata.category)
  const categoryDefault: PermissionLevel = mode.categories[permCat] ?? 'deny'

  return toolOverride ?? connectionOverride ?? connectionTypeOverride ?? categoryDefault
}
