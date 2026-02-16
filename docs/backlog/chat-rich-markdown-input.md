---
status: ready to test
---

[Docs](../README.md) / [Backlog](./README.md) / Chat Rich Markdown Input

# Chat Rich Markdown Input 

## Goal

Provide a rich markdown editing experience in the chat composer with paste-to-render, plaintext/preview toggle, and markdown-aware plaintext editor. Content is stored and sent to the LLM as plaintext markdown.

---

## Libraries

### Rich editor (TipTap)

- `@tiptap/react` — React bindings
- `@tiptap/starter-kit` — Blockquote, Bold, Code, CodeBlock, headings, lists, Strike, etc.; typed markdown shorthand and common hotkeys (Cmd+B, Cmd+I, etc.) via defaults
- `@tiptap/markdown` — Markdown serialization (`getMarkdown`), deserialization (`setContent` with `contentType: 'markdown'`), and parsing for paste
- `@tiptap/extension-placeholder` — Placeholder text when empty

### Plaintext editor

- No external libraries; custom textarea with keydown/input handlers.

### Shared

- Markdown parsing for paste and plaintext→preview: TipTap Markdown extension (`generateJSON` or `insertContent` with markdown) or shared util.

---

## Requirements (Explicit Only)

### Shared

- **Single container** — One input area; same container switches between plaintext and preview modes.
- **Toggle plain ↔ preview** — User can switch between plaintext editor (markdown aware) and rich editor (TipTap WYSIWYG).
- **Submit: Ctrl/Cmd+Enter only** — Ctrl/Cmd+Enter submits in both modes. Enter and Shift+Enter behave as normal editor keys (new paragraph, soft break).
- **Submit guard** — Do not submit when content is empty or whitespace-only; respect `disabled` when loading.
- **Storage and LLM output** — Content is stored and sent to the LLM as plaintext markdown.
- **Shared parse logic** — The same markdown→formatted parsing is used for paste (into rich editor) and for switching from plaintext to preview mode.
- **Component API** — `value`, `onChange`, `onSubmit`, `disabled`, `placeholder`, `ref`, `className`; controlled `value` + `onChange`; ref exposes `focus()` for programmatic focus.
- **Focus on switch** — When switching conversations or modes, focus the active editor.
- **Draft persistence** — Store markdown strings in `localStorage`; persist on `onChange` (debounced); no migration for existing drafts.
- **Placeholder** — Show placeholder when empty (e.g. "Type a message...").
- **Height** — Editor container: min-height ~60px, max-height ~280px, overflow-y-auto.
- **Accessibility** — ARIA labels, keyboard navigation, focus management per [docs/design/accessibility.md](../design/accessibility.md).

### Plaintext editor (markdown aware)

- **Raw markdown** — Shows and edits plain markdown syntax.
- **List continuation** — Typing `- ` or `1. ` and pressing Enter inserts the same prefix on the next line.
- **Auto-closing pairs** — Typing `**` or `` ` `` inserts the closing delimiter with cursor between.

### Rich editor

- **Paste handling** — Use TipTap paste rules to normalize pasted content: markdown → formatted content; HTML (e.g. from web pages) → markdown.
- **Shared styling** — Renders using existing CSS (design tokens, typography, code blocks) applied elsewhere in the app; leverage preexisting styles.

---

## Component Ownership

### PromptInput

- Single container wrapper; composes plaintext editor and rich editor.
- Toggle state (plaintext vs preview); renders one or the other.
- Ctrl/Cmd+Enter submit handler (wrapper-level `onKeyDown` so it works in both modes); submit guard (empty, disabled).
- Value/onChange API; passes through to the active editor.
- Ref with `focus()`; focus active editor when switching conversations or modes.
- Invokes shared parse logic when switching from plaintext to preview.
- Height (min/max, overflow); placeholder.

### Plaintext editor (markdown aware)

- Raw markdown display and editing.
- List continuation on Enter.
- Auto-closing pairs (`**`, `` ` ``).

### Rich editor (TipTap)

- Paste handler: TipTap paste rules to normalize markdown and HTML → markdown.
- Shared styling: use existing CSS (design tokens, typography) from the app.
- Serialize to markdown for value/onChange.

### Shared

- Markdown→formatted parsing (used by PromptInput for plaintext→preview, by TipTap for paste).

---

## Prerequisites

- **[Cursor-Style Chat UI](./archive/cursor-style-chat-ui.md)** — Complete. Multi-line composer and layout in place.

---

## Architecture (Summary)

| Concern | Owner |
|---------|--------|
| Ctrl/Cmd+Enter submit, submit guard | PromptInput (wrapper) |
| Focus on switch | PromptInput |
| Paste handling (markdown, HTML → markdown) | Rich editor |
| Accessibility (ARIA, keyboard nav, focus) | PromptInput, editors |
| Toggle state, plaintext vs preview | PromptInput |
| Value/onChange API | PromptInput (pass-through) |
| Draft persistence | ChatView (uses onChange) |
| Markdown parsing (paste + toggle) | TipTap Markdown extension or shared util |
| Plaintext editor QoL (list continuation, auto-close) | Plaintext editor |

---

## Proposed approach (implementation)

- **Scope**
  - **PromptInput** (single wrapper): One container; internal state for mode (`plain` | `preview`). Renders either a custom plaintext editor or the TipTap rich editor. Handles Ctrl/Cmd+Enter submit at wrapper level (keydown), submit guard (empty/whitespace, `disabled`). Ref type: `{ focus(): void }`; `focus()` focuses the currently active editor. Min-height ~60px, max-height ~280px, overflow-y-auto. Placeholder passed to both editors. When switching plain → preview, run shared markdown→formatted parse and set rich editor content; when switching preview → plain, get markdown from TipTap and set plaintext value.
  - **Plaintext editor**: Custom `<textarea>` (no new deps). Raw markdown; list continuation on Enter (`- `, `1. ` → insert same prefix on next line); auto-closing pairs for `**` and `` ` `` (cursor between). Same height/overflow container. Value/onChange; no submit key handling (wrapper handles it).
  - **Rich editor (TipTap)**: New deps: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tiptap/markdown`, `@tiptap/extension-placeholder`. Paste: use TipTap markdown paste rules so pasted markdown/HTML is normalized to formatted content (markdown as source). Serialize to markdown for `onChange`. Styling: reuse design tokens and typography from the app (e.g. `main.css`, same code-block/heading styles as message rendering where applicable) so the composer preview looks consistent.
  - **Shared parse**: Use TipTap Markdown’s `generateJSON` (or equivalent) for markdown→formatted so paste (rich) and plaintext→preview use the same logic.
  - **ChatView**: Keep owning draft key per conversation (`CHAT_DRAFT_KEY_PREFIX + conversationId`). Add debounced persist on `onChange` (e.g. 300–500 ms) so drafts are written as the user types, in addition to existing persist-on-conversation-switch. No migration for existing drafts.
- **Submit behavior**: Change from “Enter to submit” to **Ctrl/Cmd+Enter only**. Enter = new paragraph (plaintext: newline; rich: new block). Shift+Enter = soft break where applicable.
- **UI/UX**
  - **Toggle**: A small control (e.g. icon button or segmented control) near the input to switch “Plain” ↔ “Preview”. Placement: left of the Send button or above the input row; exact placement is a good point for your input.
  - **Focus**: When conversation or mode changes, PromptInput’s `focus()` is called (existing `inputRef` in ChatView); wrapper focuses the active editor.
- **Accessibility**: `aria-label` on the input container (e.g. “Message input”) and on the mode toggle (e.g. “Switch to preview” / “Switch to plain text”); ensure keyboard nav and focus management per `docs/design/accessibility.md`.
- **Recommendations**
  - Use TipTap’s `getMarkdown()` / `setContent(..., { contentType: 'markdown' })` for value round-trip and for plain→preview.
  - Keep the Send button; it can also trigger submit (same guard) for users who prefer click.
- **Where your input helps**
  - Toggle placement (left of Send vs above the input) and icon/label (“Plain” / “Preview” vs “Write” / “Preview”).
  - Debounce interval for draft persistence (suggest 400 ms).

**Implemented:** Toggle is text in top-right corner: "Plaintext" / "Live Preview", click to switch. Draft debounce 400 ms.

---

## Success Criteria

- Pasting markdown or HTML renders formatted in the rich editor (normalized to markdown).
- Content is stored and sent as plaintext markdown.
- Ctrl/Cmd+Enter submits in both plaintext and preview modes; empty/whitespace does not submit.
- Toggle between plaintext and preview in the same container.
- Plaintext editor list continuation and auto-closing pairs.
- Rich editor uses existing app CSS for consistent styling.
- Placeholder shows when empty.
- Focus works when switching conversations or modes.
- Draft persistence (markdown strings, debounced) works; no migration needed.
- Accessibility: ARIA labels, keyboard navigation, focus management per accessibility.md.
- No regressions in chat submit, streaming, or draft persistence.

---

## See Also

- [Cursor-Style Chat UI](./archive/cursor-style-chat-ui.md) — Prerequisite.
- [docs/design/design-tokens.md](../design/design-tokens.md) — Theming.
- [docs/design/accessibility.md](../design/accessibility.md) — Accessibility.
