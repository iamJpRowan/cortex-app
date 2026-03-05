[Docs](../README.md) / [Devlogs](./README.md) / Phase 5 Model Selector, Per-Message Model & Reasoning

---
date: 2025-02-07
developer: jprowan
agent: Cursor (Auto)
model: —
tags: [multi-provider, phase-5, model-selector, reasoning, extended-thinking]
related_backlog: [multi-provider-model-selection]
related_files:
  - src/renderer/src/components/ChatView.tsx
  - src/renderer/src/components/ModelSelector.tsx
  - src/main/services/llm/agent.ts
  - src/main/services/llm/providers/anthropic.ts
related_issues: []
related_devlogs:
  - 2025-02-07-multi-provider-phase-3-model-discovery
  - 2025-02-07-multi-provider-settings-test-refresh-ux
session_duration: multiple sessions
iterations: 5a–5e delivery chunks; reasoning streaming; model persistence and UX tweaks
outcome: Phase 5 complete: selector, per-conversation/per-message model, reasoning in trace, model label during stream and in list
---

# Context

Phase 5 of Multi-Provider Model Selection combines the model selector with per-conversation and per-message model persistence, and adds reasoning/thinking in the execution trace (Anthropic extended thinking). Delivered in testable chunks 5a–5e.

# Problem

- Users needed a way to choose the model per conversation and see which model produced each reply.
- Execution trace showed only tool calls/results; when the model supplied extended thinking (e.g. Anthropic), it was not visible.
- Model name under assistant messages and in the conversation list only appeared after stream complete or after re-fetching; switching chats could lose the displayed model.

# Solution

**Backend (5a, 5d)**  
- Stream complete event includes `model`; IPC updates conversation `currentModel` and appends to `messageModels` (SQLite `message_models` JSON).  
- `getMessages` loads conversation first and passes `messageModels` into `getConversationMessages(id, messageModels)`; agent merges model onto each assistant message by index.  
- New trace type `reasoning` in shared types; agent parses Anthropic content blocks (`thinking` / `thinking_delta`), merges by index, and emits reasoning trace events during the messages stream (flush when text block seen) and from values if not already emitted. Reasoning is not persisted.  
- Anthropic adapter: extended thinking enabled (adaptive for Opus 4.6, enabled + budget_tokens for others); temperature omitted; `maxTokens: 8192` so `max_tokens > budget_tokens`.

**Frontend (5b, 5c, 5e)**  
- Custom ModelSelector (Select + listModels) below chat input; ConversationList shows current model + provider icon.  
- MessageBubble shows model label (provider icon + label) for assistant messages when `message.model` is set; label from modelList or shortened id.  
- TraceDisplay accepts ordered trace items (reasoning + tool steps); reasoning rendered in collapsible “Thinking” blocks; tools as before.  
- Streaming message and completed message both get model: streaming message uses `selectedModelId`; complete uses `event.model`.  
- On model selector change, conversation is updated and `conversationListRef.current?.updateCurrentModel?.(conversationId, modelId)` is called so the list shows the new model immediately.

# Outcome

- Model selector below input; selection persists and is used for the next message; conversation list shows current model.  
- Per-message model stored and restored when loading history or switching chats.  
- Reasoning (Anthropic extended thinking) appears in the chain-of-thought area during and after stream; not persisted.  
- Model name appears under the bubble as soon as the reply streams and when switching back to a conversation.

# Notes

- Reasoning is emitted from the messages stream when a text block is seen (so thinking appears during the response); values path is skipped if already emitted to avoid duplicates.  
- Backlog testing section updated to describe current Anthropic adapter config (adaptive vs enabled, maxTokens, no temperature).
