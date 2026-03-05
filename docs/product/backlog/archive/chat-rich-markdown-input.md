---
status: completed
date_archived: 2026-02-16
summary: Rich markdown editing in chat composer with paste-to-render, plaintext/preview toggle; content sent as markdown.
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](../README.md) / Chat Rich Markdown Input

**Why archived:** Implemented. Toggle Plaintext/Live Preview, TipTap rich editor, markdown-aware plaintext, draft persistence, Ctrl/Cmd+Enter submit. See devlog [2026-02-16-chat-rich-markdown-input](../../devlogs/2026-02-16-chat-rich-markdown-input.md).

# Chat Rich Markdown Input

## Goal

Provide a rich markdown editing experience in the chat composer with paste-to-render, plaintext/preview toggle, and markdown-aware plaintext editor. Content is stored and sent to the LLM as plaintext markdown.

## Prerequisites

- **[Cursor-Style Chat UI](./cursor-style-chat-ui.md)** — Complete. Multi-line composer and layout in place.

## Requirements (summary)

- Single container; toggle plain ↔ preview. Submit: Ctrl/Cmd+Enter only. Storage and LLM output as plaintext markdown. Draft persistence (debounced). Plaintext: list continuation, auto-closing pairs. Rich editor: TipTap, paste handling (markdown/HTML → formatted). Shared parse logic. Component API: value, onChange, onSubmit, disabled, placeholder, ref, focus(). Accessibility per design docs.

## Success Criteria

- [x] Pasting markdown or HTML renders formatted in the rich editor (normalized to markdown).
- [x] Content is stored and sent as plaintext markdown.
- [x] Ctrl/Cmd+Enter submits in both modes; empty/whitespace does not submit.
- [x] Toggle between plaintext and preview in the same container.
- [x] Plaintext editor list continuation and auto-closing pairs.
- [x] Draft persistence (markdown strings, debounced); focus on switch; no regressions.
