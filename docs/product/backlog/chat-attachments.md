---
status: considering
themes: [chat-ai]
summary: File and image attachments in chat prompt (drag-drop, paste); backend sends attachments with the message.
---

# Chat Attachments

## Goal

Add **file and image attachment support** to the chat prompt input so users can attach files (e.g. documents, images) and paste images directly in the composer. Attachments are sent with the user message and available to the agent in that turn.

## Prerequisites

- **Chat Interface (MVP)** – Working chat and conversation model.
- **Prompt input** – Current chat uses a basic multi-line prompt input (Enter to send, Shift+Enter for newline). This item adds attachment UI and backend support on top of that.

## Key Capabilities

### Composer Attachment UX

- **File attachments**: User can attach one or more files via a button or drag-and-drop onto the prompt input area. Supported types TBD (e.g. images, text, PDFs).
- **Paste images**: Pasting an image from the clipboard (e.g. screenshot) adds it as an attachment and optionally shows a preview in the composer.
- **Previews**: Show attached files (e.g. thumbnails for images, names for documents) in or above the input with option to remove before send.
- **Submit**: On submit, the message text and attachments are sent together; the agent receives both (format TBD: e.g. inline base64, file refs, or multipart).

### Backend and API

- **API**: Extend the streaming query API to accept attachments (e.g. `queryStream(message, { conversationId, model, attachments })`). Attachments may be passed as base64 data URLs, buffer refs, or file paths depending on Electron/main process constraints.
- **Agent context**: The LLM agent (or provider adapter) receives the user message plus attachment contents/metadata so that multimodal or file-aware models can use them. For text-only models, attachments might be summarized or omitted per provider.
- **Conversation storage**: Decide whether attachment payloads are stored with the message in the conversation or only referenced (e.g. by path or hash). Affects persistence and replay of history.

## Approach

1. **UI**: Add attachment affordances to the prompt input (e.g. attach button, drop zone, paste handling). Use or align with a component that supports this (e.g. shadcn AI prompt input with attachments, or custom composition). Keep text-only flow unchanged when there are no attachments.
2. **Data model**: Define an attachment type (e.g. `{ type: 'image' | 'file', name: string, content: string | ArrayBuffer | path }`) and pass an array with the message.
3. **IPC and main**: Extend `llm.queryStream` (or equivalent) to accept attachments; ensure large payloads are handled (e.g. stream or chunk) and that main/renderer boundaries don’t break.
4. **Agent**: Update the agent (or provider-specific code) to include attachment content in the user message or tool context. Multimodal providers (e.g. vision APIs) can receive images; others may get text extraction or a placeholder.

## Success Criteria

- [ ] User can attach files (and optionally paste images) in the chat prompt input and see previews before sending.
- [ ] Submitting a message with attachments sends both text and attachments to the backend; the agent receives them for the current turn.
- [ ] Text-only messages continue to work as today; no regression for users who don’t use attachments.
- [ ] Attachment handling is documented (supported types, size limits, provider behavior).

## Related Backlog Items

- **[Chat Attachments and Context](./chat-attachments-and-context.md)** – Broader “attach to conversation” (summaries, graph nodes, files) and context visibility. This item focuses on **composer-level** file/image attachments in the prompt input; that item’s “uploads” and “local files” may align or integrate later.
- **[Cursor-Style Chat UI](./archive/cursor-style-chat-ui.md)** – Full-width layout and multi-line input; the current prompt input satisfies basic multi-line behavior; this item adds attachments to that input.
