/**
 * Model list service: aggregated discovery with metadata, cached and invalidated on config change.
 * Only models in the provider's enabledModelIds are returned; default is none (user must enable).
 * @see docs/backlog/multi-provider-model-selection.md Phase 3
 */

import type { ListModelsResult, ModelMetadata } from '@shared/types'
import { parseModelId } from './types'
import { providerRegistry } from './registry'
import { getProviderConfigWithDecryptedKeys } from './secure-config'
import { getSettingsService } from '@main/services/settings'
import { getStaticMetadata, mergeMetadata } from './model-metadata'

export type GetProviderConfig = (providerId: string) => unknown

interface ModelListCache {
  enabled: ListModelsResult
  fullByProvider: Record<string, ModelMetadata[]>
}

let cache: ModelListCache | null = null
let settingsUnsubscribe: (() => void) | null = null

function getProviderConfig(providerId: string): unknown {
  const providers = getSettingsService().get('llm.providers') ?? {}
  const raw = providers[providerId]
  const rawObj =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : undefined
  return getProviderConfigWithDecryptedKeys(rawObj)
}

function getEnabledModelIds(providerId: string): string[] {
  const providers = getSettingsService().get('llm.providers') ?? {}
  const raw = providers[providerId]
  const config =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : undefined
  const ids = config?.enabledModelIds
  return Array.isArray(ids) ? (ids as string[]) : []
}

function ensureSubscribed(): void {
  if (settingsUnsubscribe) return
  const settings = getSettingsService()
  settingsUnsubscribe = () => settings.removeAllListeners('change')
  settings.on('change', (data: { key: string }) => {
    if (data.key === 'llm.providers' || data.key === 'llm.defaultModel') {
      clearModelListCache()
    }
  })
}

/**
 * Clear the model list cache. Called on llm.providers or llm.defaultModel change.
 */
export function clearModelListCache(): void {
  cache = null
  console.log('[ModelListService] Cache cleared')
}

function buildMetadata(
  prefixedId: string,
  providerId: string,
  modelId: string,
  apiLabel?: string
): ModelMetadata {
  const staticEntry = getStaticMetadata(providerId, modelId)
  return mergeMetadata(prefixedId, providerId, modelId, staticEntry, apiLabel)
}

/**
 * Get all enabled models with metadata. Only models in each provider's enabledModelIds
 * are included; when enabledModelIds is missing or empty, no models from that provider are returned.
 */
export async function getModelsWithMetadata(): Promise<ListModelsResult> {
  ensureSubscribed()
  await populateCache()
  return cache!.enabled
}

/**
 * Get all discoverable models for a provider (full list from API), for the "enable models" UI.
 * Not filtered by enabledModelIds.
 */
export async function getDiscoverableModels(
  providerId: string
): Promise<ModelMetadata[]> {
  ensureSubscribed()
  await populateCache()
  return cache!.fullByProvider[providerId] ?? []
}

async function populateCache(): Promise<void> {
  if (cache) return

  const fullByProvider: Record<string, ModelMetadata[]> = {}
  const providerIds = providerRegistry.getProviderIds()

  for (const providerId of providerIds) {
    try {
      const list = await providerRegistry.listModelsWithMetadata(
        providerId,
        getProviderConfig
      )
      const models: ModelMetadata[] = list.map(({ prefixedId, label: apiLabel }) => {
        const parsed = parseModelId(prefixedId)
        const modelId = parsed?.modelId ?? prefixedId
        return buildMetadata(prefixedId, providerId, modelId, apiLabel)
      })
      fullByProvider[providerId] = models
    } catch (err) {
      console.warn(`[ModelListService] Failed to list models for ${providerId}:`, err)
      fullByProvider[providerId] = []
    }
  }

  const byProvider: Record<string, ModelMetadata[]> = {}
  const all: ModelMetadata[] = []

  for (const providerId of providerIds) {
    const enabledIds = new Set(getEnabledModelIds(providerId))
    const full = fullByProvider[providerId] ?? []
    const enabled = full.filter(m => enabledIds.has(m.id))
    byProvider[providerId] = enabled
    all.push(...enabled)
  }

  cache = { enabled: { byProvider, all }, fullByProvider }
}
