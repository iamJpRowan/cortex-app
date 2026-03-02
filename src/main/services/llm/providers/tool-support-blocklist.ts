/**
 * Static blocklist of models that do not support tool/function calling.
 * The app requires tool support; these models are excluded from listing and selection.
 *
 * Ollama: list is the inverse of the official Tools category (ollama.com/search?c=tools).
 * Tool-capable models include: qwen3, llama3.1, llama3.2, llama4, mistral-nemo,
 * mistral-small3.2, granite4, devstral, deepseek-v3.1, etc. Everything else is blocked.
 *
 * When adding a new provider (Phase 2+), validate which of its models do not support
 * tools and add them here. See docs/product/backlog/multi-provider-model-selection.md.
 */

/** Per-provider: list of model base names (or ids) that do NOT support tools. */
const BLOCKLIST: Record<string, string[]> = {
  ollama: [
    'aya',
    'bagel',
    'codellama',
    'command-r', // command-r-plus supports tools; command-r does not
    'deepseek-coder',
    'deepseek-r1', // reasoning model; does not support tools (deepseek-v3.1 does)
    'dolphin',
    'falcon',
    'gemma',
    'gemma2',
    'llama',
    'llama2',
    'medllama',
    'mistral', // mistral-nemo and mistral-small3.2 support tools
    'mixtral',
    'mpt',
    'nous-hermes',
    'openhermes',
    'orca',
    'phi',
    'phi2',
    'phi3',
    'refact',
    'smollm',
    'sqlcoder',
    'starcoder',
    'starling-lm',
    'tinyllama',
    'vicuna',
    'wizardcoder',
    'wizardlm',
    'wizardlm2',
    'yi',
  ],
  // openai: [],   // add when Phase 7
  anthropic: [], // Current Claude models support tools; add any legacy exceptions here
  // groq: [],     // add when Phase 7
}

/**
 * Normalize Ollama list name to short form (e.g. registry path -> tag).
 */
function toShortName(name: string): string {
  const lastSlash = name.lastIndexOf('/')
  return lastSlash >= 0 ? name.slice(lastSlash + 1) : name
}

/**
 * Get base name for blocklist matching (e.g. "wizardlm2:7b" -> "wizardlm2").
 */
function toBaseName(providerId: string, modelIdOrName: string): string {
  const short = toShortName(modelIdOrName)
  const firstColon = short.indexOf(':')
  return firstColon >= 0 ? short.slice(0, firstColon) : short
}

/**
 * True if this model is known not to support tools and must not be used.
 */
export function isModelBlocked(providerId: string, modelIdOrName: string): boolean {
  const list = BLOCKLIST[providerId]
  if (!list?.length) return false
  const base = toBaseName(providerId, modelIdOrName).toLowerCase()
  return list.some(blocked => blocked.toLowerCase() === base)
}

/**
 * Filter a list of model names/ids to only those that support tools (not blocklisted).
 */
export function filterToolCapable(providerId: string, modelIds: string[]): string[] {
  return modelIds.filter(id => !isModelBlocked(providerId, id))
}
