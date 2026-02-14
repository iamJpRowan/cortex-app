import { ChatAnthropic } from '@langchain/anthropic'
import type { LLMProviderAdapter } from './types'
import type { OpenAILikeProviderConfig } from './types'
import { filterToolCapable } from './tool-support-blocklist'

const PROVIDER_ID = 'anthropic'
const ANTHROPIC_API_BASE = 'https://api.anthropic.com'
const LIST_MODELS_URL = `${ANTHROPIC_API_BASE}/v1/models`

interface AnthropicModelInfo {
  id: string
  created_at?: string
  display_name?: string
  type?: string
}

interface AnthropicListModelsResponse {
  data: AnthropicModelInfo[]
  first_id?: string
  has_more?: boolean
  last_id?: string
}

export interface AnthropicModelWithMeta {
  id: string
  label?: string
}

async function fetchAnthropicModelsWithMeta(
  apiKey: string,
  baseUrl?: string
): Promise<AnthropicModelWithMeta[]> {
  const base = baseUrl?.replace(/\/$/, '') || ANTHROPIC_API_BASE
  const url = base === ANTHROPIC_API_BASE ? LIST_MODELS_URL : `${base}/v1/models`
  const res = await fetch(`${url}?limit=1000`, {
    headers: {
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic models list failed (${res.status}): ${text}`)
  }
  const body = (await res.json()) as AnthropicListModelsResponse
  const withMeta = (body.data ?? []).map((m: AnthropicModelInfo) => ({
    id: m.id,
    label: m.display_name,
  }))
  const filtered = withMeta.filter(m =>
    filterToolCapable(PROVIDER_ID, [m.id]).includes(m.id)
  )
  return filtered
}

export const anthropicAdapter: LLMProviderAdapter = {
  id: PROVIDER_ID,

  async getLLM(modelId: string, config: unknown) {
    const c = (config || {}) as OpenAILikeProviderConfig & { apiKey?: string }
    const apiKey = c.apiKey
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error(
        'Anthropic API key is not set. Add your key to settings (llm.providers.anthropic).'
      )
    }
    // Opus 4.6 recommends adaptive thinking; older models use enabled + budget_tokens.
    // Omit temperature: Anthropic does not allow temperature when thinking is enabled.
    // max_tokens must be greater than thinking.budget_tokens (Anthropic API requirement).
    const thinkingConfig =
      modelId.startsWith('claude-opus-4-6') || modelId.includes('opus-4-6')
        ? { type: 'adaptive' as const }
        : { type: 'enabled' as const, budget_tokens: 4096 }
    const maxTokens = 8192 // must be > budget_tokens when using enabled thinking
    return new ChatAnthropic({
      apiKey,
      model: modelId,
      maxTokens,
      thinking: thinkingConfig,
    })
  },

  async listModels(config: unknown): Promise<string[]> {
    const list = await this.listModelsWithMetadata!(config)
    return list.map(m => m.id)
  },

  async listModelsWithMetadata(
    config: unknown
  ): Promise<{ id: string; label?: string }[]> {
    const c = (config || {}) as OpenAILikeProviderConfig & { apiKey?: string }
    const apiKey = c.apiKey
    if (!apiKey || typeof apiKey !== 'string') {
      return []
    }
    return fetchAnthropicModelsWithMeta(apiKey, c.baseUrl)
  },
}
