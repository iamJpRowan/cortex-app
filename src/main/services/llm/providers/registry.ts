import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { parseModelId, buildModelId } from './types'
import type { LLMProviderAdapter, PrefixedModelId } from './types'

export type GetProviderConfig = (providerId: string) => unknown

/**
 * Provider registry: resolves prefixed model ids to LLM instances with caching.
 * Cache is cleared when provider config or default model changes (call clearCache()).
 */
class ProviderRegistry {
  private adapters = new Map<string, LLMProviderAdapter>()
  private llmCache = new Map<PrefixedModelId, BaseChatModel>()

  register(adapter: LLMProviderAdapter): void {
    if (this.adapters.has(adapter.id)) {
      console.warn(`[ProviderRegistry] Overwriting existing adapter: ${adapter.id}`)
    }
    this.adapters.set(adapter.id, adapter)
  }

  getAdapter(providerId: string): LLMProviderAdapter | undefined {
    return this.adapters.get(providerId)
  }

  /** Provider ids of all registered adapters (for discovery iteration). */
  getProviderIds(): string[] {
    return [...this.adapters.keys()]
  }

  /**
   * Resolve a prefixed model id to an LLM instance. Uses cache; clear on config change.
   */
  async getLLM(
    prefixedModelId: PrefixedModelId,
    getProviderConfig: GetProviderConfig
  ): Promise<BaseChatModel> {
    const cached = this.llmCache.get(prefixedModelId)
    if (cached) return cached

    const parsed = parseModelId(prefixedModelId)
    if (!parsed) {
      throw new Error(
        `Invalid model id: "${prefixedModelId}". Expected format "providerId:modelId".`
      )
    }

    const adapter = this.adapters.get(parsed.providerId)
    if (!adapter) {
      throw new Error(
        `Unknown provider: "${parsed.providerId}". Available: ${[...this.adapters.keys()].join(', ')}.`
      )
    }

    const config = getProviderConfig(parsed.providerId)
    const llm = await Promise.resolve(adapter.getLLM(parsed.modelId, config))
    this.llmCache.set(prefixedModelId, llm)
    return llm
  }

  /**
   * List available model ids for a provider (returns prefixed ids).
   */
  async listModels(
    providerId: string,
    getProviderConfig: GetProviderConfig
  ): Promise<PrefixedModelId[]> {
    const adapter = this.adapters.get(providerId)
    if (!adapter) return []
    const config = getProviderConfig(providerId)
    const modelIds = await adapter.listModels(config)
    return modelIds.map(id => buildModelId(providerId, id))
  }

  /**
   * List models with optional provider-supplied labels (e.g. Anthropic display_name).
   * Falls back to ids only when adapter does not implement listModelsWithMetadata.
   */
  async listModelsWithMetadata(
    providerId: string,
    getProviderConfig: GetProviderConfig
  ): Promise<{ prefixedId: string; label?: string }[]> {
    const adapter = this.adapters.get(providerId)
    if (!adapter) return []
    const config = getProviderConfig(providerId)
    if (adapter.listModelsWithMetadata) {
      const list = await adapter.listModelsWithMetadata(config)
      return list.map(({ id, label }) => ({
        prefixedId: buildModelId(providerId, id),
        label,
      }))
    }
    const ids = await adapter.listModels(config)
    return ids.map(id => ({ prefixedId: buildModelId(providerId, id) }))
  }

  /**
   * Clear LLM cache. Call when llm.providers or llm.defaultModel changes.
   */
  clearCache(): void {
    this.llmCache.clear()
    console.log('[ProviderRegistry] Cache cleared')
  }
}

export const providerRegistry = new ProviderRegistry()
