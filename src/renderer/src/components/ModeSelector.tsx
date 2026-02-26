import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PermissionMode } from '@shared/types'

export interface ModeSelectorProps {
  /** Current selected mode id (e.g. full, local-only). */
  value: string
  /** Called when user selects a different mode. */
  onValueChange: (modeId: string) => void
  /** Modes from modes.list(); if null, selector is disabled or loading. */
  modeList: PermissionMode[] | null
  /** Whether the control is disabled. */
  disabled?: boolean
  /** Placeholder when no mode selected. */
  placeholder?: string
  /** Optional class for the trigger. */
  className?: string
}

const FALLBACK_PLACEHOLDER = 'Permission mode'

/**
 * Permission mode selector dropdown. Used in chat footer and settings.
 */
export function ModeSelector({
  value,
  onValueChange,
  modeList,
  disabled = false,
  placeholder = FALLBACK_PLACEHOLDER,
  className,
}: ModeSelectorProps) {
  const list = modeList ?? []
  const currentMode = list.find(m => m.id === value)
  const selectValue = value && list.some(m => m.id === value) ? value : '__none__'

  return (
    <Select
      value={selectValue}
      onValueChange={v => v && v !== '__none__' && onValueChange(v)}
      disabled={disabled || list.length === 0}
    >
      <SelectTrigger className={className} aria-label="Permission mode">
        <SelectValue placeholder={placeholder}>
          {selectValue !== '__none__' && currentMode ? (
            <span className="truncate">{currentMode.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {list.map(mode => (
          <SelectItem key={mode.id} value={mode.id}>
            <span>{mode.name}</span>
            {mode.builtin && (
              <span className="ml-2 text-xs text-muted-foreground">(built-in)</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
