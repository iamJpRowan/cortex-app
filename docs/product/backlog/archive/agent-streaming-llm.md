---
status: completed
date_archived: 2026-02-17
summary: Stream LLM response and thinking as it is generated instead of waiting for the full reply.
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](../README.md) / Agent Streaming (LLM)

**Why archived:** Implemented. Streaming and trace UI (single timeline of thinking + tool steps, token usage, step copy, metadata placement) completed. See devlog [2026-02-17-chat-trace-token-usage-and-cleanup](../../devlogs/2026-02-17-chat-trace-token-usage-and-cleanup.md).

# Agent Streaming (LLM)

## Goal

Stream the LLM response (and thinking, when the model provides it) as it is generated instead of waiting for the full reply. Today, no thought process or response text appears until the model call completes, because the agent node uses `invoke` rather than `stream`.

## Problem

The chat agent is built with LangChain’s `createAgent()`. Its built-in agent node calls `model.invoke(...)`, so the LangGraph only gets a message when the entire LLM turn finishes. With `streamMode: ['messages', 'values']`, we therefore receive no `messages` chunks during the call—hence no token-by-token reply and no incremental thinking in the UI.

## Approach

- Replace the single `invoke` in the agent’s model node with a **streaming** call: use `model.stream(...)` (or equivalent), consume the async stream, and:
  - **Forward each chunk** into the graph’s stream so existing `queryStream` / `llm:stream` handling receives `messages` (and thus tokens + thinking blocks) as they arrive.
  - **Accumulate** the full message so the node still returns one complete `AIMessage` (and tool calls) when the stream ends, preserving current tool-loop and state behavior.
- Implementation options: custom LangGraph node that streams and yields chunks, or middleware that wraps the model call with streaming and chunk forwarding. The current `createAgent` AgentNode cannot be configured to stream; it must be replaced or wrapped.

## Applicability

- **Streaming (invoke → stream):** Apply to **all models**; chat providers (Anthropic, OpenAI, Ollama, etc.) support streaming.
- **Thinking/reasoning:** Only models that send thinking blocks (e.g. Claude extended thinking) will show “Thinking” steps; others simply get streaming reply text and unchanged tool behavior.

## Success Criteria

- [x] Reply text streams token-by-token in the chat UI.
- [x] For models that support it (e.g. Claude), thinking/reasoning appears incrementally in the Agent steps section during the call.
- [x] Tool calls, tool results, and conversation state behave as today (no regression).
- [x] No long “blank” wait before any content appears.

## Related

- [Execution Trace Persistence](../execution-trace-persistence.md) — trace display and persistence.
- Existing periodic reasoning emit and “Still working…” in ChatView remain valid; this fix addresses the upstream lack of streamed chunks from the agent.
