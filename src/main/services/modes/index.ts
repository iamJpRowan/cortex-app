/**
 * Permission mode service: built-in modes + user mode files.
 * @see docs/backlog/tool-permission-system.md
 */

export {
  getMode,
  getModeFilePath,
  listModes,
  listAllModes,
  saveMode,
  duplicateMode,
  resetMode,
  deleteMode,
  setModeDisabled,
} from './registry'
export { getBuiltinMode, getBuiltinModeIds, isBuiltinModeId } from './builtins'
export type { Mode, ModeFileContent, PermissionLevel, PermissionCategory } from './types'
export { BUILTIN_MODE_IDS, PERMISSION_CATEGORIES, categoryKey } from './types'
