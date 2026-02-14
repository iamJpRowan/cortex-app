/**
 * Static model metadata for discovery (Phase 3).
 * Keyed by provider then model id (no prefix). Merged with discovered model ids.
 * Costs in USD per token; context window in tokens.
 * @see docs/backlog/multi-provider-model-selection.md Phase 3
 */

import type { ModelMetadata, ModelCapabilities } from '@shared/types'

export type StaticMetadataEntry = Omit<ModelMetadata, 'id'>

/** Per-provider: model id (no prefix) -> optional metadata to merge */
const STATIC: Record<string, Record<string, StaticMetadataEntry>> = {
  ollama: {
    'llama3.2:1b': {
      label: 'Llama 3.2 1B',
      contextWindow: 128_000,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
    'llama3.2:3b': {
      label: 'Llama 3.2 3B',
      contextWindow: 128_000,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
    'llama3.1:8b': {
      label: 'Llama 3.1 8B',
      contextWindow: 128_000,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
    'llama3.1:70b': {
      label: 'Llama 3.1 70B',
      contextWindow: 128_000,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
    'qwen2.5:7b': {
      label: 'Qwen 2.5 7B',
      contextWindow: 32_768,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
    'qwen3:8b': {
      label: 'Qwen 3 8B',
      contextWindow: 128_000,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
    'mistral-nemo:latest': {
      label: 'Mistral Nemo',
      contextWindow: 128_000,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
    'deepseek-v3.1:latest': {
      label: 'DeepSeek V3.1',
      contextWindow: 128_000,
      capabilities: { tools: true, vision: false },
      privacyNote: 'Local only',
    },
  },
  anthropic: {
    'claude-3-5-sonnet-20241022': {
      label: 'Claude 3.5 Sonnet',
      contextWindow: 200_000,
      costPerTokenInput: 3e-6,
      costPerTokenOutput: 15e-6,
      capabilities: { tools: true, vision: true },
      privacyNote: 'Data sent to Anthropic',
    },
    'claude-3-5-haiku-20241022': {
      label: 'Claude 3.5 Haiku',
      contextWindow: 200_000,
      costPerTokenInput: 0.8e-6,
      costPerTokenOutput: 4e-6,
      capabilities: { tools: true, vision: true },
      privacyNote: 'Data sent to Anthropic',
    },
    'claude-3-opus-20240229': {
      label: 'Claude 3 Opus',
      contextWindow: 200_000,
      costPerTokenInput: 15e-6,
      costPerTokenOutput: 75e-6,
      capabilities: { tools: true, vision: true },
      privacyNote: 'Data sent to Anthropic',
    },
    'claude-sonnet-4-20250514': {
      label: 'Claude Sonnet 4',
      contextWindow: 200_000,
      costPerTokenInput: 3e-6,
      costPerTokenOutput: 15e-6,
      capabilities: { tools: true, vision: true },
      privacyNote: 'Data sent to Anthropic',
    },
    'claude-3-5-sonnet-20240620': {
      label: 'Claude 3.5 Sonnet (Jun 2024)',
      contextWindow: 200_000,
      costPerTokenInput: 3e-6,
      costPerTokenOutput: 15e-6,
      capabilities: { tools: true, vision: true },
      privacyNote: 'Data sent to Anthropic',
    },
  },
}

const DEFAULT_CAPABILITIES: ModelCapabilities = { tools: true, vision: false }

/**
 * Get static metadata for a provider+model (no prefix). Returns undefined if not in static map.
 * Supports tag suffixes: e.g. "llama3.2:3b-q4_0" matches static key "llama3.2:3b".
 */
export function getStaticMetadata(
  providerId: string,
  modelId: string
): StaticMetadataEntry | undefined {
  const byProvider = STATIC[providerId]
  if (!byProvider) return undefined
  const exact = byProvider[modelId]
  if (exact) return exact
  for (const [key, value] of Object.entries(byProvider)) {
    if (
      modelId === key ||
      modelId.startsWith(key + '-') ||
      modelId.startsWith(key + ':')
    ) {
      return value
    }
  }
  return undefined
}

/**
 * Capitalize a segment for display (e.g. "3b" -> "3B", "sonnet" -> "Sonnet").
 */
function capitalizeSegment(segment: string): string {
  if (!segment) return segment
  const lower = segment.toLowerCase()
  if (lower.endsWith('b') && /^\d+b$/.test(lower)) return segment.slice(0, -1) + 'B'
  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
}

/**
 * Format a model id segment: split on [-_] (keep dots for versions like 3.2) and capitalize.
 * Drops a trailing segment that looks like a date (8 digits).
 */
function formatSegment(part: string): string {
  const segments = part.split(/[-_]+/)
  const filtered = segments.filter(
    (s, i) => i !== segments.length - 1 || !/^\d{8}$/.test(s)
  )
  return filtered.map(capitalizeSegment).join(' ')
}

/**
 * Build a human-friendly display label from model id when no static label exists.
 * e.g. "llama3.2:3b" -> "Llama 3.2 3B", "claude-3-5-sonnet-20241022" -> "Claude 3.5 Sonnet"
 */
export function defaultLabel(modelId: string): string {
  if (!modelId) return 'Unknown'
  if (modelId.includes(':')) {
    const [name, ...rest] = modelId.split(':')
    const nameLabel = formatSegment(name)
    const tagLabel = rest.map(formatSegment).join(' ')
    return tagLabel ? `${nameLabel} ${tagLabel}` : nameLabel
  }
  return formatSegment(modelId)
}

/**
 * Merge discovered model id with static metadata into a full ModelMetadata.
 * When apiLabel is provided (e.g. from provider API display_name), it takes precedence for label.
 */
export function mergeMetadata(
  prefixedId: string,
  providerId: string,
  modelId: string,
  staticEntry?: StaticMetadataEntry | null,
  apiLabel?: string | null
): ModelMetadata {
  const base: ModelMetadata = {
    id: prefixedId,
    label: apiLabel ?? staticEntry?.label ?? defaultLabel(modelId),
    contextWindow: staticEntry?.contextWindow,
    costPerTokenInput: staticEntry?.costPerTokenInput,
    costPerTokenOutput: staticEntry?.costPerTokenOutput,
    capabilities: staticEntry?.capabilities ?? DEFAULT_CAPABILITIES,
    privacyNote: staticEntry?.privacyNote,
  }
  return base
}
