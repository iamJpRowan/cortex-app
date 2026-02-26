import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

/** Shared class for action row icon buttons (tooltip + consistent size/hover). */
export const SETTINGS_CARD_ACTION_ICON_CLASS = cn(
  'h-8 w-8 shrink-0 rounded-md',
  'text-text-secondary',
  'hover:text-text-primary',
  'hover:bg-accent'
)

export interface SettingsExpandableCardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Summary: title row (icon + name). Use font-medium text-text-primary for title. */
  title: React.ReactNode
  /** Summary: optional description below title. Shown when collapsed and expanded. */
  description?: React.ReactNode
  /** Icon actions with tooltips; chevron added by card. Use SETTINGS_CARD_ACTION_ICON_CLASS. */
  actionIcons?: React.ReactNode
  /** Expanded content. May include action row (Save, Copy, etc.) and footer. */
  children: React.ReactNode
  /** When true, applies disabled styling (muted text and border). */
  disabled?: boolean
  className?: string
}

/**
 * Expandable card for Settings (LLM Providers, Permission Modes).
 * Layout: one header row (title + description left, action icons + chevron right) → collapsible body.
 */
export function SettingsExpandableCard({
  open,
  onOpenChange,
  title,
  description,
  actionIcons,
  children,
  disabled = false,
  className,
}: SettingsExpandableCardProps) {
  const contentId = React.useId()
  const handleToggle = () => onOpenChange(!open)

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-border bg-bg-secondary/50 p-4',
          disabled && 'settings-expandable-card--disabled',
          className
        )}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
      >
        {/* Header row: title + description (left), action icons + chevron (right) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">{title}</div>
            {description != null && (
              <div className="text-xs text-text-secondary line-clamp-2">
                {description}
              </div>
            )}
          </div>
          <div
            className="flex shrink-0 items-center gap-1"
            onClick={e => e.stopPropagation()}
          >
            {actionIcons}
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center',
                'text-text-secondary transition-transform duration-200 ease-out',
                open && 'rotate-180'
              )}
              aria-hidden
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Body (collapsible) */}
        <div
          id={contentId}
          role="region"
          className="settings-expandable-card__content"
          data-state={open ? 'open' : 'closed'}
        >
          <div
            className="settings-expandable-card__body-inner"
            onClick={e => e.stopPropagation()}
            role="presentation"
          >
            {children}
          </div>
        </div>
      </div>
    </Collapsible>
  )
}
