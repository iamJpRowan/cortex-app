/**
 * Permission mode types for the Tool Permission System.
 * @see docs/product/backlog/tool-permission-system.md
 */

/** Permission level for a tool or category. */
export type PermissionLevel = 'allow' | 'ask' | 'deny'

/** Eight categories derived from scope × access. */
export const PERMISSION_CATEGORIES = [
  'readLocal',
  'writeLocal',
  'readExternal',
  'writeExternal',
  'readGraph',
  'writeGraph',
  'readApp',
  'writeApp',
] as const

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number]

/** Dot-notation keys for category defaults (e.g. "categories.readLocal"). */
export function categoryKey(cat: PermissionCategory): string {
  return `categories.${cat}`
}

/** Canonical ids for the four built-in modes. */
export const BUILTIN_MODE_IDS = [
  'local-read-only',
  'read-only',
  'local-only',
  'full',
] as const

export type BuiltinModeId = (typeof BUILTIN_MODE_IDS)[number]

/** Mode definition as stored in a file (dot notation, same convention as settings). */
export interface ModeFileContent {
  /** Mode id (required for user modes; built-ins use filename). */
  id?: string
  /** Display name. */
  name?: string
  /** Short description shown in the mode card when collapsed. */
  description?: string
  /** Category defaults: categories.readLocal, categories.writeLocal, etc. */
  [key: string]: string | undefined
}

/** In-memory mode with resolved id and name. */
export interface Mode {
  id: string
  name: string
  /** Short description shown in the mode card when collapsed. */
  description?: string
  /** Whether this is a built-in mode (cannot be renamed; can be reset). */
  builtin: boolean
  /** Category permission levels. */
  categories: Record<PermissionCategory, PermissionLevel>
  /** Future: connection type, connection, tool overrides. */
}

/** Flatten mode categories to dot-notation for file write. */
export function modeToFileContent(mode: Mode): ModeFileContent {
  const out: ModeFileContent = {
    id: mode.id,
    name: mode.name,
    ...(mode.description != null && mode.description !== ''
      ? { description: mode.description }
      : {}),
  }
  for (const cat of PERMISSION_CATEGORIES) {
    out[categoryKey(cat)] = mode.categories[cat]
  }
  return out
}

/** Parse file content into category record; missing categories default to 'deny'. */
export function fileContentToCategories(
  content: ModeFileContent
): Record<PermissionCategory, PermissionLevel> {
  const categories = {} as Record<PermissionCategory, PermissionLevel>
  const valid: PermissionLevel[] = ['allow', 'ask', 'deny']
  for (const cat of PERMISSION_CATEGORIES) {
    const v = content[categoryKey(cat)]
    categories[cat] =
      typeof v === 'string' && valid.includes(v as PermissionLevel)
        ? (v as PermissionLevel)
        : 'deny'
  }
  return categories
}

/**
 * Parse mode file content into a Mode. Same structure for built-ins and user modes.
 */
export function fileContentToMode(
  id: string,
  content: ModeFileContent,
  builtin: boolean
): Mode {
  const name =
    typeof content.name === 'string' && content.name.trim() ? content.name.trim() : id
  const description =
    typeof content.description === 'string' ? content.description.trim() : undefined
  const categories = fileContentToCategories(content)
  return {
    id,
    name,
    ...(description ? { description } : {}),
    builtin,
    categories,
  }
}
