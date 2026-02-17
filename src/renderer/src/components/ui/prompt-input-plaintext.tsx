import * as React from 'react'

import { cn } from '@/lib/utils'

const MIN_HEIGHT = 60
const MAX_HEIGHT = 280

const LIST_ITEM_PATTERN = /^(- |\d+\. )(.*)$/

export interface PromptInputPlaintextProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Ref for the textarea element (focus). */
  ref?: React.Ref<HTMLTextAreaElement | null>
}

/**
 * Plaintext markdown editor: raw markdown with list continuation on Enter
 * and auto-closing pairs for ** and `.
 * Submit is not handled here (wrapper uses Ctrl/Cmd+Enter).
 */
const PromptInputPlaintext = React.forwardRef<
  HTMLTextAreaElement | null,
  PromptInputPlaintextProps
>(function PromptInputPlaintext(
  { value, onChange, placeholder = 'Type a message...', disabled, className },
  ref
) {
  const internalRef = React.useRef<HTMLTextAreaElement>(null)

  const setRefs = React.useCallback(
    (el: HTMLTextAreaElement | null) => {
      ;(internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) {
        const r = ref as React.MutableRefObject<HTMLTextAreaElement | null>
        r.current = el
      }
    },
    [ref]
  )

  // Auto-resize
  React.useEffect(() => {
    const el = internalRef.current
    if (!el) return
    el.style.height = 'auto'
    const height = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT)
    el.style.height = `${height}px`
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const ta = e.currentTarget
      const start = ta.selectionStart
      const textBeforeCaret = value.slice(0, start)
      const lineStart = textBeforeCaret.lastIndexOf('\n') + 1
      const line = value.slice(lineStart, start)
      const match = line.match(LIST_ITEM_PATTERN)
      if (match) {
        e.preventDefault()
        const prefix = match[1]
        const before = value.slice(0, start)
        const after = value.slice(start)
        const insert = '\n' + prefix
        onChange(before + insert + after)
        // Set cursor after the new prefix
        requestAnimationFrame(() => {
          const newPos = start + insert.length
          ta.setSelectionRange(newPos, newPos)
        })
      }
    }
  }

  const skipNextOnChangeRef = React.useRef(false)

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    const newValue = ta.value
    const prevValue = value
    const start = ta.selectionStart

    // Auto-closing: typing ** or ` inserts closing delimiter with cursor between
    if (newValue.length === prevValue.length + 1) {
      const insertedChar = newValue[start - 1]
      if (insertedChar === '*') {
        if (start >= 2 && newValue[start - 2] === '*') {
          const before = newValue.slice(0, start)
          const after = newValue.slice(start)
          const result = before + '**' + after
          skipNextOnChangeRef.current = true
          onChange(result)
          requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2))
          return
        }
      }
      if (insertedChar === '`') {
        const before = newValue.slice(0, start)
        const after = newValue.slice(start)
        const result = before + '`' + after
        skipNextOnChangeRef.current = true
        onChange(result)
        requestAnimationFrame(() => ta.setSelectionRange(start + 1, start + 1))
        return
      }
    }

    onChange(newValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (skipNextOnChangeRef.current) {
      skipNextOnChangeRef.current = false
      return
    }
    onChange(e.target.value)
  }

  return (
    <textarea
      ref={setRefs}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={cn(
        'flex min-h-[60px] w-full bg-transparent resize-none overflow-y-auto',
        `
          px-3 py-2 text-base
          placeholder:text-muted-foreground
        `,
        'focus-visible:outline-none focus-visible:bg-transparent',
        `
          disabled:cursor-not-allowed disabled:opacity-50
          md:text-sm
        `,
        className
      )}
      aria-label="Message input (plain text markdown)"
    />
  )
})

export { PromptInputPlaintext }
