[Docs](../README.md) / [Backlog](./README.md) / Chat Rich Markdown Input

# Chat Rich Markdown Input

## Goal

Provide a **rich markdown editing experience** in the chat composer (and optionally other editors in the app) so users can write and format long-form messages with headings, lists, code, and emphasis without typing raw markdown by hand. The editor should output **markdown** for agent context and for consistency with existing message rendering. This item is separate from the Cursor-style layout and multi-line textarea; it is the upgrade path once that is in place.

## Prerequisites

- **[Cursor-Style Chat UI](./cursor-style-chat-ui.md)** - Must be complete. Delivers multi-line composer and full-width layout; this item replaces or wraps the composer’s textarea with a rich editor.

## Key Capabilities

### Rich Markdown Editor in Chat

- **WYSIWYG or hybrid editing** in the chat input: toolbar or shortcuts for bold, italic, code, lists, headings, links, etc., with markdown as the stored/sent format.
- **TipTap** (or an equivalent ProseMirror-based editor) is the preferred base: good React integration, extensions for markdown shortcuts and serialization, and theming to match the app.
- **Output format:** Markdown (or a single canonical format) so LLM context and existing **MessageResponse** rendering stay aligned. No separate “HTML path” for the agent unless explicitly required later.
- **Paste behavior:** Paste markdown or HTML and normalize to markdown where possible; avoid broken or overly complex content in context.
- **Accessibility:** Keyboard navigation, focus management, and ARIA where needed; consistent with [Accessibility](../design/accessibility.md).

### Reuse Elsewhere

- Implement as a **reusable editor component** (e.g. `MarkdownEditor` or `RichComposer`) so it can be used in:
  - Chat composer (primary).
  - Other future surfaces (e.g. notes, descriptions, custom agent instructions) without duplicating editor logic.
- The component should accept design tokens and theme (light/dark) so it fits existing [Design Tokens](../design/design-tokens.md) and [UI Guide](../design/ui-guide.md).

### Integration with Chat

- **Submit:** On submit, get markdown from the editor and pass it into the existing send-message flow (same as current plain-text path). No changes to agent or conversation model required beyond receiving markdown strings.
- **State:** Editor state clears or resets after send; no requirement to persist draft in the editor across sessions (can be a follow-on).
- **Placement:** Editor replaces the current chat composer textarea (from Cursor-Style Chat UI); layout and sticky/composer placement remain unchanged.

## Phase 1: Editor Component and Markdown Pipeline

1. Add TipTap (and chosen extensions: StarterKit, markdown or similar, code block, list, etc.); ensure markdown serialization/deserialization is consistent and that output is suitable for LLM context.
2. Build a **MarkdownEditor** (or equivalent) component that:
   - Renders with app theme and design tokens.
   - Exposes a controlled or uncontrolled value as markdown.
   - Supports min/max height and resize behavior appropriate for chat (and future use).
3. Style toolbar and editor to match shadcn/ui and existing chat UI (borders, focus, disabled state).
4. Add tests or manual checks for: markdown round-trip, paste from HTML/markdown, and accessibility basics.

## Phase 2: Chat Composer Integration

1. Replace the Prompt Input textarea (or current composer) in the chat view with the new **MarkdownEditor**.
2. Wire submit: get markdown from the editor, call existing send-message handler, clear editor on success.
3. Preserve Enter to submit and Shift+Enter for newline (or chosen convention) if the editor supports it; otherwise document and implement the chosen shortcut.
4. Verify streaming and trace display still work; no change to message rendering (MessageResponse already handles markdown).

## Phase 3: Reuse and Documentation

1. Document the component: props (value, onChange, placeholder, min/max height, disabled), and where it is used (chat now; other surfaces later).
2. If other consumers (e.g. notes, agent instructions) are planned, add a short “Using MarkdownEditor elsewhere” note in the component or in docs.

## Success Criteria

- Chat composer uses a rich markdown editor (TipTap or equivalent) with toolbar/shortcuts and markdown output.
- Submitted content is markdown and is handled by the existing chat and agent pipeline; message rendering is unchanged.
- Editor component is reusable and themed; it can be dropped into other views later.
- Accessibility and paste behavior are acceptable; no regressions in chat submit or streaming.

## See Also

- [Cursor-Style Chat UI](./cursor-style-chat-ui.md) - Full-width layout and multi-line composer (prerequisite).
- [docs/design/design-tokens.md](../design/design-tokens.md) - Theming and tokens.
- [docs/design/accessibility.md](../design/accessibility.md) - Accessibility guidelines.
