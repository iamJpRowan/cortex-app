import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { PromptInputPlaintext } from '@/components/ui/prompt-input-plaintext'
import { PromptInputRich } from '@/components/ui/prompt-input-rich'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatShortcutForDisplay } from '@/lib/hotkeys'
import { cn } from '@/lib/utils'

export type PromptInputMode = 'plain' | 'preview'

export interface PromptInputRef {
  focus(): void
}

export interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
  placeholder?: string
  className?: string
  /** Current editor mode (controlled). */
  mode?: PromptInputMode
  /** Called when user toggles mode. */
  onModeChange?: (mode: PromptInputMode) => void
  /** Optional actions row rendered below the editor (e.g. model selector + submit). */
  footer?: React.ReactNode
  /**
   * When set with footer, the container uses this height (px) and shows a resize handle.
   * Use with onContainerHeightChange to persist.
   */
  containerHeight?: number
  /** Called when the user resizes the container; clamp height before persisting. */
  onContainerHeightChange?: (height: number) => void
  /** Min height (px) when resizable. Default 120. */
  containerHeightMin?: number
  /** Max height as % of viewport height when resizable (e.g. 90 = 90vh). Default 90. */
  containerHeightMaxVh?: number
  /** Raw shortcut for mode toggle (e.g. "Mod+Shift+P") for tooltip. */
  modeToggleShortcut?: string
}

/**
 * Chat prompt input: plaintext (markdown) and Live Preview (TipTap) in one container.
 * Submit via Ctrl/Cmd+Enter only; Enter / Shift+Enter are normal.
 * Content is stored and sent as plaintext markdown.
 */
const PromptInput = React.forwardRef<PromptInputRef, PromptInputProps>(
  function PromptInput(
    {
      value,
      onChange,
      onSubmit,
      disabled = false,
      placeholder = 'Type a message...',
      className,
      mode: modeProp,
      onModeChange,
      footer,
      containerHeight,
      onContainerHeightChange,
      containerHeightMin = 120,
      containerHeightMaxVh = 90,
      modeToggleShortcut,
    },
    ref
  ) {
    const [internalMode, setInternalMode] = React.useState<PromptInputMode>('plain')
    const resizeStartRef = React.useRef<{ y: number; height: number } | null>(null)
    const mode = modeProp ?? internalMode
    React.useEffect(() => {
      if (modeProp !== undefined) setInternalMode(modeProp)
    }, [modeProp])
    const setMode = React.useCallback(
      (next: PromptInputMode | ((prev: PromptInputMode) => PromptInputMode)) => {
        const value = typeof next === 'function' ? next(mode) : next
        setInternalMode(value)
        onModeChange?.(value)
      },
      [mode, onModeChange]
    )
    const plaintextRef = React.useRef<HTMLTextAreaElement>(null)
    const richEditorRef = React.useRef<{ focus(): void } | null>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useImperativeHandle(
      ref,
      () => ({
        focus() {
          if (mode === 'plain') {
            plaintextRef.current?.focus()
          } else {
            richEditorRef.current?.focus()
          }
        },
      }),
      [mode]
    )

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (onSubmit && value.trim() && !disabled) onSubmit()
      }
    }

    const handleContainerClick = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement
        if (!containerRef.current?.contains(target)) return
        if (target.closest('button, a, select, [role="separator"], [role="combobox"]'))
          return
        if (target.closest('[data-composer-footer]')) return
        if (mode === 'plain') {
          plaintextRef.current?.focus()
        } else {
          richEditorRef.current?.focus()
        }
      },
      [mode]
    )

    const handleResizeMouseDown = React.useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0 || containerHeight == null || !onContainerHeightChange) return
        e.preventDefault()
        resizeStartRef.current = { y: e.clientY, height: containerHeight }
      },
      [containerHeight, onContainerHeightChange]
    )

    React.useEffect(() => {
      if (!onContainerHeightChange) return
      const onMove = (e: MouseEvent) => {
        const start = resizeStartRef.current
        if (start == null) return
        const dy = e.clientY - start.y
        const maxPx = (window.innerHeight * containerHeightMaxVh) / 100
        const next = Math.min(maxPx, Math.max(containerHeightMin, start.height - dy))
        onContainerHeightChange(next)
      }
      const onUp = () => {
        resizeStartRef.current = null
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      return () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
    }, [onContainerHeightChange, containerHeightMin, containerHeightMaxVh])

    const hasFooter = footer != null
    const isResizable =
      hasFooter && containerHeight != null && onContainerHeightChange != null

    const maxPx =
      (typeof window !== 'undefined' ? window.innerHeight : 800) *
      (containerHeightMaxVh / 100)
    const atMax = isResizable && containerHeight != null && containerHeight >= maxPx - 1
    const atMin =
      isResizable && containerHeight != null && containerHeight <= containerHeightMin

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative flex flex-col w-full',
          hasFooter &&
            `
              rounded-md border border-input
              focus-within:ring-1 focus-within:ring-ring
            `,
          className
        )}
        style={
          isResizable && containerHeight != null
            ? {
                height: containerHeight,
                minHeight: containerHeightMin,
                maxHeight: `${containerHeightMaxVh}vh`,
              }
            : undefined
        }
        onKeyDown={handleKeyDown}
        onClick={handleContainerClick}
      >
        {isResizable && (
          <div
            role="separator"
            aria-label="Resize composer"
            tabIndex={-1}
            className="
              flex-shrink-0 h-1.5 cursor-n-resize rounded-t-md
              hover:bg-muted-foreground/20
              active:bg-muted-foreground/30
            "
            onMouseDown={handleResizeMouseDown}
          />
        )}

        {/* Height presets: top-left (below resize handle when present) */}
        {isResizable && onContainerHeightChange && (
          <div className="absolute left-0 top-1.5 z-10 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onContainerHeightChange(maxPx)}
              disabled={atMax}
              aria-label="Expand to full height"
              className={cn(
                'rounded p-0.5 text-muted-foreground',
                'hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                atMax && 'pointer-events-none opacity-40'
              )}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onContainerHeightChange(containerHeightMin)}
              disabled={atMin}
              aria-label="Collapse to minimum height"
              className={cn(
                'rounded p-0.5 text-muted-foreground',
                'hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                atMin && 'pointer-events-none opacity-40'
              )}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Mode toggle: top-right (below resize handle when present) */}
        <div
          className={cn(
            'absolute right-0 z-10 flex items-center',
            isResizable ? 'top-1.5' : 'top-0'
          )}
        >
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setMode(m => (m === 'plain' ? 'preview' : 'plain'))}
                  className={cn(
                    `
                      text-xs text-muted-foreground
                      hover:text-foreground
                      rounded px-1.5 py-0.5
                    `,
                    `
                      focus-visible:outline-none focus-visible:ring-1
                      focus-visible:ring-ring
                    `
                  )}
                  aria-label={
                    mode === 'plain' ? 'Switch to Live Preview' : 'Switch to Plaintext'
                  }
                >
                  {mode === 'plain' ? 'Plaintext' : 'Live Preview'}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {mode === 'plain' ? 'Switch to Live Preview' : 'Switch to Plaintext'}
                {modeToggleShortcut && (
                  <span className="ml-1.5 opacity-80">
                    {formatShortcutForDisplay(modeToggleShortcut)}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Editor container: fixed max when not resizable; flex column and scroll when resizable */}
        <div
          className={cn(
            'w-full pt-6',
            isResizable
              ? 'flex flex-col flex-1 min-h-0 overflow-y-auto'
              : 'flex min-h-[60px] max-h-[280px] overflow-y-auto'
          )}
        >
          {mode === 'plain' ? (
            <PromptInputPlaintext
              ref={plaintextRef}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'flex-1 border-0 min-h-[60px]',
                isResizable ? 'min-h-full max-h-none' : 'max-h-[280px]'
              )}
            />
          ) : (
            <PromptInputRich
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'flex-1 min-h-[60px]',
                isResizable ? 'min-h-0 max-h-none overflow-y-auto' : 'max-h-[280px]'
              )}
              editorRef={richEditorRef}
            />
          )}
        </div>

        {hasFooter && (
          <div
            data-composer-footer
            className="flex flex-shrink-0 items-center justify-between gap-2 px-2 py-2"
          >
            {footer}
          </div>
        )}
      </div>
    )
  }
)

PromptInput.displayName = 'PromptInput'

export { PromptInput }
