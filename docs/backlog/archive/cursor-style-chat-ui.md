---
status: completed
completed_date: 2025-02-11
---

[Docs](../../README.md) / [Backlog](../README.md) / Archive / Cursor-Style Chat UI

# Cursor-Style Chat UI

## Goal

Redesign the chat interface to be more like Cursor's: **full-width turns** (user and assistant), **multi-line input** that supports long-form and markdown-style text, and optional **sticky "most recent user prompt"** at the top of the conversation. Layout should support long-form messages and feel like a document-style thread rather than a messaging app.

## Implementation decisions (agreed)

- **Turn delineation:** A simple horizontal line (border or outline) at the top of each turn, with the **avatar centered on the line**. Agent (assistant) on the **left**, user on the **right**. Use a **lighter background** for the turn block to distinguish from the page.
- **Chat width:** **Cap the chat container** (e.g. `max-w-4xl`) for readability on large screens; center or align as appropriate.
- **AI Elements:** Use **Conversation** and **Message** (and **MessageContent** / **MessageResponse**) from AI Elements now. Retain **copy**, **timestamp**, and **model** via **MessageActions** / **MessageAction** for copy and a small footer row for timestamp/model.
- **Sticky most recent user prompt:** Deferred; can be added later. No need to keep in backlog for this item.

## Prerequisites

- **[Chat Interface (MVP)](./chat-interface-mvp.md)** - Must be complete. Provides working chat, streaming, conversation list, and trace display.

## Key Capabilities

### Full-Width Turns

- **User and assistant turns** each occupy the full width of the chat column (no narrow bubbles or max-width).
- Long-form messages are the expected case; layout and typography should read well for multi-paragraph content.
- Role is clear via: **top border line with avatar centered on it** (agent left, user right) and **lighter background** per turn.
- Existing **trace display** (Chain of Thought, Tool Invocation) remains; placement (above or within assistant message) should fit the full-width layout.

### Multi-Line Input

- **Multi-line composer** instead of a single-line input: user can write or paste long text, including markdown formatting.
- Input should support or accommodate long content (e.g. auto-resize or scroll with a reasonable max height).
- Submit via button and/or Enter; newline (e.g. Shift+Enter) behavior is explicit and discoverable.

**Current state:** The chat composer uses a **PromptInput** component (`src/renderer/src/components/ui/prompt-input.tsx`) that provides a multi-line, auto-resizing textarea with Enter to send and Shift+Enter for newline. This was implemented in-app (shadcn AI registry prompt-input requires authentication). File/image attachments are not yet supported; see [Chat Attachments](../chat-attachments.md). Optional follow-on: adopt **AI Elements Prompt Input** from the registry if available ([docs/development/ai-elements.md](../../development/ai-elements.md)), or add attachment UI per the attachments backlog item. Rich markdown editing (e.g. TipTap) is a separate follow-on; see [Chat Rich Markdown Input](../chat-rich-markdown-input.md).

### Sticky Most Recent User Prompt (Deferred Detail)

- **Eventually:** Allow the "most recent user prompt" to stick to the top of the conversation area while scrolling (or an equivalent pattern so context is visible). Details (exact behavior, when to show/hide) to be decided during implementation; implement this **last** after full-width layout and multi-line input are in place.

### Reuse of AI Elements

- Prefer **Conversation** (scroll container, scroll-to-bottom, scroll button, empty state) for the message list.
- Prefer **Message** / **MessageContent** / **MessageResponse** for rendering turns (full-width assistant, consistent markdown/code). Replace or simplify current `MessageBubble` and duplicate markdown styling.
- Keep existing **Chain of Thought** and **Tool Invocation** for trace; integrate with the new message layout.

## Phase 1: Layout and Message Display

1. Install AI Elements **conversation** and **message** via shadcn CLI with `--path src/renderer/src/components/ai-elements` (see ai-elements.md). Fix any import paths (e.g. `@/components/ui/...`) after install.
2. **Cap the chat container** (e.g. `max-w-4xl`); center the chat column in the main area for readability.
3. Replace the current scrollable message area with **Conversation** + **ConversationContent**; use **ConversationScrollButton** and **ConversationEmptyState** for scroll behavior and empty state.
4. Render each turn with **Message** / **MessageContent** / **MessageResponse** (full-width for both roles). Per agreed decisions: **top border line with avatar centered on the line** (agent left, user right), **lighter background** for the turn block.
5. Keep **TraceDisplay** (Chain of Thought + Tool Invocation) for assistant messages; place it above or inside the assistant message block so it fits the full-width layout.
6. Remove or refactor **MessageBubble** and the duplicate **MarkdownContent** usage for assistant; rely on **MessageResponse** for markdown. Retain **copy** via **MessageActions** / **MessageAction**, and **timestamp** / **model** in a small footer row per message.

## Phase 2: Multi-Line Input

**Status:** Basic multi-line input is done. The chat form now uses **PromptInput** (see Key Capabilities above), which replaces the previous single-line Input with an auto-resizing textarea, Enter to submit, and Shift+Enter for newline. Optional follow-ups:

1. If AI Elements **prompt-input** becomes available from the registry, consider migrating to it for consistency and any extra features (e.g. attachment hooks); resolve dependencies and import paths.
2. Any further composer UX (e.g. tooltip for Enter/Shift+Enter, attachment UI) can follow [Chat Attachments](../chat-attachments.md) or ai-elements.md.

## Phase 3: Sticky Most Recent User Prompt (Last)

1. Decide exact behavior: e.g. sticky block showing last sent user message vs composer-at-top. Implement the chosen pattern inside the **Conversation** scroll container.
2. Ensure accessibility and keyboard behavior; avoid overlapping critical controls.

## Success Criteria

- User and assistant turns are full-width and readable for long-form content.
- Composer is multi-line, supports long text, and uses a prompt input (currently the in-app **PromptInput** component) with clear submit/newline behavior (Enter to send, Shift+Enter for newline).
- Conversation uses AI Elements Conversation and Message where applicable; trace display remains and fits the new layout.
- Optional: sticky "most recent user prompt" with behavior documented and implemented last.

## Status

- **Phase 1 (Layout and Message Display):** Implemented. Full-width turns with top border + avatar on line (agent left, user right), lighter background, container cap (`max-w-4xl`), Conversation + Message + MessageResponse, copy/timestamp/model retained.
- **Phase 2 (Multi-Line Input):** Done (PromptInput in place).
- **Phase 3 (Sticky prompt):** Deferred; can be added later.
- **Archived:** Completed 2025-02-11.

## See Also

- [Chat Attachments](../chat-attachments.md) - File/image attachments in the prompt input (follow-on).
- [Chat Rich Markdown Input](../chat-rich-markdown-input.md) - TipTap/rich markdown editor for chat input (follow-on).
- [docs/development/ai-elements.md](../../development/ai-elements.md) - Installing AI Elements (conversation, message, prompt-input).
