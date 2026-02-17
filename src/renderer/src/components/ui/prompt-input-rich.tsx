import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { Placeholder } from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'

export interface PromptInputRichProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Ref to assign the editor's focus method. */
  editorRef?: React.MutableRefObject<{ focus(): void } | null>
}

const extensions = (placeholder: string) => [
  StarterKit,
  Markdown,
  Placeholder.configure({ placeholder }),
]

/**
 * Strip TipTap empty-paragraph markers (&nbsp; / U+00A0) for storage so we don't
 * show a draft when the editor is visually empty.
 */
function normalizeMarkdownForStorage(md: string): string {
  return md
    .replace(/\u00A0/g, '')
    .replace(/&nbsp;/g, '')
    .trim()
}

/**
 * Rich (WYSIWYG) prompt input using TipTap. Serializes to markdown for value/onChange.
 * Paste is normalized via TipTap Markdown (markdown and HTML → formatted content).
 */
function PromptInputRichInner({
  value,
  onChange,
  placeholder = 'Type a message...',
  disabled = false,
  className,
  editorRef,
}: PromptInputRichProps) {
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange
  const editorRefForPaste = React.useRef<ReturnType<typeof useEditor> | null>(null)

  const editor = useEditor(
    {
      extensions: React.useMemo(() => extensions(placeholder), [placeholder]),
      content: '',
      contentType: 'markdown',
      editable: !disabled,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          'aria-label': 'Message input (rich text)',
          class: cn(
            'min-h-[60px] max-h-[280px] overflow-y-auto w-full rounded-md border-0',
            `
              bg-transparent
              focus-visible:bg-transparent
              px-3 py-2 text-base outline-none
            `,
            'md:text-sm',
            'prose-prompt-input prose-prompt-input-p',
            className
          ),
        },
        handlePaste: (_view, event) => {
          const text = event.clipboardData?.getData('text/plain')
          const html = event.clipboardData?.getData('text/html')
          if (text || html) {
            const markdown = html ? htmlToMarkdown(html) : (text ?? '')
            const ed = editorRefForPaste.current
            if (markdown && ed) {
              ed.commands.insertContent(markdown, { contentType: 'markdown' })
              return true
            }
          }
          return false
        },
      },
      onUpdate: ({ editor: ed }) => {
        const md = (ed as unknown as { getMarkdown?: () => string }).getMarkdown?.()
        if (md !== undefined) onChangeRef.current(normalizeMarkdownForStorage(md))
      },
    },
    [placeholder]
  )

  // Sync controlled value into editor when switching from plaintext or external change
  React.useEffect(() => {
    if (!editor) return
    const raw =
      (editor as unknown as { getMarkdown?: () => string }).getMarkdown?.() ?? ''
    const current = normalizeMarkdownForStorage(raw)
    if (current !== value) {
      editor.commands.setContent(value, { contentType: 'markdown' })
      if (!value || value.trim() === '') {
        editor.commands.setTextSelection(1)
      }
    }
  }, [editor, value])

  React.useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  // When editor gains focus and is empty, collapse selection so no blank character is selected
  React.useEffect(() => {
    if (!editor) return
    const onFocus = () => {
      if (!editor.isDestroyed && editor.isEmpty) {
        const sel = editor.state.selection
        if (sel.from !== sel.to) {
          requestAnimationFrame(() => {
            if (!editor.isDestroyed) editor.commands.setTextSelection(1)
          })
        }
      }
    }
    editor.on('focus', onFocus)
    return () => {
      editor.off('focus', onFocus)
    }
  }, [editor])

  editorRefForPaste.current = editor

  React.useEffect(() => {
    if (!editorRef) return
    editorRef.current = editor
      ? {
          focus() {
            if (editor.isEmpty) {
              editor.commands.setTextSelection(1)
            }
            editor.commands.focus()
          },
        }
      : null
    // Focus when editor becomes ready so focus isn't lost after switching chat
    if (editor && !editor.isDestroyed) {
      const id = requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          if (editor.isEmpty) editor.commands.setTextSelection(1)
          editor.commands.focus()
        }
      })
      return () => cancelAnimationFrame(id)
    }
  }, [editor, editorRef])

  if (!editor) return null

  const isEmpty = !value || value.trim() === ''

  return (
    <div
      data-prompt-rich
      className={cn(
        `
          relative flex min-w-0 flex-1 min-h-[60px] max-h-[280px] w-full bg-transparent
          overflow-hidden
        `,
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {/* Placeholder overlay when empty (TipTap placeholder decoration can be unreliable) */}
      {isEmpty && (
        <div
          className="
            pointer-events-none absolute inset-0 flex items-start px-3 py-2 text-base
            md:text-sm
            text-[var(--color-text-tertiary)]
          "
          aria-hidden
        >
          {placeholder}
        </div>
      )}
      <EditorContent editor={editor} className="relative min-w-0 w-full" />
    </div>
  )
}

/** HTML paste: strip tags to plain text so we don't inject raw HTML. */
function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const text = doc.body.innerText ?? ''
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

const PromptInputRich = React.memo(PromptInputRichInner)

export { PromptInputRich }
