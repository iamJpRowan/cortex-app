import { ChatOllama } from '@langchain/ollama'
import type { LLMProviderAdapter } from './types'
import type { OllamaProviderConfig } from './types'
import { filterToolCapable } from './tool-support-blocklist'

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434'
const PROVIDER_ID = 'ollama'

function normalizeBaseUrl(url?: string): string {
  if (!url) return DEFAULT_BASE_URL
  if (url.includes('localhost')) return url.replace('localhost', '127.0.0.1')
  return url
}

/** Ollama list can return registry path; chat API expects short name (e.g. name:tag). */
function toShortModelName(name: string): string {
  const lastSlash = name.lastIndexOf('/')
  return lastSlash >= 0 ? name.slice(lastSlash + 1) : name
}

/**
 * Select the best matching model from installed Ollama models.
 * Prefers exact or partial match of preferredName, else first available.
 */
function selectModel(installedModels: string[], preferredName?: string): string {
  if (installedModels.length === 0) {
    throw new Error(
      'No models installed in Ollama. Please pull a model:\n  ollama pull llama3.2:3b'
    )
  }
  if (preferredName) {
    const exact = installedModels.find(m => m === preferredName)
    if (exact) return exact
    const base = preferredName.split(':')[0]
    const partial = installedModels.find(
      m => m === base || m.startsWith(base + ':') || m.includes(base)
    )
    if (partial) return partial
  }
  return installedModels[0]
}

export const ollamaAdapter: LLMProviderAdapter = {
  id: PROVIDER_ID,

  async getLLM(modelId: string, config: unknown) {
    const c = (config || {}) as OllamaProviderConfig
    const baseUrl = normalizeBaseUrl(c.baseUrl)
    const models = await this.listModels(config)
    const exactModel = selectModel(models, modelId)
    const shortName = toShortModelName(exactModel)
    return new ChatOllama({
      model: shortName,
      baseUrl,
      temperature: 0,
    })
  },

  async listModels(config: unknown): Promise<string[]> {
    const c = (config || {}) as OllamaProviderConfig
    const baseUrl = normalizeBaseUrl(c.baseUrl)
    const { Ollama } = await import('ollama')
    const client = new Ollama({ host: baseUrl })
    const response = await client.list()
    if (!response.models?.length) return []
    const names = response.models.map(m => m.name)
    return filterToolCapable(PROVIDER_ID, names)
  },
}

/**
 * Resolve an Ollama "model id" (which may be a preference like "llama3.2") to an exact
 * installed model name. Use when the caller passes a short name instead of full tag.
 */
export async function resolveOllamaModelId(
  preferredModelId: string,
  config: unknown
): Promise<string> {
  const models = await ollamaAdapter.listModels(config)
  return selectModel(models, preferredModelId)
}
