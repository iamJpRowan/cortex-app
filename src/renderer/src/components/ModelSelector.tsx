import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProviderIcon, getProviderIdFromModelId } from '@/components/ProviderIcon'
import type { ListModelsResult, ModelMetadata } from '@shared/types'

export interface ModelSelectorProps {
  /** Current selected model id (prefixed, e.g. ollama:llama3.2:3b). */
  value: string
  /** Called when user selects a different model. */
  onValueChange: (modelId: string) => void
  /** Model list from llm.listModels(); if null, selector is disabled or loading. */
  modelList: ListModelsResult | null
  /** Whether the control is disabled (e.g. while loading). */
  disabled?: boolean
  /** Placeholder when no model selected. */
  placeholder?: string
  /** Optional class for the trigger. */
  className?: string
}

const FALLBACK_PLACEHOLDER = 'Select model'

/**
 * Model selector dropdown: models grouped by provider, with provider icon and label.
 * Used below chat input and (later) in Quick Launcher.
 */
export function ModelSelector({
  value,
  onValueChange,
  modelList,
  disabled = false,
  placeholder = FALLBACK_PLACEHOLDER,
  className,
}: ModelSelectorProps) {
  const byProvider = modelList?.byProvider ?? {}
  const all = modelList?.all ?? []
  const providerIds = Object.keys(byProvider).sort()

  const currentLabel =
    value && all.find(m => m.id === value)
      ? ((all.find(m => m.id === value) as ModelMetadata).label ?? value)
      : null

  // Radix Select requires a valid value; use a sentinel when empty so we can show placeholder
  const selectValue = value && all.some(m => m.id === value) ? value : '__none__'

  return (
    <Select
      value={selectValue}
      onValueChange={v => v && v !== '__none__' && onValueChange(v)}
      disabled={disabled || all.length === 0}
    >
      <SelectTrigger className={className} aria-label="Model">
        <SelectValue placeholder={placeholder}>
          {selectValue !== '__none__' && value && currentLabel ? (
            <div className="flex items-center gap-2">
              <ProviderIcon providerId={getProviderIdFromModelId(value)} size={14} />
              <span className="truncate">{currentLabel}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {providerIds.map(providerId => {
          const models = byProvider[providerId] ?? []
          return (
            <React.Fragment key={providerId}>
              {models.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <ProviderIcon providerId={providerId} size={14} />
                    <span>{model.label ?? model.id}</span>
                    {model.contextWindow != null && (
                      <span className="text-muted-foreground text-xs">
                        {model.contextWindow >= 1000
                          ? `${model.contextWindow / 1000}K`
                          : model.contextWindow}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </React.Fragment>
          )
        })}
      </SelectContent>
    </Select>
  )
}
