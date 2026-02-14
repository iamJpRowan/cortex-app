import * as React from 'react'

import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MIN_HEIGHT = 60
const MAX_HEIGHT = 280

export interface PromptInputProps extends Omit<
  React.ComponentProps<typeof Textarea>,
  'value' | 'onChange' | 'onKeyDown'
> {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
}

/**
 * Chat prompt input: auto-resizing textarea with Enter to submit,
 * Shift+Enter for newline. No attachment UI (see backlog for attachments).
 */
const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      disabled,
      placeholder = 'Type a message...',
      className,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null)

    const setRefs = React.useCallback(
      (el: HTMLTextAreaElement | null) => {
        ;(internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) {
          const mutableRef = ref as React.MutableRefObject<HTMLTextAreaElement | null>
          mutableRef.current = el
        }
      },
      [ref]
    )

    // Auto-resize based on content
    React.useEffect(() => {
      const el = internalRef.current
      if (!el) return
      el.style.height = 'auto'
      const height = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)
      el.style.height = `${height}px`
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (onSubmit && value.trim()) onSubmit()
        return
      }
      // Shift+Enter: default textarea behavior (newline)
    }

    return (
      <Textarea
        ref={setRefs}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn('resize-none overflow-y-auto py-2', className)}
        {...props}
      />
    )
  }
)
PromptInput.displayName = 'PromptInput'

export { PromptInput }
