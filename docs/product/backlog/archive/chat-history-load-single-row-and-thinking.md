---
status: completed
date_archived: 2026-02-23
summary: One assistant row per turn on load; restore thinking in trace from checkpointer.
---

[Docs](../../../README.md) / [Product](../../README.md) / [Backlog](../README.md) / Archive / Chat History Load: Single Assistant Row and Restore Thinking

# Chat History Load: Single Assistant Row per Turn and Restore Thinking

## Goal

When messages are loaded from the checkpointer after an app refresh (or when switching back to a conversation), the chat should show **one assistant message row per turn** (not multiple rows for "query" vs "result"), and **thinking steps should still appear** in the trace.

## Problem

Two issues occur when conversation messages are loaded from persistence (`getConversationMessages` in the LLM agent service):

1. **Multiple assistant rows per turn**  
   The code creates one `ChatMessage` for every AIMessage that has text content. In a typical agent turn the graph can contain:
   - An AIMessage with tool calls and optional short content (e.g. "Let me look that up.") → becomes one assistant row.
   - ToolMessage(s) → only update pending trace.
   - Another AIMessage with the final answer → becomes a second assistant row.  
   So the same logical "turn" is split into separate message rows (e.g. one for the query and one for the result).

2. **Thinking step disappears**  
   During streaming, reasoning is emitted as trace entries (`type: 'reasoning'`) and shown in the UI. When loading from the checkpoint:
   - Trace is built only from `tool_call` (AIMessage with tool_calls) and `tool_result` (ToolMessage). No `reasoning` entries are created.
   - AI message content is read with `messageContentToString()`; we never use `parseAIContent()` to extract thinking blocks from stored AIMessage content.  
   So after refresh, the trace has no reasoning and the thinking step is gone (even when the checkpoint still has thinking in the raw AI content).

## Approach

### Single assistant row per turn

- When building `ChatMessage[]` from `channelValues.messages`, **treat all AI messages in one "turn" (between two user messages) as a single assistant reply**.
- Options:
  - **Merge:** Accumulate content from every AIMessage that has content in the current turn; push one assistant message when the turn ends (e.g. on next human message or end of list), with merged content and the full `pendingTrace` for that turn.
  - **Last-only:** Only create one assistant message per turn, using the *last* AIMessage that has content in that turn, and attach the full `pendingTrace` (including tool_call/tool_result from earlier in the turn). Merge or discard content from earlier AI messages as desired for display.

### Restore thinking in trace on load

- When processing an AIMessage in `getConversationMessages`, call **`parseAIContent(aiMsg.content)`** (same helper used in the streaming path).
- For each entry in `parsed.thinkingBlocks`, push a trace entry `{ type: 'reasoning', content }` into `pendingTrace` in the correct order (e.g. before the tool_call entries for that message, to match streaming order).
- This assumes the checkpointer stores the raw AI message content (including block-based thinking when the provider uses it). If the checkpoint normalizes content to plain text, thinking may not be available and this will only help where block content is preserved.

## Success Criteria

- [x] After loading a conversation (e.g. after app refresh or switching back), each agent turn shows as **one** assistant message row, not multiple rows for "query" and "result".
- [x] When the stored AIMessage content includes thinking blocks, the **thinking step appears** in the trace for that message after load (same as during streaming).
- [x] Streaming uses the same structure: segments and trace in order; no disappearing text between tool calls; tool/reasoning steps collapsed by default.

## Related

- [Agent Streaming (LLM)](../agent-streaming-llm.md) — streaming and thinking in the UI.
- [Execution Trace Persistence](../execution-trace-persistence.md) — trace persistence and historical viewing.
- `getConversationMessages` in `src/main/services/llm/agent.ts`; `parseAIContent` in the same file.
