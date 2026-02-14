import { providerRegistry } from './registry'
import { ollamaAdapter } from './ollama'
import { anthropicAdapter } from './anthropic'

providerRegistry.register(ollamaAdapter)
providerRegistry.register(anthropicAdapter)

export { providerRegistry, type GetProviderConfig } from './registry'
export { ollamaAdapter, resolveOllamaModelId } from './ollama'
export { anthropicAdapter } from './anthropic'
export {
  getModelsWithMetadata,
  getDiscoverableModels,
  clearModelListCache,
} from './model-list-service'
export {
  getStaticMetadata,
  mergeMetadata,
  defaultLabel,
  type StaticMetadataEntry,
} from './model-metadata'
export {
  parseModelId,
  buildModelId,
  type PrefixedModelId,
  type ParsedModelId,
  type LLMProviderAdapter,
  type OllamaProviderConfig,
  type OpenAILikeProviderConfig,
  type ProviderConfig,
} from './types'
