import * as React from 'react'

import { PromptInputPlaintext } from '@/components/ui/prompt-input-plaintext'
import { PromptInputRich } from '@/components/ui/prompt-input-rich'
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
    },
    ref
  ) {
    const [internalMode, setInternalMode] = React.useState<PromptInputMode>('plain')
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

    return (
      <div
        ref={containerRef}
        className={cn('relative flex flex-col w-full', className)}
        onKeyDown={handleKeyDown}
      >
        {/* Mode toggle: top-right */}
        <div className="absolute top-0 right-0 z-10 flex items-center">
          <button
            type="button"
            onClick={() => setMode(m => (m === 'plain' ? 'preview' : 'plain'))}
            className={cn(
              `
                text-xs text-muted-foreground
                hover:text-foreground
                rounded px-1.5 py-0.5
              `,
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            )}
            aria-label={
              mode === 'plain' ? 'Switch to Live Preview' : 'Switch to Plaintext'
            }
          >
            {mode === 'plain' ? 'Plaintext' : 'Live Preview'}
          </button>
        </div>

        {/* Editor container: min/max height, overflow; pt for toggle; full width */}
        <div
          className={cn(
            'flex w-full min-h-[60px] max-h-[280px] overflow-y-auto rounded-md border',
            'border-input pt-6',
            'focus-within:ring-1 focus-within:ring-ring'
          )}
        >
          {mode === 'plain' ? (
            <PromptInputPlaintext
              ref={plaintextRef}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 border-0 min-h-[60px] max-h-[280px]"
            />
          ) : (
            <PromptInputRich
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 min-h-[60px] max-h-[280px]"
              editorRef={richEditorRef}
            />
          )}
        </div>
      </div>
    )
  }
)

PromptInput.displayName = 'PromptInput'

export { PromptInput }
