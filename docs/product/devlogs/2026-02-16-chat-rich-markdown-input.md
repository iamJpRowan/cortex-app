---
date: 2026-02-16
developer: jprowan
tags: [chat, composer, markdown, tiptap]
related_backlog: [chat-rich-markdown-input]
related_files: []
related_devlogs: [2025-02-11-chat-ui-improvements]
outcome: Implemented rich markdown input per backlog; follow-up fixes for mode persistence, styling, width, and nbsp normalization.
---

# Context

Implement the Chat Rich Markdown Input backlog item: plaintext vs Live Preview toggle, markdown-aware plaintext editor (list continuation, auto-closing pairs), TipTap rich editor with paste handling, Ctrl/Cmd+Enter submit only, and debounced draft persistence.

# Solution

- **PromptInput** (refactored): Single wrapper with mode state `plain` | `preview`. Toggle in top-right: text "Plaintext" / "Live Preview", click to switch. Submit only on Ctrl/Cmd+Enter (and Send button); submit guard (empty, disabled). Ref type `PromptInputRef` with `focus()`. Min/max height 60px / 280px.
- **PromptInputPlaintext**: Custom textarea; list continuation on Enter for `- ` and `1. `; auto-closing pairs for `**` and `` ` ``. Skip-next-onChange ref used so auto-close result is not overwritten by React’s onChange.
- **PromptInputRich**: TipTap with StarterKit, Markdown, Placeholder. Value round-trip via `getMarkdown()` and `setContent(..., { contentType: 'markdown' })`. Paste: HTML converted to plain text and inserted as markdown; plain-text paste inserted as markdown. Placeholder and prose styles in `main.css`.
- **ChatView**: `inputRef` typed as `PromptInputRef`; debounced (400 ms) draft persist to `CHAT_DRAFT_KEY_PREFIX + conversationId` (or `_new`) on `onChange`.

# Outcome

- Toggle between Plaintext and Live Preview in the same container; focus follows when switching conversations/modes.
- Submit via Ctrl/Cmd+Enter or Send; Enter is newline/new paragraph.
- Drafts persist on conversation switch and debounced on typing.
- Dependencies added: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-placeholder` (^3.19.0).

# Fixes and improvements (follow-up)

- **Mode toggle and persistence**
  - Toggle label shows **current** mode ("Plaintext" or "Live Preview") instead of the mode you’d switch to.
  - Composer mode is persisted per conversation per [ui-state-persistence.md](../../development/feature-guides/ui-state-persistence.md): new key `CHAT_COMPOSER_MODE_KEY_PREFIX` (`cortex.chat.composerMode.{id}`). ChatView owns `composerMode` state; restores on conversation load and on initial app load (including `_new`); saves on conversation switch and on toggle via `handleComposerModeChange`. PromptInput supports controlled `mode` / `onModeChange` props.

- **Live Preview layout**
  - Editor container and rich editor made full width of parent: `w-full` on wrapper editor container; rich editor outer div and `EditorContent` use `min-w-0 flex-1 w-full` so the Live Preview area spans the full input width.

- **Live Preview styling**
  - No styles were applied in Live Preview. Added CSS in `main.css` for rich content: bold, italic, strikethrough, inline code, code blocks, headings (h1–h3), lists (ul/ol/li), blockquote, hr. Scoped to `.prose-prompt-input` and `[data-prompt-rich] .ProseMirror` (fallback). Rich editor container has `data-prompt-rich` for the fallback selector. All use design tokens (e.g. `--color-bg-secondary`, `--color-text-primary`).

- **TipTap `&nbsp;` / empty-draft**
  - TipTap’s Paragraph extension serializes empty paragraphs as `&nbsp;`, so "empty" Live Preview produced a stored value containing nbsp. That caused: (1) visible `&nbsp;` when switching to Plaintext, (2) draft icon showing for conversations opened in Live Preview with no user input (`.trim()` doesn’t remove U+00A0). Implemented `normalizeMarkdownForStorage(md)` in `prompt-input-rich.tsx`: strip `\u00A0` and literal `&nbsp;`, then trim. Used before every `onChange` in `onUpdate` and in the value-sync effect when comparing editor content to `value`. Stored drafts and parent value no longer contain nbsp; empty Live Preview correctly yields no draft.

- **Toggle composer hotkey**
  - New view-scoped hotkey: `chatView.hotkeys.toggleComposerMode` (default Cmd+Alt+E / Ctrl+Alt+E) to avoid conflict with TipTap’s Cmd+E for inline code. Added to settings schema and Shortcuts tab with “App” and “Chat view” subsections. Hotkey parser extended to support optional Alt and Shift (e.g. `Cmd+Alt+E`). ChatView registers the hotkey on mount and unregisters on unmount; reads from settings and re-registers when the setting changes. Single-letter shortcuts match on `event.code` (physical key) so Cmd+Alt+E works on macOS when Option changes the character. Backlog item [custom-hotkeys-prompt-input.md](../backlog/custom-hotkeys-prompt-input.md) drafted for full configurable prompt-input hotkeys (override all TipTap defaults, same bindings in plaintext and Live Preview).

# Notes

- TipTap rich editor is created with `content: ''` and synced from `value` in an effect to avoid recreating the editor on every keystroke.
- HTML paste is normalized to plain text (no turndown/HTML→markdown lib); could be improved later for richer paste.
- Backlog status set to **ready to test**; no archive until user confirms after testing.
- **Moving forward:** Add new fix/improvement bullets under **Fixes and improvements (follow-up)** with a short title and 1–2 sentences.
