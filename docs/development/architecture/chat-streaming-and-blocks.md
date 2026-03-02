# Chat streaming and blocks: data flow

This doc describes how the chat UI gets its content: from the LangGraph stream and from the checkpoint on reload. The goal is one display shape ("message, tool, message, tool") whether the user is watching a live stream or loading history.

## Overview

- **Streaming:** Main process consumes LangGraph `messages` + `values` streams, accumulates text segments and trace entries, and emits events (token, trace, complete) with a consistent block order.
- **Reload:** Main process reads the checkpoint, walks messages, builds turn blocks, and normalizes their order so it matches streaming.
- **Frontend:** Renders from `TurnBlock[]` using a single builder that groups reasoning and pairs tool_call with tool_result.

## Stream path (main process)

1. **LangGraph stream** — We call `executor.stream(..., { streamMode: ['messages', 'values'] })`.
   - **messages:** Chunks from the LLM (AIMessageChunk). Each chunk has `content` (string or block array with `text` / `thinking`). We append text to `currentSegment` and emit token events. We do not add tool message content to the response (tool results are shown in trace only).
   - **values:** Full state after each step. We detect new messages: AI (reasoning, text, tool_calls) and Tool (tool_result). For each new tool_call we call `emitTraceEntry(tool_call)`. For each new tool_result we call `emitTraceEntry(tool_result)`; the segment flushed immediately before a tool_result is discarded so it never appears as response text.

2. **Segments and blocks** — We keep:
   - `currentSegment`: text accumulated since the last trace entry.
   - `blocks`: list of `TurnBlock` (text | trace). When we emit a trace entry we flush `currentSegment` to blocks (except for tool_result, where we discard it), then append the trace block.

3. **Events to renderer:**
   - `token`: token, accumulated, currentSegment (for live typing).
   - `trace`: trace entry + optional `completedSegment` (text that just ended before this trace). Frontend appends completedSegment as a text block then the trace block to its streaming blocks ref.
   - `complete`: response, trace, blocks. Frontend replaces the streaming state with the final message built from blocks.

So the **block order** during streaming is: text (optional), reasoning, text (optional), tool_call, tool_result, text (optional), ….

## Reload path (main process)

1. **Checkpoint** — `getConversationMessages(conversationId)` loads the checkpoint and reads `channel_values.messages` (Human, AI, Tool, AI, Tool, …).

2. **Turn blocks** — We iterate messages. For each AI message we append: reasoning blocks (from thinking in content), text block, tool_call blocks. For each Tool message we append a tool_result block. So the **raw** order is: reasoning, reasoning, text, tool_call, tool_call, tool_result, tool_result (all from one turn).

3. **Normalize** — We call `interleaveToolCallsWithResults(turnBlocks)` (from `@shared/lib/chat-blocks`). It reorders so each tool_call is immediately followed by its matching tool_result (by toolCallId / toolName). Resulting order matches the stream: … text, tool_call, tool_result, text, ….

4. **Chat messages** — We push one assistant message per turn with `blocks: [...normalizedBlocks]` and `content` = joined text segments (for copy/fallback).

## Frontend (renderer)

1. **Single block builder** — `buildDisplayItems(blocks)` in `@/lib/chat-blocks` turns `TurnBlock[]` into display items:
   - Consecutive reasoning blocks → one "Thinking" row (one trace group).
   - tool_call followed by matching tool_result → one tool row (one trace group); any text between is emitted after the tool row so order is "message, tool, message."
   - Orphan tool_result or other trace → one row.

2. **Streaming** — On token events we update accumulated/currentSegment for live text. On trace events we append to `streamingBlocksRef` (completedSegment as text block, then trace block) and set state so `BlockBasedTurn` receives the same block list. On complete we replace with the final message (with blocks from the event).

3. **Display** — `BlockBasedTurn` calls `buildDisplayItems(blocks)` and renders each display item: text → `MessageContent`, traceGroup → `TraceDisplayForGroup` (which uses `buildOrderedTraceItems(entries)` for the step list).

## Key files

| Role | File |
|------|------|
| Stream consumption, block accumulation, emitTraceEntry | `src/main/services/llm/agent.ts` |
| Normalize reload blocks (tool_call + tool_result order) | `src/shared/lib/chat-blocks.ts` (`interleaveToolCallsWithResults`) |
| Block → display items (group reasoning, pair tools) | `src/renderer/src/lib/chat-blocks.ts` (`buildDisplayItems`, `buildOrderedTraceItems`) |
| Chat UI, stream event handling, BlockBasedTurn | `src/renderer/src/components/ChatView.tsx` |

## Contract

- **Backend** produces `TurnBlock[]` in a single canonical order: text and trace interleaved, with each tool_result immediately after its tool_call.
- **Frontend** consumes that list in exactly one place (`buildDisplayItems`) to produce the visible "message, tool, message, tool" layout. No block-order logic lives outside the shared/renderer chat-blocks modules.
