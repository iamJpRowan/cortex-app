import type { BaseChatModel } from '@langchain/core/language_models/chat_models'

/**
 * Prefixed model identifier: "providerId:modelId"
 * e.g. "ollama:llama3.2:3b", "openai:gpt-4"
 * @see docs/product/backlog/multi-provider-model-selection.md Decision Record
 */
export type PrefixedModelId = string

/**
 * Parsed model id (provider + model name within that provider)
 */
export interface ParsedModelId {
  providerId: string
  modelId: string
}

/**
 * Parse a prefixed model id into provider and model id.
 * Format: "providerId:modelId" (first colon separates provider from model)
 */
export function parseModelId(prefixed: PrefixedModelId): ParsedModelId | null {
  if (!prefixed || typeof prefixed !== 'string') return null
  const firstColon = prefixed.indexOf(':')
  if (firstColon <= 0) return null
  return {
    providerId: prefixed.slice(0, firstColon),
    modelId: prefixed.slice(firstColon + 1),
  }
}

/**
 * Build a prefixed model id from provider and model id
 */
export function buildModelId(providerId: string, modelId: string): PrefixedModelId {
  return `${providerId}:${modelId}`
}

/**
 * Provider config stored in settings (llm.providers[providerId]).
 * API keys are stored encrypted as apiKeyEncrypted; decryption only in main process.
 */
export interface OllamaProviderConfig {
  baseUrl?: string
  /** Prefixed model ids the user has enabled; when absent or empty, no models are enabled. */
  enabledModelIds?: string[]
}

export interface OpenAILikeProviderConfig {
  baseUrl?: string
  apiKeyEncrypted?: string
  organizationId?: string
  /** Prefixed model ids the user has enabled; when absent or empty, no models are enabled. */
  enabledModelIds?: string[]
}

export type ProviderConfig = OllamaProviderConfig | OpenAILikeProviderConfig

/**
 * Adapter interface for an LLM provider.
 * Each adapter returns a LangChain-compatible chat model for a given model id.
 */
export interface LLMProviderAdapter {
  readonly id: string

  /**
   * Return an LLM instance for the given model id (without provider prefix).
   * Config is the provider's slice from settings (llm.providers[id]).
   * May resolve short names to exact model (e.g. Ollama: "llama3.2" -> "llama3.2:3b").
   */
  getLLM(modelId: string, config: unknown): BaseChatModel | Promise<BaseChatModel>

  /**
   * List available model ids for this provider (without prefix).
   */
  listModels(config: unknown): Promise<string[]>

  /**
   * Optional: list model ids with provider-supplied display labels (e.g. API display_name).
   * When present, used for discovery and labels; otherwise listModels + static/defaultLabel is used.
   */
  listModelsWithMetadata?(config: unknown): Promise<{ id: string; label?: string }[]>
}
