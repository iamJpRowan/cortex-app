/**
 * Built-in permission mode definitions.
 * Same structure as user mode .json files (id, name, description, categories.*).
 * Users can override by saving a mode file with the same id; reset restores this default.
 * @see docs/product/backlog/tool-permission-system.md
 */

import type { Mode, ModeFileContent } from './types'
import { fileContentToMode } from './types'
import { BUILTIN_MODE_IDS, type BuiltinModeId } from './types'

/**
 * Built-in modes as file-shaped content (identical structure to user mode JSON files).
 */
const BUILTIN_MODE_FILE_CONTENTS: Record<BuiltinModeId, ModeFileContent> = {
  'local-read-only': {
    id: 'local-read-only',
    name: 'Local Read Only',
    description: 'Read local files only; no writes, no external access.',
    'categories.readLocal': 'allow',
    'categories.writeLocal': 'deny',
    'categories.readExternal': 'deny',
    'categories.writeExternal': 'deny',
    'categories.readGraph': 'deny',
    'categories.writeGraph': 'deny',
    'categories.readApp': 'allow',
    'categories.writeApp': 'ask',
  },
  'read-only': {
    id: 'read-only',
    name: 'Read Only',
    description: 'Read local and external; no writes.',
    'categories.readLocal': 'allow',
    'categories.writeLocal': 'deny',
    'categories.readExternal': 'allow',
    'categories.writeExternal': 'deny',
    'categories.readGraph': 'deny',
    'categories.writeGraph': 'deny',
    'categories.readApp': 'allow',
    'categories.writeApp': 'ask',
  },
  'local-only': {
    id: 'local-only',
    name: 'Local Only',
    description: 'Read and write local only; no external access.',
    'categories.readLocal': 'allow',
    'categories.writeLocal': 'allow',
    'categories.readExternal': 'deny',
    'categories.writeExternal': 'deny',
    'categories.readGraph': 'deny',
    'categories.writeGraph': 'deny',
    'categories.readApp': 'allow',
    'categories.writeApp': 'ask',
  },
  full: {
    id: 'full',
    name: 'Full',
    description: 'Full access: local, external, graph, and app read/write.',
    'categories.readLocal': 'allow',
    'categories.writeLocal': 'allow',
    'categories.readExternal': 'allow',
    'categories.writeExternal': 'allow',
    'categories.readGraph': 'allow',
    'categories.writeGraph': 'allow',
    'categories.readApp': 'allow',
    'categories.writeApp': 'allow',
  },
}

/**
 * Returns the built-in default mode definition for a given id.
 * Parsed from the same file-shaped content as user modes.
 */
export function getBuiltinMode(id: BuiltinModeId): Mode {
  const content = BUILTIN_MODE_FILE_CONTENTS[id]
  if (!content) {
    throw new Error(`Unknown built-in mode id: ${id}`)
  }
  return fileContentToMode(id, content, true)
}

/**
 * All built-in mode ids (for validation and reset).
 */
export function getBuiltinModeIds(): BuiltinModeId[] {
  return [...BUILTIN_MODE_IDS]
}

/**
 * Returns true if id is a built-in mode id.
 */
export function isBuiltinModeId(id: string): id is BuiltinModeId {
  return BUILTIN_MODE_IDS.includes(id as BuiltinModeId)
}

/**
 * Default file content for a built-in mode (for reset and serialization).
 * Same structure as a mode .json file.
 */
export function getBuiltinModeFileContent(id: BuiltinModeId): Record<string, string> {
  const content = BUILTIN_MODE_FILE_CONTENTS[id]
  if (!content) {
    throw new Error(`Unknown built-in mode id: ${id}`)
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(content)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}
