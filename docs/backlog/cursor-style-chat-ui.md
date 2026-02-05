[Docs](../README.md) / [Backlog](./README.md) / Cursor-Style Chat UI

# Cursor-Style Chat UI

## Goal

Redesign the chat interface to be more like Cursor’s: **full-width turns** (user and assistant), **multi-line input** that supports long-form and markdown-style text, and optional **sticky “most recent user prompt”** at the top of the conversation. Layout should support long-form messages and feel like a document-style thread rather than a messaging app.

## Prerequisites

- **[Chat Interface (MVP)](./archive/chat-interface-mvp.md)** - Must be complete. Provides working chat, streaming, conversation list, and trace display.

## Key Capabilities

### Full-Width Turns

- **User and assistant turns** each occupy the full width of the chat column (no narrow bubbles or max-width).
- Long-form messages are the expected case; layout and typography should read well for multi-paragraph content.
- Role is still clear (e.g. via background, label, or position) without bubble-style constraints.
- Existing **trace display** (Chain of Thought, Tool Invocation) remains; placement (above or within assistant message) should fit the full-width layout.

### Multi-Line Input

- **Multi-line composer** instead of a single-line input: user can write or paste long text, including markdown formatting.
- Input should support or accommodate long content (e.g. auto-resize or scroll with a reasonable max height).
- Submit via button and/or Enter; newline (e.g. Shift+Enter) behavior is explicit and discoverable.
- Use **AI Elements Prompt Input** ([docs/development/ai-elements.md](../development/ai-elements.md)) where it simplifies: install `prompt-input` with `--path src/renderer/src/components/ai-elements` and use `PromptInputTextarea` (and related parts) for the composer. Rich markdown editing (e.g. TipTap) is a follow-on; see [Chat Rich Markdown Input](./chat-rich-markdown-input.md).

### Sticky Most Recent User Prompt (Deferred Detail)

- **Eventually:** Allow the “most recent user prompt” to stick to the top of the conversation area while scrolling (or an equivalent pattern so context is visible). Details (exact behavior, when to show/hide) to be decided during implementation; implement this **last** after full-width layout and multi-line input are in place.

### Reuse of AI Elements

- Prefer **Conversation** (scroll container, scroll-to-bottom, scroll button, empty state) for the message list.
- Prefer **Message** / **MessageContent** / **MessageResponse** for rendering turns (full-width assistant, consistent markdown/code). Replace or simplify current `MessageBubble` and duplicate markdown styling.
- Keep existing **Chain of Thought** and **Tool Invocation** for trace; integrate with the new message layout.

## Implementation Approach

### Phase 1: Layout and Message Display

1. Install AI Elements **conversation** and **message** via shadcn CLI with `--path src/renderer/src/components/ai-elements` (see ai-elements.md). Fix any import paths (e.g. `@/components/ui/...`) after install.
2. Replace the current scrollable message area with **Conversation** + **ConversationContent**; use **ConversationScrollButton** and **ConversationEmptyState** for scroll behavior and empty state.
3. Render each turn with **Message** / **MessageContent** / **MessageResponse** (full-width for both roles). Style user turns (e.g. background) so role is clear; keep assistant full-width with transparent/default background.
4. Keep **TraceDisplay** (Chain of Thought + Tool Invocation) for assistant messages; place it above or inside the assistant message block so it fits the full-width layout.
5. Remove or refactor **MessageBubble** and the duplicate **MarkdownContent** usage for assistant; rely on **MessageResponse** for markdown. Retain copy/timestamp behavior via **MessageActions** / **MessageAction** if desired.

### Phase 2: Multi-Line Input

1. Install AI Elements **prompt-input** with `--path` as above. Resolve dependencies and import paths.
2. Replace the current form + single-line **Input** with **PromptInput** + **PromptInputTextarea** + **PromptInputSubmit** (and footer/tools as needed). Wire existing submit handler and stream/loading state.
3. Ensure Enter vs Shift+Enter behavior is clear (e.g. Enter submit, Shift+Enter new line) and document in UI or tooltip if helpful.

### Phase 3: Sticky Most Recent User Prompt (Last)

1. Decide exact behavior: e.g. sticky block showing last sent user message vs composer-at-top. Implement the chosen pattern inside the **Conversation** scroll container.
2. Ensure accessibility and keyboard behavior; avoid overlapping critical controls.

## Success Criteria

- User and assistant turns are full-width and readable for long-form content.
- Composer is multi-line, supports long text, and uses AI Elements Prompt Input (or equivalent) with clear submit/newline behavior.
- Conversation uses AI Elements Conversation and Message where applicable; trace display remains and fits the new layout.
- Optional: sticky “most recent user prompt” with behavior documented and implemented last.

## See Also

- [Chat Rich Markdown Input](./chat-rich-markdown-input.md) - TipTap/rich markdown editor for chat input (follow-on).
- [docs/development/ai-elements.md](../development/ai-elements.md) - Installing AI Elements (conversation, message, prompt-input).
